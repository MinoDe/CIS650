var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var app = express();

app.use(bodyParser.urlencoded());

// Create a screen object.
var screen = blessed.screen();

var is_locked = 0;
var addr="";
var locked_ip;
var request_index;


var queue = [];


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

var my_index = 1;	// replace with index of my IP in my_group

var my_count, my_delay = 0;

if(process.argv.length > 2) {
	my_delay = parseInt(process.argv[2]);
	if(isNaN(my_delay))
		my_delay = 0;
}

box.setContent('I am the lock. ');
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
app.post('/do_post', function (req, res) {
	var post_data = req.body;	//see connect package above
	/*console.log ( "post body: " + the_body );
	res.json({"body": the_body, "id": JSON.stringify(my_group[my_index])});*/

	//box.setContent("Count is at: " + post_data.n + ", with " + post_data.c + " primes found.");
	countPrimes(post_data);
	//box.style.bg = "green";
	//screen.render();
});

app.post('/election-result', function(req, res) {
	var post_data = req.body;
	if(post_data.leader != my_group[my_index]) {
		box.setContent("The leader is the node at IP " + post_data.leader);
		box.style.bg = "blue";
		screen.render();
		postToNext('/election-result', post_data);
	}
});

var color_arr = ["#B77CB4", "#D3D315", "#F29500", "#02D1D8"]
app.post('/election', function (req, res) {
	var post_data = req.body;
	box.setContent("Got message: " + JSON.stringify(post_data));
	box.style.bg = color_arr[post_data.ip];
	screen.render();

	var from_index = parseInt(post_data.ip), from_count = parseInt(post_data.count);
	if(from_index == my_index) {
		setTimeout(function() {
			box.setContent("I'm the leader!!!");
			box.style.bg = "red";
			screen.render();
			postToNext('/election-result', {leader: my_group[my_index]});
		}, 6000);
	}
	else if(from_count > my_count || (from_count == my_count && my_index > from_index)) {
		setTimeout(function() {
			postToNext('/election', {ip: post_data.ip, count: post_data.count});
		}, 5000);
	}
});


app.post('/request-lock', function (req, res) {
	var post_data = req.body;
	box.setContent("Got request: " + JSON.stringify(post_data));
	box.style.bg = color_arr[post_data.ip];
	screen.render();
	if(is_locked==0) {
		is_locked=1;
		addr=post_data.ip;	
		setTimeout(function() {
			box.style.bg = "red";
			screen.render();
			postToNext('/receive-lock', {status: 'Acquired lock'}, addr);
		}, 2000);
		//queue.push(addr);			
	}
	else {
		queue.push(post_data.ip);

	}

});

app.post('/release-lock', function (req, res) {
	var post_data = req.body;
	box.setContent("Got release: " + JSON.stringify(post_data));
	box.style.bg = color_arr[post_data.ip];
	screen.render();
	if (queue.length==0) {
		is_locked=0;
		addr = '';
	}	
	else{
		var i = queue.shift();
		addr=i;
		setTimeout(function() {
			box.style.bg = "red";
			screen.render();	
			postToNext('/receive-lock', {status: 'Acquired lock'}, i);
		}, 2000);
	}
});


function countPrimes(data, callback) {
	var kwork = parseInt(data.k);
	var num = data.n;
	var count = data.c;

	if(isNaN(kwork)) {
		return false;
	}

	box.setContent("Running computations for " + Math.max(0, data.k - my_delay) + " milliseconds");
	box.style.bg = "green";
	screen.render();

	setTimeout(function() {
	// Get Primes
         var prevTime = (new Date()).getTime();
         var status = 1;

         while(1)
     {
         var curTime = (new Date()).getTime();
                 var deltaTime = curTime - prevTime;

                 if(deltaTime > Math.max(0, data.k - my_delay))
                        break;
         var j = 2;
         for (  j = 2 ; j <= Math.sqrt(num) ; j++ )
         {
            if ( num%j == 0 )
            {
               status = 0;
               break;
            }
         }
         if ( status != 0 )
         {
            count++;
         }
         status = 1;
         num++;

      }

		callback({c:count,n:num,k:kwork});

	}, 0);
}


function postToNext(url, data, host) {
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

// Focus our element.
box.focus();

// Render the screen.
screen.render();

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});
