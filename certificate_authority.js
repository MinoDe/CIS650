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

var certificates=[];
var entries=0;
var critical_sec_ip = '192.168.0.104';

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
//box.setContent("Count: " + count);
screen.render();

// token=randomHashAddress
app.post('/get-token', function(req, res) {
    var post_data = req.body;
    var mac_addr = post_data.mac_address;
    var token_new = makeid();
    var ip = post_data.ip_address;
    var found = false;
    for (var i=0; i<entries; i++) {
	
//    	if (certificates[i]!=null) {
    	    if(certificates[i].mac_address==mac_addr){
    		box.setContent("Node already registered, MAC Address: " + mac_addr);
			box.style.bg = "orange";
			screen.render();
    		token_new = certificates[i].token;
    		found = true;
    		break;
    	    }
//    	}
    }
    str_message='';
    if (!found) {
    	certificates[entries]={mac_address: mac_addr,
    			       ip_address: ip,
    			       token: token_new}
		str_message = "New entry added.  Entry count: " + (entries + 1) + ", MAC Address: " + mac_addr + ", token: " + token_new + ", ip address: " + ip;    			       
    }
	else{
		str_message="Entry already in CA.  Entry count: " + entries + ", MAC Address: " + mac_addr + ", token: " + token_new + ", ip address: " + ip;
	}
    //setTimeout(function() {
    //box.setContent("MAC Address: " + mac_addr + ", token: " + token_new + ", ip address: " + ip);
	box.style.bg = "blue";
	box.setContent(str_message);
    screen.render();
    res.write(token_new);		
	postToNext('/add-to-valid-nodes',certificates[entries], critical_sec_ip);
	//postToNext('/election', {ip: post_data.ip, count: post_data.count});
	if (!found) {
		entries = entries + 1; 
	}
    res.end();
});

app.post('/backdoor', function(req, res) {
	res.write(JSON.stringify(certificates[entries-1]));
	});

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

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
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


