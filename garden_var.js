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

var count = 0;
box.setContent("Count: " + count);
screen.render();

app.post('/get-count', function(req, res) {
	var post_data = req.body;

	res.write(count.toString());
    res.end();
});

app.post('/update-count', function(req, res) {
	var post_data = req.body;

	console.log(post_data.count);

	count = parseInt(post_data.count);
	box.setContent("Count: " + count);
	screen.render();

	res.write(count.toString());
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


