var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var crypto = require('crypto');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var ip = require('ip');
var app = express();

app.use(bodyParser.urlencoded());

app.set('port', process.env.PORT || 3000);

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});


http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});


// Configuring Bag interaction functionality
var bag_ip = false, bag_port = false;
app.post('/setup', function(req, res) {
	var post_data = req.body;

	if(bag_ip === false)
		setTimeout(bagCheckLoop, 2000);

	bag_ip = post_data.ip;
	bag_port = post_data.port;

	res.write(JSON.stringify({success: true}));
    res.end();
});

function bagCheckLoop() {
	postTo('/check', {ip: ip.address()}, bag_ip, bag_port, function(response) {
		response = JSON.parse(response);
		if(response.readRequested == true) {
			cmd = "sudo python /home/pi/GrovePi/Software/Python/grove_console.py";
			exec(cmd, function(err, out, code) {
				postTo('/result', {ip: ip.address(), value: out}, bag_ip, bag_port);
				process.exit(code);
			});
		}
	});

	setTimeout(bagCheckLoop, 2000);
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


