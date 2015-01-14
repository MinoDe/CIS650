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

var my_group = ["192.168.1.100", "192.168.1.102", "192.168.1.106", "192.168.1.107"];	// replace with real IPs of group

var my_index = 0;	// replace with index of my IP in my_group

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
app.post('/do_post', function (req, res) {
	var post_data = req.body;	//see connect package above
	/*console.log ( "post body: " + the_body );
	res.json({"body": the_body, "id": JSON.stringify(my_group[my_index])});*/

	//box.setContent("Count is at: " + post_data.n + ", with " + post_data.c + " primes found.");
	countPrimes(post_data);
	//box.style.bg = "green";
	//screen.render();
});

function countPrimes(post_data) {
	var kwork = post_data.k;
	var num = post_data.n;
	var count = post_data.c;

	box.setContent("Running computations for " + post_data.k + " milliseconds");
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

                 if(deltaTime > kwork)
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

	postToNext({c:count,n:num,k:kwork});
	}, 0);
}

function postToNext(data) {
	box.style.bg = "yellow";
	box.setContent("Numbers looked at: " + data.n + ". Primes found: " + data.c);
	screen.render();

	var post_data = querystring.stringify(data);
	var post_options = {
		host: my_group[(my_index + 1) % my_group.length],
		port: '3000',
		path: '/do_post',
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
if(my_index == 0) {
	countPrimes({c:0,n:0,k:5000});
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