
var http = require('http');
var querystring = require('querystring');
var crypto = require('crypto');
var getmac = require('getmac');
var ip = require('ip');

var blessed = require('blessed');

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
		bg: 'black',
		border: {
			fg: '#f0f0f0'
		}
	}
});
screen.append(box);
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});
box.focus();
screen.render();

var d = Discover();
var node_addresses = [], timestamp = 0, pending_reply = false, requesting = false, in_critical_section = false;
var advertisement = {ip: ip.address(), ts: timestamp, request: false, votes: []};
var ca_ip = "192.168.0.105", cs_ip = "192.168.0.108";

var mac_address = false, token = false;
getmac.getMac(function(err,macAddress){
	if(err)
		throw err;
	mac_address = macAddress;
	box.setContent("Request resource");
	box.style.bg = "green";
	screen.render();
});

function postTo(url, data, host, callback) {
	var post_data = querystring.stringify(data);
	var post_options = {
		host: host,
		port: '3000',
		path: url,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': post_data.length
		}
	};
	var post_req = http.request(post_options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			if(typeof callback == 'function')
				callback(chunk);
		});
	});

	// post the data
	post_req.write(post_data);

	post_req.end();
}


box.on('click', function() {
	if(!mac_address) {
		return false;
	}
	if(!token && !requesting) {
		requesting = true;
		box.style.bg = "black";
		box.setContent("Requesting token");
		screen.render();
		postTo('/get-token', {ip_address: ip.address(), mac_address: mac_address}, ca_ip, function(response) {
			token = response;
			console.log("Token: " + token);
			setTimeout(makeRequest, 1000);
		});
	}
	else {
		if(!requesting && !in_critical_section) {
			makeRequest();
		}
		if(in_critical_section) {
			leaveCriticalSection();
		}
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

function makeRequest() {
	// Requesting to access critical section
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
function startCriticalSection() {
	in_critical_section = true;
	requesting = false;
	advertisement.request = false;
	d.advertise(advertisement);

	// Send request to cs
	var hash = crypto.createHash('sha1').update(new Buffer(ip.address() + token)).digest('hex');
	console.log(ip.address() + " " + token);
	postTo('/enter', {mac_address: mac_address, token: hash, ip_address: ip.address()}, cs_ip, function(response) {
		if(JSON.parse(response).success) {
			box.style.bg = "red";
			box.setContent("Release resource");
			screen.render();
		}
		else {
			console.log("There was an error requesting the resource!");
			criticalSectionLeft();
		}
	});
}
function leaveCriticalSection() {
	box.style.bg = "black";
	box.setContent("Leaving critical section...");
	screen.render();
	
	postTo('/exit', {ip_address: ip.address()}, cs_ip, function() {
		setTimeout(criticalSectionLeft, 500);
	});
}

function criticalSectionLeft() {
	in_critical_section = false;
	box.style.bg = "green";
	box.setContent("Request resource");
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

