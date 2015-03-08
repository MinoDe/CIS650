
var ip = require('ip');
var http = require('http');
var querystring = require('querystring');
var Discover = require('node-discover');


var d = Discover();
var node_addresses = [], timestamp = 0, pending_reply = false, requesting = false, in_critical_section = false;
var advertisement = {ip: ip.address(), ts: timestamp, request: false, votes: []};

console.log("Commands:");
console.log(" EnterCS()");
console.log(" ExitCS()");
console.log(" Move(direction, distance, speed)");
console.log(" TurnInPlace(degrees)");

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (text) {
	// Possible commands:
	//  Move(direction, distance, speed). direction is boolean: true forward, false backward). distance is in inches and speed 1..10 where 10 is top speed. Robot stops after moving distance.
	//  TurnInPlace(degrees). degrees +/- 1..180

	command = text.trim();
	var leftParen = command.indexOf('(');
	var rightParen = command.indexOf(')');
	if(leftParen == -1 || rightParen == -1 || leftParen > rightParen) {
		return console.log("Invalid command");
	}
	var args = command.substring(leftParen+1, rightParen).split(',');

	if(command.substring(0,7) == "EnterCS") {
		if(!requesting && !in_critical_section) {
			requesting = true;
			console.log("Requesting critical section...");
			timestamp++;
			advertisement.ts = timestamp;
			advertisement.request = true;
			d.advertise(advertisement);
			pending_reply = node_addresses.slice();
			if(node_addresses.length == 0) {
				startCriticalSection();
			}
		}
		else {
			return console.log("Critical section has already been requested");
		}
	}
	else if(command.substring(0,6) == "ExitCS") {
		if(in_critical_section) {
			in_critical_section = false;
			console.log("Leaving critical section");
			makeCommand({command: "Waiting for directions...", bg_color: "black"});
		}
		else {
			return console.log("Not yet in critical section");
		}
	}
	else if(command.substring(0,4) == "Move") {
		if(!in_critical_section) {
			return console.log("Not yet in critical section");
		}
		if(args.length != 3) {
			return console.log("Wrong number of arguments");
		}
		if(args[0].trim() == 'true') {
			var direction = "forward";
		}
		else if(args[0].trim() == 'false') {
			var direction = "backwards"
		}
		else {
			return console.log("Invalid direction argument");
		}
		var distance = parseFloat(args[1].trim());
		if(isNaN(distance) || distance <= 0) {
			return console.log("Invalid distance argument");
		}
		var speed = parseInt(args[2].trim());
		if(isNaN(speed) || speed < 1 || speed > 10) {
			return console.log("Invalid speed argument");
		}
		makeCommand({
			command: "Move " + distance + " inches " + direction + " at a speed of " + speed,
			bg_color: "green"
		});
	}
	else if(command.substring(0,11) == "TurnInPlace") {
		if(!in_critical_section) {
			return console.log("Not yet in critical section");
		}
		if(args.length != 1) {
			return console.log("Wrong number of arguments");
		}
		var degrees = parseFloat(args[0].trim());
		if(isNaN(degrees) || degrees > 180 || degrees < -180) {
			return console.log("Invalid degree argument");
		}
		makeCommand({
			command: "Turn to the " + (degrees > 0 ? "right" : "left") + " " + Math.abs(degrees) + " degrees.",
			bg_color: "magenta"
		});
	}
	else {
		return console.log("Invalid command");
	}
});

function makeCommand(data) {
	postTo('/', data, ip.address(), function(response) {});
}

function postTo(url, data, host, port, callback) {
	var post_data = querystring.stringify(data);
	var post_options = {
		host: host,
		port: port,
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

// Node discover functionality for Agrawal Critical Section
d.broadcast.on("hello", function (obj) {
	if(obj.advertisement) {
		if(obj.advertisement.ts > timestamp)
			timestamp = obj.advertisement.ts;
		if(!in_critical_section) {
			if(obj.advertisement.request == true && (!criticalSectionOverlap(obj.advertisement.tile_ids) || (obj.advertisement.ts < advertisement.ts  || (obj.advertisement.ts == advertisement.ts && obj.advertisement.ip > ip.address())))) {
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
	console.log("Got critical section!");
}

d.on("added", function (obj) {
	console.log("A new node has been added: " + obj.address);
	if(obj.address != ip.address()) {
		node_addresses.push(obj.address);
	}
});

d.on("removed", function (obj) {
	console.log("A node has been removed.");
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


