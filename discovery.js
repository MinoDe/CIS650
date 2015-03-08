
var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var bodyParser = require('body-parser');
var querystring = require('querystring');
var ip = require('ip');
var Discover = require('node-discover');
http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});
app.use(bodyParser.urlencoded());
var my_delay = 0;

if(process.argv.length > 2) {
	my_delay = parseInt(process.argv[2]);
	if(isNaN(my_delay))
		my_delay = 0;
}

//Listening to data on /data
app.post('/data', function(req, res) {
	var post_data = req.body;
//	if(post_data.leader != my_group[my_index]) {
		box.setContent("data received " + post_data.data);
		box.style.bg = "blue";
		screen.render();
		setTimeout(function(){console.log("Received data");}, 5000);
		//postToNext('/election-result', post_data);
//	}
});
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
screen.append(box);
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});
box.focus();
var blessed_lines = {node_count: "Other nodes: 0", master: "", status: "Calculating with delay of " + my_delay + "ms", count: ""};

function setContent() {
	var new_content = "";
	for(line in blessed_lines) {
		new_content += blessed_lines[line] + "\n";
	}
	box.setContent(new_content);
	screen.render();
}
setContent();



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

                 if(deltaTime > data.k)
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


countPrimes({c:0,n:0,k:Math.max(0, 5000 - my_delay)}, function(result) {
	var my_count = result.c;

	var d = Discover({weight: -1*my_count});
	//d.advertise({ something : "something" });
	d.sendTo('192.168.1.105',{data: "this is amazing when it displays"});
	d.sendTo('192.168.1.108',{data: "this is amazing when it displays"});

	var node_addresses = [], current_node_calculating = false;
	var current_count = {n: 0, c: 0};

	blessed_lines["status"] = "Waiting..";
	setContent();

	d.broadcast.on("hello", function (obj) {
		if(obj.isMaster && obj.advertisement && obj.advertisement.node_address == ip.address() && obj.advertisement.n >= current_count.n) {
			blessed_lines["status"] = "Calculating..";
			box.style.bg = "green";
			
			setContent();
			// Slave node getting message from master
			countPrimes({c: obj.advertisement.c, n: obj.advertisement.n, k: 1000}, function(response) {
				current_count.n = response.n;
				current_count.c = response.c;
				d.advertise(response);

				box.style.bg = "magenta";
				blessed_lines["status"] = "Waiting..";
				blessed_lines["count"] = "Primes: " + current_count.c + "/" + current_count.n;
				setContent();
			});
		}
		else if(d.me.isMaster) {
			if(current_node_calculating == false) {
				setNodeCalculating(obj.address);
			}
			else if(current_node_calculating == obj.address && obj.advertisement && obj.advertisement.n >= current_count.n) {
				current_count.n = obj.advertisement.n;
				current_count.c = obj.advertisement.c;
				blessed_lines["count"] = "Primes: " + current_count.c + "/" + current_count.n;
				setContent();

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
		d.sendTo('192.168.1.105',{data: "this is amazing when it displays", c: current_count.c, n: current_count.n, node_address: node_address});
		d.sendTo('192.168.1.108',{data: "this is amazing when it displays", c: current_count.c, n: current_count.n, node_address: node_address});
		//d.advertise({c: current_count.c, n: current_count.n, node_address: node_address});
		current_node_calculating = node_address;
	}
	box.on('click', function(data) {
  	d.sendTo('192.168.1.105',{data: "this is amazing when it displays", c: current_count.c, n: current_count.n, node_address: node_address});
		d.sendTo('192.168.1.108',{data: "this is amazing when it displays", c: current_count.c, n: current_count.n, node_address: node_address});
		
  	box.setContent('{center}Data Has been sent {red-fg}content{/red-fg}.{/center}');
  	screen.render();
	});

	d.on("promotion", function () {
		box.style.bg = "red";
		screen.render();

		if(node_addresses.length)
			setNodeCalculating(node_addresses[0]);

		blessed_lines["master"] = "I'm the master!";
		setContent();
		d.sendTo('192.168.1.108',{data: "this is amazing when it displays"});
	});
	d.on("demotion", function () {
		box.style.bg = "magenta";
		screen.render();
	});

	d.on("added", function (obj) {
		//console.log("A new node has been added: " + obj.address);
		if(obj.address != ip.address())
			node_addresses.push(obj.address);
		blessed_lines["node_count"] = "Other nodes: " + node_addresses.length;
		setContent();
		d.sendTo('192.168.1.105',{data: "this is amazing when it displays"});
		d.sendTo('192.168.1.108',{data: "this is amazing when it displays"});
	});

	d.on("removed", function (obj) {
		if(d.me.isMaster && current_node_calculating == obj.address) {
			current_node_calculating = false;
		}
		//console.log("A node has been removed.");
		for(var i=0;i<node_addresses.length;i++) {
			if(obj.address == node_addresses[i]) {
				node_addresses.splice(i, 1);
				break;
			}
		}
		blessed_lines["node_count"] = "Other nodes: " + node_addresses.length;
		setContent();
	});

	d.on("master", function (obj) {
		/*
		 * A new master process has been selected
		 * 
		 * Things we might want to do:
		 *  - Review what the new master is advertising use its services
		 *  - Kill all connections to the old master
		 */

		blessed_lines["master"] = "Master: " + obj.address;
		setContent();
		d.sendTo('192.168.1.108',{data: "this is amazing when it displays"});
	});

});


