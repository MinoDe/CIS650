
var ip = require('ip');
var http = require('http');
var querystring = require('querystring');

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
	if(command.substring(0,4) == "Move") {
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
};

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

/*
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
	});*/


