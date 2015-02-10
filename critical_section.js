
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
var node_addresses = [], timestamp = 0, pending_reply = false, requesting = false, in_critical_section = false;
var advertisement = {ip: ip.address(), ts: timestamp, request: false, votes: []};


box.on('click', function() {
	if(!requesting && !in_critical_section) {
		requesting = true;
		box.style.bg = "yellow";
		box.setContent("Requesting resource: Timestamp is " + timestamp);
		screen.render();
		timestamp++;
		advertisement.ts = timestamp;
		advertisement.request = true;
		d.advertise(advertisement);
		pending_reply = node_addresses.slice();
		if(node_addresses.length == 0) {
			setTimeout(function() {startCriticalSection();}, 500);
		}
	}
	if(in_critical_section) {
		setTimeout(function() {
			in_critical_section = false;
			box.style.bg = "green";
			box.setContent("Request resource");
			screen.render();
		}, 1000);
	}
});

d.broadcast.on("hello", function (obj) {
	if(obj.advertisement) {
		if(obj.advertisement.ts > timestamp)
			timestamp = obj.advertisement.ts;
		if(!in_critical_section) {
			if(obj.advertisement.request == true && (!requesting || (obj.advertisement.ts < advertisement.ts  || (obj.advertisement.ts == advertisement.ts && obj.advertisement.ip > ip.address())))) {
				// Vote for other node to proceed with critical section
				voteFor(obj.advertisement);
			}
			else if(advertisement.request == true) {
				// Search for this node's advertisement in the other node's votes
				for(var i=0;i<obj.advertisement.votes.length;i++) {
					if(obj.advertisement.votes[i].ip == ip.address() && obj.advertisement.votes[i].ts == advertisement.ts) {
						checkPendingReplies(obj.advertisement.ip)
					}
				}
			}
		}
	}
});

function voteFor(advertisement_object) {
	for(var i=0;i<advertisement.votes.length;i++) {
		if(advertisement.votes[i].ip == advertisement_object.ip) {
			advertisement.votes.splice(i, 1);
			break;
		}
	}
	advertisement.votes.push({ip: advertisement_object.ip, ts: advertisement_object.ts});
	d.advertise(advertisement);
}

function checkPendingReplies(ip_address) {
	// Remove node from pending reply array
	ip_index = pending_reply.indexOf(ip_address);
	if(ip_index != -1) {
		pending_reply.splice(ip_index, 1);
		if(pending_reply.length == 0) {
			// All votes have been cast! Start critical section.
			startCriticalSection();
		}
	}
}

function startCriticalSection() {
	in_critical_section = true;
	requesting = false;
	advertisement.request = false;
	d.advertise(advertisement);
	box.style.bg = "red";
	box.setContent("Release resource");
	screen.render();
}

d.on("added", function (obj) {
	//console.log("A new node has been added: " + obj.address);
	if(obj.address != ip.address()) {
		node_addresses.push(obj.address);
	}
});

d.on("removed", function (obj) {
	//console.log("A node has been removed.");
	for(var i=0;i<node_addresses.length;i++) {
		if(obj.address == node_addresses[i]) {
			node_addresses.splice(i, 1);
			break;
		}
	}
	if(requesting) {
		checkPendingReplies(obj.address);
	}
});

