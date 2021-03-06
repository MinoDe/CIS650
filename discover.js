/*
 *
 * Node Discover
 *
 * Attributes
 *   Nodes
 *
 * Methods
 *   Promote
 *   Demote
 *   Join
 *   Leave
 *   Advertise
 *   Send
 *   Start
 *   Stop
 *   EachNode(fn)
 *
 * Events
 *   Promotion
 *   Demotion
 *   Added
 *   Removed
 *   Master
 *
 *
 * checkInterval should be greater than hello interval or you're just wasting cpu
 * nodeTimeout must be greater than checkInterval
 * masterTimeout must be greater than nodeTimeout
 *
 */

var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();

var bodyParser = require('body-parser');
var querystring = require('querystring');


var Network = require('./network.js'),
	EventEmitter = require('events').EventEmitter,
	util = require('util');
http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});
var reservedEvents = ['promotion', 'demotion', 'added', 'removed', 'master', 'hello', 'sendTo'];

module.exports = Discover;

/*
 * This is the default automatically assigned weight function in the case that 
 * you do not specify a weight, this function will be called. You can override
 * this function if you want to change the default behavior.
 * 
 * Example:
 * 
 * js
 * var Discover = require('discover');
 * Discover.weight = function () {
 * 	return Math.random();
 * }
 * 
 * var d = new Discover();
 * ```
 */
Discover.weight = function () {
	//default to negative, decimal now value
	return -(Date.now() / Math.pow(10,String(Date.now()).length));
};
//Listening to data on /data
app.post('/data', function(req, res) {
	var post_data = req.body;
//	if(post_data.leader != my_group[my_index]) {
		box.setContent("data received " + post_data.data);
		box.style.bg = "blue";
		screen.render();
		console.log("Received data");
		//postToNext('/election-result', post_data);
//	}
});
function Discover (options, callback) {
	if (!(this instanceof Discover)) {
		return new Discover(options, callback);
	}

	EventEmitter.call(this);

	if (typeof options === 'function') {
		callback = options;
		options = null;
	}

	var self = this, checkId, helloId, running = false, options = options || {}

	var settings = self.settings = {
		helloInterval	: options.helloInterval		|| 1000,
		checkInterval	: options.checkInterval		|| 2000,
		nodeTimeout		: options.nodeTimeout		|| 2000,
		masterTimeout	: options.masterTimeout		|| 2000,
		address			: options.address			|| '0.0.0.0',
		port			: options.port				|| 12345,
		broadcast		: options.broadcast 		|| null,
		multicast		: options.multicast 		|| null,
		multicastTTL 	: options.multicastTTL 		|| null,
		key				: options.key				|| null,
		mastersRequired	: options.mastersRequired	|| 1,
		weight			: options.weight			|| Discover.weight()
	};

	if (!(settings.nodeTimeout >= settings.checkInterval)) {
		throw new Error("nodeTimeout must be greater than or equal to checkInterval.");
	}

	if (!(settings.masterTimeout >= settings.nodeTimeout)) {
		throw new Error("masterTimeout must be greater than or equal to nodeTimeout.");
	}

	self.broadcast = new Network({
		address 	: settings.address,
		port 		: settings.port,
		broadcast 	: settings.broadcast,
		multicast	: settings.multicast,
		multicastTTL: settings.multicastTTL,
		key 		: settings.key
	});

	//This is the object that gets broadcast with each hello packet.
	self.me = {
		isMaster 	: false,
		isMasterEligible: true,
		weight 		: settings.weight,
		address 	: '127.0.0.1' //TODO: get the real local address?
	};

	self.nodes = {};
	self.channels = [];

	/*
	 * When receiving hello messages we need things to happen in the following order:
	 * 	- make sure the node is in the node list
	 * 	- if hello is from new node, emit added
	 * 	- if hello is from new master and we are master, demote
	 * 	- if hello is from new master emit master
	 *
	 * need to be careful not to over-write the old node object before we have information
	 * about the old instance to determine if node was previously a master.
	 */
	self.evaluateHello = function (data, obj, rinfo) {
		data.lastSeen = +new Date();
		data.address = rinfo.address;
		data.hostName = obj.hostName;
		data.port = rinfo.port;
		data.id = obj.iid;
		var isNew = !self.nodes[obj.iid];
		var wasMaster = null;

		if (!isNew) {
			wasMaster = !!self.nodes[obj.iid].isMaster;
		}

		var node = self.nodes[obj.iid] = self.nodes[obj.iid] || {};

		Object.getOwnPropertyNames(data).forEach(function (key) {
			node[key] = data[key];
		});

		if (isNew) {
			//new node found

			self.emit("added", node, obj, rinfo);
		}

		if (node.isMaster) {
			//if we have this node and it was not previously a master then it is a new master node
			if ((isNew || !wasMaster )) {
				//this is a new master

				//count up how many masters we have now
				//initialze to 1 if we are a master
				var masterCount = (self.me.isMaster) ? 1 : 0;
				for (var uuid in self.nodes) {
					if (self.nodes[uuid].isMaster) {
						masterCount++;
					}
				}

				if (self.me.isMaster && masterCount > settings.mastersRequired) {
					self.demote();
				}

				self.emit("master", node, obj, rinfo);
			}
		}
	};

	self.broadcast.on("hello", self.evaluateHello);

	self.broadcast.on("error", function (error) {
		self.emit("error", error);
	});

	var check_counter = 0;
	self.check = function () {
		if(check_counter == 0) {
			check_counter = 1;
			return;
		}

		var node = null, mastersFound = 0, higherWeightFound = false, removed;

		var weights = [];

		var node_count = 0;
		for (var processUuid in self.nodes) {
			node_count++;
			node = self.nodes[processUuid];
			removed = false;
	
			if ( +new Date() - node.lastSeen > settings.nodeTimeout ) {
				//we haven't seen the node recently
	
				//If node is a master and has not timed out yet based on the masterTimeout then fake it being found
				if ( node.isMaster && (+new Date() - node.lastSeen) < settings.masterTimeout ) {
					mastersFound++;
				}
	
				//delete the node from our nodes list
				delete self.nodes[processUuid]
				removed = true;
				self.emit("removed", node);
			}
			else if (node.isMaster) {
				mastersFound++;
			}
	
			if (node.weight > self.me.weight && node.isMasterEligible /*&& !node.isMaster */&& !removed) {
				higherWeightFound = true;
			}
		}

		if (!self.me.isMaster /*&& mastersFound < settings.mastersRequired*/ && self.me.isMasterEligible && !higherWeightFound) {
			//no masters found out of all our nodes, become one.
			self.promote();
		}
	};

	self.start = function (callback) {
		if (running) {
			callback && callback(null, false);

			return false;
		}
		
		self.broadcast.start(function (err) {
			if (err) {
				return callback && callback(err, false);
			}

			running = true;

			checkId = setInterval(self.check, checkInterval());

			//send hello every helloInterval
			helloId = setInterval(function () {
				self.broadcast.send("hello", self.me)
			}, helloInterval());

			return callback && callback(null, true);
		});
	};

	self.stop = function () {
		if (!running) {
			return false;
		}

		self.broadcast.stop();

		clearInterval(checkId);
		clearInterval(helloId);
	};

	self.start(callback);

	function helloInterval () {
		if (typeof settings.helloInterval === 'function') {
			return settings.helloInterval.call(self);
		}
		//else
		return settings.helloInterval;
	}

	function checkInterval () {
		if (typeof settings.checkInterval === 'function') {
			return settings.checkInterval.call(self);
		}
		//else
		return settings.checkInterval;
	}
};

util.inherits(Discover, EventEmitter);
//Adding a method to send a post message
Discover.prototype.sendTo = function(ip, data){
	var post_data = querystring.stringify(data);
	var post_options = {
		host: ip,
		port: '3000',
		path: '/data',
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
};


Discover.prototype.promote = function () {
	var self = this;

	self.me.isMasterEligible = true;
	self.me.isMaster = true;
	self.emit("promotion", self.me);
	self.hello();
};

Discover.prototype.demote = function (permanent) {
	var self = this;

	self.me.isMasterEligible = !permanent;
	self.me.isMaster = false;
	self.emit("demotion", self.me);
	self.hello();
};

Discover.prototype.hello = function () {
	var self = this;

	self.broadcast.send("hello", self.me);
};

Discover.prototype.advertise = function (obj) {
	var self = this;

	self.me.advertisement = obj;
};

Discover.prototype.eachNode = function (fn) {
	var self = this;

	for ( var uuid in self.nodes ) {
		fn(self.nodes[uuid]);
	}
};

Discover.prototype.join = function (channel, fn) {
	var self = this;

	if (~reservedEvents.indexOf(channel)) {
		return false;
	}

	if (~self.channels.indexOf(channel)) {
		return false;
	}

	if (fn) {
		self.on(channel, fn);
	}

	self.broadcast.on(channel, function (data, obj, rinfo) {
		self.emit(channel, data, obj, rinfo);
	});

	self.channels.push(channel);

	return true;
};

Discover.prototype.leave = function (channel) {
	var self = this;

	self.broadcast.removeAllListeners(channel);

	delete self.channels[self.channels.indexOf(channel)];

	return true;
};

Discover.prototype.send = function (channel, obj) {
	var self = this;

	if (~reservedEvents.indexOf(channel)) {
		return false;
	}

	self.broadcast.send(channel, obj);

	return true;
};
