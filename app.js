var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
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

var my_group = ["192.168.1.101", "192.168.1.102", "192.168.1.106", "192.168.1.107"];	// replace with real IPs of group

var my_index = 2;	// replace with index of my IP in my_group

box.setContent('this node (' + my_group[my_index] + ') will attempt to send its token to other nodes on network. ');
screen.render();

// handle GET requests
app.get('/do_get', function (req, res){
	var the_body = req.query;
	console.log ( "get body: " + the_body );
	box.setContent("Get with query: " + the_body);
	box.style.bg = 'green';	//green for get
	screen.render();
	res.json({"query": the_body, "id": JSON.stringify(my_group[my_index])});
});

// handle POST requests
function handlePost(req, res) {
	var the_body = req.body;	//see connect package above
	/*console.log ( "post body: " + the_body );
	box.setContent("Post with body: " + the_body);
	res.json({"body": the_body, "id": JSON.stringify(my_group[my_index])});*/
	box.style.bg = 'red';
	screen.render();
	setTimeout(function() {
		box.style.bg = 'black';
		screen.render();
		var post_data = JSON.stringify({});
		var post_options = {
			host: my_group[(my_index + 1) % my_group.length],
			port: '3000',
			path: '/do_post',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length
			}
		};
		var post_req = http.request(post_options, function(res) {
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				console.log('Response: ' + chunk);
			});
		});

		// post the data
		post_req.write(post_data);
		post_req.end();
	}, 2000);
}
app.post('/do_post', handlePost);
if(my_index == 0) {
	handlePost({});
}

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