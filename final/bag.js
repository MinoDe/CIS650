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
app.use(express.static(__dirname + '/public'));


var pi_sensors=['192.168.0.120','192.168.0.111'];
var workers=['192.168.0.110','192.168.0.105'];
var s1_queue=[true];
var s2_queue=[true];
var s3_queue=[true];
var s_val=[undefined, undefined, undefined];
var bay_blocked=[, false,false,false];	// sensor activated, bay added here

//var w1_queue=[{tile_id:1}, {tile_id: 3}];
var w1_queue=[];
var w1_bay=[,false,false,false];
var w1_assign=[];
var sensor_threshold=15;
/*
var map = [
    [false, {id:4 , truck:"X"}],
    [{id: 1, truck:"X", count:0}, {id: 5,truck:"X"}],
    [{id: 2,truck:"A",count:0}, {id: 6,truck:"X"}],
    [{id: 3,truck:"B",count:0}, {id: 7,truck:"X"}],
    [false, {id: 8, truck:"X"}]
];*/
var map = [
    [false, {id:4 , truck:"X"}],
    [{id: 1, truck:"X", count:0}, {id: 5,truck:"X"}],
    [{id: 2,truck:"X",count:0}, {id: 6,truck:"X"}],
    [{id: 3,truck:"X",count:0}, {id: 7,truck:"X"}],
    [false, {id: 8, truck:"X"}]
];

// Create a screen object.
var screen = blessed.screen();

app.set('port', process.env.PORT || 3000);

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
	
});


setTimeout(function(){
	for(var i=0; i<2; i++){
		postTo('/setup',{ip: ip.address(), port: 3000},pi_sensors[i],3000)
		postTo('/setup',{ip: ip.address(), port: 3000},workers[i],3000)	
	}
	
}, 1000);


app.post('/check', function(req, res) {
	// give truck, sensor jobs
	var post_data = req.body;
	//console.log('hell '  + post_data )
	temp_ip = post_data.ip;

	if (temp_ip==pi_sensors[0]) {
		if(s1_queue.length >= 1) {
			res.write(JSON.stringify({readRequested: true, job_id: s1_queue[0]}));
			//s1_queue=[];
    		res.end();
		}
		else {
			// give sensor new job?
			res.write(JSON.stringify({readRequested: false}));
			res.end();
		}
	}
	else if (temp_ip==pi_sensors[1]) {
		if(s2_queue.length >= 1) {
			res.write(JSON.stringify({readRequested: true, job_id: s2_queue[0]}));
			//s2_queue=[];
    		res.end();
		}
		else {
			res.write(JSON.stringify({readRequested: false}));
			res.end();
		}
	}
	else if (temp_ip==pi_sensors[2]) {
		if(s3_queue.length >= 1) {
			res.write(JSON.stringify({readRequested: true, job_id: s3_queue[0]}));
    		//s3_queue=[];
    		res.end();
		}
		else {
			res.write(JSON.stringify({readRequested: false}));
			res.end();
		}
	}
	else {
		var job_already_assigned = false, no_free_job = true, job;
		if(w1_queue.length >= 1) {

			// run loop for w1_assign, look for first '0' (not assigned)
			/*var idx; var found=false;

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
					// OK
					res.write(JSON.stringify({jobRequested: true, data: w1_queue[idx]}));
    				res.end();
    			}
    			else if(temp_ip==workers[1]) {
					res.write(JSON.stringify({readRequested: true, data: w1_queue[idx]}));
    				res.end();	
    			}
    			else if(temp_ip==workers[2]) {
					res.write(JSON.stringify({readRequested: true, data: w1_queue[idx]}));
    				res.end();
    			}
    		}
    		else {
    			// all jobs taken, create new job

    		}*/

			// Check queue for job already given to truck
			for(var i=0;i<w1_queue.length;i++) {
				if(w1_assign[i] == temp_ip) {
					job_already_assigned = true;
				}
			}
			if(!job_already_assigned) {
				for(var i=0;i<w1_queue.length;i++) {
					// check whether bay blocked
					if(w1_assign[i] === false/* && bay_blocked[w1_queue[i].tile_id]==false*/) {
						w1_assign[i] = temp_ip;
						job = w1_queue[i];
						no_free_job = false;
						break;
					}
				}
			}
			if(!no_free_job) {
				res.write(JSON.stringify({jobRequested: true, data: job}));
				res.end();
			}

		}
		if(job_already_assigned || no_free_job) {
			res.write(JSON.stringify({readRequested: false}));
			res.end();
		}
		//console.log("Job assigned: " + job_already_assigned + ", no free job: " + no_free_job);
	}
});

app.post('/result', function(req, res) {
	// receive result from sensors, workers
	var post_data = req.body;

	temp_ip = post_data.ip;

	if (temp_ip==pi_sensors[0]) {
		var val =post_data.value;
		s_val[0]=val;
		if(val>=sensor_threshold){
			bay_blocked[1]=true;
		}	
		//console.log('val ' + val + ' posted to s_val[0]');
		res.end();
	}
	else if (temp_ip==pi_sensors[1]) {
		var val =post_data.value;
		s_val[1]=val;
		if(val>=sensor_threshold){
			bay_blocked[2]=true;
		}	
		//console.log('val ' + val + ' posted to s_val[1]');
		res.end();
	}
	else if (temp_ip==pi_sensors[2]) {
		var val =post_data.value;
		s_val[2]=val;
		if(val>=sensor_threshold){
			bay_blocked[3]=true;
		}	
		//console.log('val ' + val + ' posted to s_val[2]');
		res.end();
	}

/*	var map = [
    	[false, {id:4 , truck:"A"}],
    	[{id: 1, truck:"X"}, {id: 5,truck:"X"}],
    	[{id: 2,truck:"X"}, {id: 6,truck:"X"}],
    	[{id: 3,truck:"X"}, {id: 7,truck:"X"}],
    	[false, {id: 8, truck:"B"}]
	];
*/
	else if (temp_ip==workers[0]) {
		var val =post_data.value; //[1]
		var current_index = w1_assign.indexOf(temp_ip);
		if(current_index != -1) {
			map[w1_queue[current_index].tile_id][0].count--;
			w1_assign.splice(current_index, 1);
			w1_queue.splice(current_index, 1);
		/*
		var tile_ids = post_data.tile_ids
		var truck_id= post_data.truck_id;
		for(var m in map) {
			for (var i=0; i<map[m].length; i++) {
				if(map[m][i].truck == truck_id && tile_ids.indexOf(map[m][i].id) == -1) {
					map[m][i].truck = "X";
					map[m][i].count -= 1;
				}
			}*/
		}

		res.end();
	}	
});


// read sensor, assign job, set and read sensor, close bay
app.post('/readsensor',function(req, res) {
	var post_data=req.body;
	var id = post_data.id;

	if(id==1)
		res.write(JSON.stringify({value: s_val[0]}));
		
	else if (id==2)
		res.write(JSON.stringify({value: s_val[1]}));
		
	else if (id==3)
		res.write(JSON.stringify({value: s_val[2]}));
		
res.end();
	
});

// close bay
app.post('/shutdown',function(req, res) {
	var post_data=req.body;
	var id = post_data.id;
	var shut = post_data.shut;
	w1_bay[id]=shut;
});

app.post('/status', function(req, res) {
	// receive information when a worker moves or changes direction...
	var post_data = req.body;

	var truck_id = (post_data.ip == workers[0] ? "A" : "B");

	var val =post_data.value;

	var tile_ids = post_data.tile_ids;
	// Make sure tile IDs are an array
	if(typeof tile_ids == 'string') {
		tile_ids = [tile_ids];
	}
	for(var i=0;i<tile_ids.length;i++) {
		tile_ids[i] = parseInt(tile_ids[i]);
	}

	for(var m in map) {
		for (var i=0; i<map[m].length; i++) {
			if(map[m][i].truck == truck_id && tile_ids.indexOf(map[m][i].id) == -1) {
				map[m][i].truck = "X";
			}
			else if(map[m][i].truck != truck_id && tile_ids.indexOf(map[m][i].id) != -1) {
				map[m][i].truck = truck_id;
			}
		}
	}

	//console.log(typeof post_data.tile_ids, post_data.tile_ids);
	console.log(map);
	console.log(w1_queue);
	
	//console.log(w1_queue);
	//console.log(w1_assign);

	res.end();
});

app.get('/map', function(req, res) {
	// receive result from sensors, workers
	//var post_data = req.body;
	res.write(JSON.stringify(map));

	res.end();

});

app.get('/workqueue', function(req, res) {
	// send work queue status
	//var post_data = req.body;

	res.write(JSON.stringify(w1_queue));
	res.end();

});

app.post('/bay', function(req, res){
	var post_data = req.body;
	var bay_id = post_data.id;
	w1_queue.push({tile_id:bay_id});
	w1_assign.push(false);
	if (bay_id==1)
		map[bay_id][0].count += 1

	else if (bay_id==2)
		map[bay_id][0].count += 1
	else if (bay_id==3)
		map[bay_id][0].count += 1

	console.log("calling bay" + w1_queue);
	console.log(w1_assign);
	res.write(JSON.stringify(""));
	res.end();

});


/*
app.post('/sensors', function(req, res){
	var post_data = req.body;
	var sensor_id = post_data.id;

	var flag=0;

	w1_queue.push({tile_id:bay_id});

	if (sensor_id==1) {
		if (s1_queue.length > 0)
			flag = 1;
	}
	else if (sensor_id==2) {
		if (s2_queue.length > 0)
			flag = 1;
	}
	else if (sensor_id==3) {
		if (s3_queue.length > 0)
			flag = 1;
	}
	if(flag ==1) {
		res.write(JSON.stringify({res: true}));
	}
	else
	{
		res.write(JSON.stringify({res: false}));	
	}
	
	console.log("bay_id that was assigned: " + bay_id)

});
*/

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
