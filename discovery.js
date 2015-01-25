var blessed = require('blessed');
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

	console.log(d.me.weight);

	var node_ids = [];

	d.on("promotion", function () {
		box.style.bg = "green";
		screen.render();
	});

	d.on("demotion", function () {
		box.style.bg = "magenta";
		screen.render();
	});

	d.on("added", function (obj) {
		console.log("A new node has been added: " + obj.address);
		node_ids.push(obj.id);
		box.setContent("Total nodes: " + node_ids.length);
		screen.render();
	});

	d.on("removed", function (obj) {
		console.log("A node has been removed.");
		for(var i=0;i<node_ids.length;i++) {
			if(obj.id == node_ids[i]) {
				node_ids.splice(i, 1);
				break;
			}
		}
		box.setContent("Total nodes: " + node_ids.length);
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

