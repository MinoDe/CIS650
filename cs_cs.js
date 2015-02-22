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
		bg: 'black',
		border: {
			fg: '#f0f0f0'
		}
	}
});

// Append our box to the screen.
screen.append(box);

app.set('port', process.env.PORT || 3000);

box.setContent("Waiting for request...");
screen.render();

var active_ip = false;
var valid_nodes = [];
app.post('/add-to-valid-nodes', function(req, res) {
	var post_data = req.body;
	for(var i=0;i<valid_nodes.length;i++) {
		if(valid_nodes[i].mac_address == post_data.mac_address) {
			valid_nodes.splice(i, 1);
			break;
		}
	}
	valid_nodes.push({
		token: post_data.token,
		mac_address: post_data.mac_address,
		ip_address: post_data.ip_address
	});
	console.log("One entry added");
	res.end();
});

app.post('/enter', function(req, res) {
	var post_data = req.body;
	var requested_mac = post_data.mac_address, requested_token = post_data.token;
	var success = false;
	console.log("request from MAC " + requested_mac);
	for(var i=0;i<valid_nodes.length;i++) {
		if(requested_mac == valid_nodes[i].mac_address) {
			var hash = crypto.createHash('sha1').update(new Buffer(post_data.ip_address + valid_nodes[i].token)).digest('hex');
			// console.log("Hash: " + hash);
			// console.log(post_data.ip_address + " " + valid_nodes[i].token);
			if(hash == requested_token) {
				if(active_ip) {
					box.style.bg = "red";
					box.setContent("Multiple nodes in critical section!!");
					screen.render();
				}
				else {
					active_ip = post_data.ip_address;
					success = true;
					box.style.bg = "blue";
					box.setContent("Node with IP "+active_ip+" is in critical section");
					screen.render();
				}
			}
			else {
				console.log("Invalid request made with MAC address" + requested_mac);
			}
			break;
		}
	}

	res.write(JSON.stringify({success: success}));
    res.end();
});

app.post('/exit', function(req, res) {
	var post_data = req.body;

	if(post_data.ip_address == active_ip) {
		active_ip = false;
		box.style.bg = "black";
		box.setContent("Waiting for request...");
		screen.render();
	}

	res.write(JSON.stringify({success: true}));
    res.end();
});



// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});


