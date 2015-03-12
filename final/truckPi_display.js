var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var ip = require('ip');
var Discover = require('node-discover');
var app = express();

app.use(bodyParser.urlencoded());

/**
 * Setting up display
 */
// Create a screen object.
var screen = blessed.screen();

// Create a box for directions
var box = blessed.box({
	top: '0',
	left: '0',
	width: '100%',
	height: '60%',
	content: 'Waiting for directions...',
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
// Create a box for logging
var logbox = blessed.box({
	top: '60%',
	left: '0',
	width: '100%',
	height: '40%',
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

// Append our box to the screen.
screen.append(box);
screen.append(logbox);


/**
 * Mapping functionality
 */
var map = [
	[false, {id: 4}],
	[{id: 1}, {id: 5}],
	[{id: 2}, {id: 6}],
	[{id: 3}, {id: 7}],
	[false, {id: 8}]
];
var tile_length = 10;
var my_direction = 0, my_loc_id = 4;

function getRowCol(tile_id) {
	for(var i=0;i<map.length;i++) {
		for(var j=0;j<map[i].length;j++) {
			if(map[i][j] && map[i][j].id == tile_id) {
				return [i, j];
			}
		}
	}
}
var my_row_col = getRowCol(my_loc_id), my_row = my_row_col[0], my_col = my_row_col[1];

function getTurnDegree(start_direction, end_direction) {
	dist = end_direction - start_direction
	if(dist > 180)
		return dist - 360;
	else if(dist < -180)
		return dist + 360;
	return dist;
}

function Direction(command, args, new_position, new_direction) {
	this.command = command;
	this.args = args;
	this.new_position = new_position;
	this.new_direction = new_direction;
}

function getDirections(new_position) {
	var directions = [],
		row_col = getRowCol(new_position), row = row_col[0], col = row_col[1],
		current_loc = {col: my_col, row: my_row}, current_direction = my_direction;

	// If truck is in bay it needs to move to the right
	if(my_col == 0) {
		var turn_degree = getTurnDegree(current_direction, 90);
		if(turn_degree != 0) {
			current_direction = 90;
			directions.push(new Direction("TurnInPlace", [turn_degree], map[current_loc.row][current_loc.col].id, current_direction));
		}
		directions.push(new Direction("Move", [true, tile_length, 8], map[current_loc.row][++current_loc.col].id, current_direction));
	}

	// Moving up or down the right column
	if(current_loc.row > row) {
		var turn_degree = getTurnDegree(current_direction, 0);
		if(turn_degree != 0) {
			current_direction = 0;
			directions.push(new Direction("TurnInPlace", [turn_degree], map[current_loc.row][current_loc.col].id, current_direction));
		}
		for(var i=0;i<current_loc.row - row;i++) {
			directions.push(new Direction("Move", [true, tile_length, 8], map[--current_loc.row][current_loc.col].id, current_direction));
		}
	}
	else if(current_loc.row < row) {
		var turn_degree = getTurnDegree(current_direction, 180);
		if(turn_degree != 0) {
			current_direction = 180;
			directions.push(new Direction("TurnInPlace", [turn_degree], map[current_loc.row][current_loc.col].id, current_direction));
		}
		for(var i=0;i<row - current_loc.row;i++) {
			directions.push(new Direction("Move", [true, tile_length, 8], map[++current_loc.row][current_loc.col].id, current_direction));
		}
	}

	// Move to the left if we are going into a bay
	if(col == 0) {
		var turn_degree = getTurnDegree(current_direction, -90);
		if(turn_degree != 0) {
			current_direction = -90;
			directions.push(new Direction("TurnInPlace", [turn_degree], map[current_loc.row][current_loc.col].id, current_direction));
		}
		directions.push(new Direction("Move", [true, tile_length, 8], map[current_loc.row][--current_loc.col].id, current_direction));
	}

	return directions;
}


/**
 * Functionality for Ricart-Agrawal and communication with bag
 */
var bag_ip = false, bag_port = false;
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
// Configuring Bag interaction functionality
app.post('/setup', function(req, res) {
	var post_data = req.body;

	if(bag_ip === false)
		setTimeout(bagCheckLoop, 1000);

	bag_ip = post_data.ip;
	bag_port = post_data.port;

	res.write(JSON.stringify({success: true}));
    res.end();

	logbox.setContent("Bag IP: " + bag_ip + "\n" + "Bag port: " + bag_port);
	screen.render();
});

var moving_to = false, directions = [], requesting_ids = false;
function bagCheckLoop() {
	postTo('/check', {ip: ip.address()}, bag_ip, bag_port, function(response) {
		response = JSON.parse(response);
		if(response.jobRequested === true) {
			logbox.setContent("Got message from bag!\nMoving to " + response.data.tile_id);
			screen.render();

			moving_to = response.data.tile_id;
			directions = getDirections(moving_to);
			requesting_ids = [my_loc_id];
			for(var i=0;i<directions.length;i++) {
				if(requesting_ids.indexOf(directions[i].new_position) == -1)
					requesting_ids.push(directions[i].new_position);
			}
			if(node_addresses.length > 0) {
				// Run Ricart-Agrawal to get new tiles in critical section
				advertisement.request = requesting_ids;
				d.advertise(advertisement);

				logbox.setContent("Requesting " + requesting_ids.length + " tiles...");
			}
			else {
				// Immediately enter critical section
				startCriticalSection();
			}
		}
	});

	if(moving_to === false)
		setTimeout(bagCheckLoop, 1000);
}

var d = Discover({port:5000});
var node_addresses = [], timestamp = 0, pending_reply = false, requesting = false, moving = false;
var advertisement = {ip: ip.address(), ts: timestamp, current: [my_loc_id], request: false, votes: []};

function overlap(array1, array2) {
	return array1.filter(function(n) {return array2.indexOf(n) != -1}) > 0;
}

function voteFor(advertisement_object) {
	for(var i=0;i<advertisement.votes.length;i++) {
		if(advertisement.votes[i].ip == advertisement_object.ip) {
			if(advertisment_object.ts == advertisement.votes[i].ts)
				return;
			else
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
	moving = true;
	requesting = false;
	advertisement.request = false;
	advertisement.current = requesting_ids.slice(0);
	requesting_ids = false;
	d.advertise(advertisement);

	logbox.setContent("Starting directions!");
	screen.render();

	nextDirection();
}

var next_direction = false;
function nextDirection() {
	if(!moving)
		return;
	if(next_direction !== false) {
		// Update position
		if(my_loc_id != next_direction.new_position) {
			var loc_index = advertisement.current.indexOf(my_loc_id);
			if(loc_index != -1) {
				advertisement.current.splice(loc_index);
				d.advertise(advertisement);
			}
		}

		my_loc_id = next_direction.new_position;
		my_direction = next_direction.new_direction;

		// TODO: Send update to bag
	}
	if(directions.length == 0) {
		next_direction = false;

		box.setContent("Arrived at destination!");
		box.style.bg = "blue";
		screen.render();
 
		postTo('/result', {ip: ip.address()}, bag_ip, bag_port, function() {
			
			// TODO: Move back to starting position if in bay
		});
		moving = false;
		return;
	}
	next_direction = directions.shift();

	if(next_direction.command == "Move") {
		box.setContent("Move " + next_direction.args[1] + " inches " + next_direction.args[0] + " at a speed of " + next_direction.args[2]);
		box.style.bg = "green";
	}
	else {
		box.setContent("Turn to the " + (next_direction.args[0] > 0 ? "right" : "left") + " " + Math.abs(next_direction.args[0]) + " degrees.");
		box.style.bg = "magenta";
	}
	screen.render();
}

box.on('click', nextDirection);

// Node discover functionality for Agrawal Critical Section
d.broadcast.on("hello", function (obj) {
	if(obj.advertisement) {
		if(obj.advertisement.ts > timestamp)
			timestamp = obj.advertisement.ts;

		if((obj.advertisement.request !== false &&
			// We are not requesting or there is no overlap
			(advertisement.request === false && !overlap(advertisement.current, obj.advertisement.request)) ||
			// We are currently requesting and either there's no overlap between requests or the other request beats this one in priority and doesn't overlap the currently owned tiles
			(advertisement.request !== false && (!overlap(advertisment.request, obj.advertisement.request) ||
				((obj.advertisement.ts < advertisement.ts  || (obj.advertisement.ts == advertisement.ts && obj.advertisement.ip > ip.address()))
				&& !overlap(advertisement.current, obj.advertisement.tile_ids)))
			)
		)) {
			// Vote for other node to proceed with critical section
			voteFor(obj.advertisement);
		}
		else if(advertisement.request !== false) {
			// Search for this node's advertisement in the other node's votes
			for(var i=0;i<obj.advertisement.votes.length;i++) {
				if(obj.advertisement.votes[i].ip == ip.address() && obj.advertisement.votes[i].ts == advertisement.ts) {
					checkPendingReplies(obj.advertisement.ip)
				}
			}
		}
	}
});

d.on("added", function (obj) {
	logbox.setContent("A new node has been added: " + obj.address);
	screen.render();
	if(obj.address != ip.address()) {
		node_addresses.push(obj.address);
	}
});

d.on("removed", function (obj) {
	logbox.setContent("A node has been removed.");
	screen.render();
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



/**
 * Setting up server
 */
app.set('port', process.env.PORT || 3000);

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();

http.createServer(app).listen(app.get('port'), function(){
	logbox.setContent("Express server listening on port " + app.get('port'));
	screen.render();
});



