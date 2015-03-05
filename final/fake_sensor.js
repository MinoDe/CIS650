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

// Main response functionality
var output_val = "10";
var input_number = "";
var reading_from_input = false;
app.all('/', function(req, res) {
	logger_box.setContent("Received request from IP " + req.ip);
	screen.render();
	if(!reading_from_input) {
		res.write(output_val);
	}
	else {
		if(input_number.length == 0)
			res.write("0");
		else
			res.write(parseInt(input_number).toString());
	}

    res.end();
});

// Create a screen object.
var screen = blessed.screen();

var box_vals = ["10", "25", "50", "80"], boxes = [];
for(var i=0;i<box_vals.length;i++) {
	boxes.push(blessed.box({
		top: 'center',
		left: Math.floor((i/box_vals.length)*100) + "%",
		width: '25%',
		height: '50%',
		content: box_vals[i],
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
		},
		align: 'center'
	}));
	screen.append(boxes[i]);
	(function(index) {
		// Add click handler for boxes
		boxes[index].on('click', function() {
			output_val = box_vals[index];
			reading_from_input = false;
			for(var j=0;j<boxes.length;j++) {
				if(j == index) continue;
				boxes[j].style.bg = "black";
			}
			input_box.style.bg = "black"
			boxes[index].style.bg = "blue";
			screen.render();
		});
	})(i);
}
boxes[0].style.bg = "blue";


// Adding numeric input capability
var input_box = blessed.box({
	top: '75%',
	left: "0",
	width: '100%',
	height: '25%',
	content: "",
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
	},
	align: 'center'
});
screen.append(input_box);
input_box.on('click', function() {
	reading_from_input = true;
	for(var j=0;j<boxes.length;j++) {
		boxes[j].style.bg = "black";
	}
	input_box.style.bg = "blue";
	screen.render();
});

screen.key(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace'], function (chunk, key) {
	var number_changed = false;
	if(input_number.length > 0 && key.name == "backspace") {
		input_number = input_number.substring(0, input_number.length - 1);
		number_changed = true;
	}
	else if(input_number.length < 10 && key && chunk.toString() >= "0" && chunk.toString() <= "9") {
		input_number += chunk.toString();
		number_changed = true;
	}
	if(number_changed) {
		input_box.setContent(input_number);
		screen.render();
	}
});

// Create box for logging information
var logger_box = blessed.box({
	top: "0",
	left: "0",
	width: '100%',
	height: '25%',
	content: "",
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
screen.append(logger_box);

app.set('port', process.env.PORT || 3000);

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

// Render the screen.
screen.render();

http.createServer(app).listen(app.get('port'), function(){
	logger_box.setContent("Express server listening on port " + app.get('port'));
	screen.render();
});




// Configuring Bag interaction functionality
var bag_ip = "0.0.0.0", bag_port = 3000;
app.post('/setup', function(req, res) {
	var post_data = req.body;

	bag_ip = post_data.ip;
	bag_port = post_data.port;

	res.write(JSON.stringify({success: true}));
    res.end();

	setTimeout(bagCheckLoop, 1000);
});
function bagCheckLoop() {
	postTo('/check', {ip: ip.address()}, bag_ip, bag_port, function(response) {
		response = JSON.parse(response);
		if(response.readRequested == true) {
			postTo('/result', {ip: ip.address(), value: output_val}, bag_ip, bag_port);
		}
	});

	setTimeout(bagCheckLoop, 1000);
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


