var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var ip = require('ip');
var app = express();

app.use(bodyParser.urlencoded());

// Create a screen object.
var screen = blessed.screen();

// Create a box perfectly centered horizontally and vertically.
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
		},
		hover: {
			bg: 'black'
		}
	}
});

// Append our box to the screen.
screen.append(box);

app.set('port', process.env.PORT || 3000);

var my_group = ["192.168.0.101", "192.168.0.104", "192.168.0.105", "192.168.0.108"];	// replace with real IPs of group

box.setContent("Waiting for new person");
screen.render();

var person_entering = false;

app.post('/receive-lock', function(req, res) {
	var post_data = req.body;
	postToVar({ip: ip.address()}, '/get-count');

	box.setContent("Got lock.");
	box.style.bg = "green";
	screen.render();
});

function postToLock(data, url) {
	var post_data = querystring.stringify(data);
	var post_options = {
		host: "192.168.0.105",
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

		});
	});

	// post the data
	post_req.write(post_data);
	post_req.end();
}

function postToVar(data, url) {
	var post_data = querystring.stringify(data);
	var post_options = {
		host: "192.168.0.101",
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
			if(url == '/get-count') {
				var count = parseInt(chunk);
				box.setContent("Got count of " + count);
				screen.render();
				postToVar({ip: ip.address(), count: count + 1}, '/update-count');

			}
			else {
				postToLock({ip: ip.address()}, '/release-lock');
				person_entering = false;

				box.setContent("Waiting for new person");
				box.style.bg = "black";
				screen.render();
			}
			
		});
	});

	// post the data
	post_req.write(post_data);
	post_req.end();
}

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

screen.key(['e'], function(ch, key) {
	if(!person_entering) {
		person_entering = true;
		postToLock({ip: ip.address()}, '/request-lock');
		box.setContent("Someone is entering, waiting for lock.");
		box.style.bg = "yellow";
		screen.render();
	}
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});