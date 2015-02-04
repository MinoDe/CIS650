
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
box.focus();
screen.render();

box.on('click', function() {
	box.style.bg = "yellow";
	screen.render();
});

var d = Discover();

var node_addresses = [], current_node_calculating = false;

d.broadcast.on("hello", function (obj) {

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

