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

bag_ip='0.0.0.0'
bag_port=3000

var pi_sensors=['192.168.0.101','192.168.0.102','192.168.0.103'];
var workers=['192.168.0.120','192.168.0.121','192.168.0.122'];
var s1_queue=[];
var s2_queue=[];
var s3_queue=[];
var w1_queue=[];
var w1_bay=[];
var w1_assign=[];

var map = [
    [false, {id:4 , truck:"A"}],
    [{id: 1, truck:"X"}, {id: 5,truck:"X"}],
    [{id: 2,truck:"X"}, {id: 6,truck:"X"}],
    [{id: 3,truck:"X"}, {id: 7,truck:"X"}],
    [false, {id: 8, truck:"B"}]
];

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


app.post('/check', function(req, res) {
	// give truck, sensor jobs
	var post_data = req.body;

	temp_ip = post_data.ip;

	if (temp_ip==pi_sensors[0]) {
		if(s1_queue.length >= 1) {
			res.write(JSON.stringify({readRequested: true, job_id: s1_queue[0]}));
    		res.end();
    		postTo('/output',{s1_queue: s1_queue[0]}})
		}
		else {
			// give sensor new job?
			res.write(JSON.stringify({readRequested: false}));
			res.end();
		}
	}
	else if (temp_ip==pi_sensors[1]) {
		if(s2_queue.length >= 1) {
			res.write(JSON.stringify({success: true, job_id: s2_queue[0]}));
    		res.end();
    		postTo('/output',{s2_queue: s2_queue[0]}})
		}
		else {
			res.write(JSON.stringify({readRequested: false}));
			res.end();
		}
	}
	else if (temp_ip==pi_sensors[2]) {
		if(s3_queue.length >= 1) {
			res.write(JSON.stringify({success: true, job_id: s3_queue[0]}));
    		res.end();
    		postTo('/output',{s3_queue: s3_queue[0]}})
		}
		else {
			res.write(JSON.stringify({readRequested: false}));
			res.end();
		}
	}
	else {
		if(w1_queue.length >= 1) {
			// run loop for w1_assign, look for first '0' (not assigned)
			var idx; var found=false;
			for(idx=0; idx<w1_assign.length; idx++){
				if(w1_assign[idx]==0) {
					w1_assign[idx]=1;
					found=true;
					break;
				}
			}
			// job found?
			if(found) {
				if(temp_ip==workers[0]) {
					res.write(JSON.stringify({readRequested: true, job_id: w1_queue[idx],
									  		bay_number: b_number}));
    				res.end();
    				// post to individual bays?	
    				postTo('/output',{w1_queue: w1_queue[idx]});
    			}
    			else if(temp_ip==workers[1]) {
					res.write(JSON.stringify({readRequested: true, job_id: w1_queue[idx],
									  		bay_number: b_number}));
    				res.end();	
    				postTo('/output',{w1_queue: w1_queue[idx]});
    			}
    			else if(temp_ip==workers[2]) {
					res.write(JSON.stringify({readRequested: true, job_id: w1_queue[idx],
									  		bay_number: b_number}));
    				res.end();	
    				postTo('/output',{w1_queue: w1_queue[idx]});
    			}
    		}
    		else {
    			// all jobs taken, create new job

    		}

		}
		else {
			// push new job

			res.write(JSON.stringify({readRequested: false}));
			res.end();
		}
	}
});
app.post('/result', function(req, res) {
	// receive result from sensors, workers
	var post_data = req.body;

	temp_ip = post_data.ip;

	if (temp_ip==pi_sensors[0]) {
		if(w1_queue.length >= 1) {

			res.write(JSON.stringify({success: true, job_id: s1_queue[0]}));
    		res.end();
		}
	}

});

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
