
var blessed = require('blessed');
var ip = require('ip');
var Discover = require('node-discover');

var my_delay = 0;
if(process.argv.length > 2) {
	my_delay = parseInt(process.argv[2]);
	if(isNaN(my_delay))
		my_delay = 0;
}

// Create blessed box and add to PI screen
var screen = blessed.screen();
var box = blessed.box({
	top: 'center',
	left: 'center',
	width: '50%',
	height: '50%',
	content: '',
	tags: true,
	border: {
		type: 'line'
	},
	style: {
		fg: 'white',
		bg: 'magenta',
		border: {
			fg: '#f0f0f0'
		},
		hover: {
			bg: 'black'
		}
	}
});
box.setContent("Counting primes with a delay of " + my_delay + "ms");
screen.append(box);
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});
box.focus();
screen.render();

// Function for counting # of primes in k seconds
function countPrimes(data, callback) {
	var kwork = parseInt(data.k);
	var num = data.n;
	var count = data.c;

	if(isNaN(kwork)) {
		return false;
	}

	setTimeout(function() {
	// Get Primes
         var prevTime = (new Date()).getTime();
         var status = 1;

         while(1)
     {
         var curTime = (new Date()).getTime();
                 var deltaTime = curTime - prevTime;

                 if(deltaTime > Math.max(0, data.k - my_delay))
                        break;
         var j = 2;
         for (  j = 2 ; j <= Math.sqrt(num) ; j++ )
         {
            if ( num%j == 0 )
            {
               status = 0;
               break;
            }
         }
         if ( status != 0 )
         {
            count++;
         }
         status = 1;
         num++;

      }

		callback({c:count,n:num,k:kwork});

	}, 0);
}


countPrimes({c:0,n:0,k:5000}, function(result) {
	var my_count = result.c;

	var d = Discover({weight: -1*my_count});
	//d.advertise({ something : "something" });

	var node_addresses = [], current_node_calculating = false;
	var current_count = {n: 0, c: 0};

	d.broadcast.on("hello", function (obj) {
		console.log(obj.advertisement);
		if(obj.isMaster && obj.advertisement && obj.advertisement.node_address == ip.address() && obj.advertisement.n >= current_count.n) {
			// Slave node getting message from master
			countPrimes({c: obj.advertisement.c, n: obj.advertisement.n, k: 1000}, function(response) {
				current_count.n = response.n;
				current_count.c = response.c;
				d.advertise(response);
			});
		}
		else if(d.me.isMaster) {
			if(current_node_calculating == false) {
				setNodeCalculating(obj.address);
			}
			else if(current_node_calculating == obj.address && obj.advertisement && obj.advertisement.n >= current_count.n) {
				current_count.n = obj.advertisement.n;
				current_count.c = obj.advertisement.c;
				if(node_addresses.length > 1) {
					setNodeCalculating(node_addresses[(node_addresses.indexOf(obj.address) + 1) % node_addresses.length]);
				}
				else {
					current_node_calculating = false;
				}
			}
		}
	});

	function setNodeCalculating(node_address) {
		d.advertise({c: current_count.c, n: current_count.n, node_address: node_address});
		current_node_calculating = node_address;
	}

	d.on("promotion", function () {
		box.style.bg = "green";
		screen.render();

		if(node_addresses.length)
			setNodeCalculating(node_addresses[0]);
	});

	d.on("demotion", function () {
		box.style.bg = "magenta";
		screen.render();
	});

	d.on("added", function (obj) {
		console.log("A new node has been added: " + obj.address);
		if(obj.address != ip.address())
			node_addresses.push(obj.address);
		box.setContent("Total nodes: " + node_addresses.length);
		screen.render();
	});

	d.on("removed", function (obj) {
		if(d.me.isMaster && current_node_calculating == obj.address) {
			current_node_calculating = false;
		}
		console.log("A node has been removed.");
		for(var i=0;i<node_addresses.length;i++) {
			if(obj.address == node_addresses[i]) {
				node_addresses.splice(i, 1);
				break;
			}
		}
		box.setContent("Total nodes: " + node_addresses.length);
		screen.render();
	});

	d.on("master", function (obj) {
		/*
		 * A new master process has been selected
		 * 
		 * Things we might want to do:
		 *  - Review what the new master is advertising use its services
		 *  - Kill all connections to the old master
		 */

		console.log("A new master is in control: " + obj.address);

	});

});



