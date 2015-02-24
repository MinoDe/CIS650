var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var crypto = require('crypto');
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
		bg: 'blue',
		border: {
			fg: '#f0f0f0'
		}
	}
});

// Append our box to the screen.
screen.append(box);

app.set('port', process.env.PORT || 3000);

box.setContent("Make request to GrovePi...");
screen.render();

function postTo(url, data, host, callback) {
	var post_data = querystring.stringify(data);
	var post_options = {
		host: host,
		port: '5000',
		path: url,
		method: 'GET',
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

var requesting = false;
box.on('click', function() {
	if(!requesting) {
		box.style.bg = "black";
		box.setContent("Requesting information from GrovePi");
		screen.render();
		requesting = true;
		postTo('/hello', {}, "192.168.0.120", function(response) {
			box.style.bg = "green";
			box.setContent("Response: " + response);
			screen.render();
			requesting = false;
		});
	}
});



// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();

