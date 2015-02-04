
var blessed = require('blessed');
var ip = require('ip');
var Discover = require('node-discover');

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
		bg: 'green',
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
box.setContent("Request resource");
box.focus();
screen.render();

var d = Discover();
var node_addresses = [], timestamp = 0, pending_reply = false;
var advertisement = {ip: ip.address(), ts: timestamp, request: false};


box.on('click', function() {
	box.style.bg = "yellow";
	screen.render();
	advertisement.request = true;
	d.advertise(advertisement);
	pending_reply = node_addresses;
});

d.broadcast.on("hello", function (obj) {
	if(obj.advertisement) {
		if(obj.advertisement.ts > timestamp  || (obj.advertisement.ts == timestamp && obj.advertisement.ip > ip.address())) {
			timestamp = obj.advertisement.ts;
			advertisement.reply = obj.advertisement.ip;
			d.advertise(advertisement);
		}
		else if(advertisement.request == true) {
			if(obj.advertisement.reply == ip.address()) {
				
			}
		}
	}

});

d.on("added", function (obj) {
	//console.log("A new node has been added: " + obj.address);
	if(obj.address != ip.address())
		node_addresses.push(obj.address);
});

d.on("removed", function (obj) {
	//console.log("A node has been removed.");
	for(var i=0;i<node_addresses.length;i++) {
		if(obj.address == node_addresses[i]) {
			node_addresses.splice(i, 1);
			break;
		}
	}
});

