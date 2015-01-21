var Discover = require('node-discover');

var d = Discover();


d.on("promotion", function () {
    /* 
     * Launch things this master process should do.
     * 
     * For example:
     *  - Monitior your redis servers and handle failover by issuing slaveof
     *    commands then notify other node instances to use the new master
     *  - Make sure there are a certain number of nodes in the cluster and 
     *    launch new ones if there are not enough
     *  - whatever
     * 
     */

    console.log("I was promoted to a master.");
});

d.on("demotion", function () {
    /*
     * End all master specific functions or whatever you might like. 
     *
     */

    console.log("I was demoted from being a master.");
});

d.on("added", function (obj) {
    console.log("A new node has been added.");
});

d.on("removed", function (obj) {
    console.log("A node has been removed.");
});

d.on("master", function (obj) {
    /*
     * A new master process has been selected
     * 
     * Things we might want to do:
     *  - Review what the new master is advertising use its services
     *  - Kill all connections to the old master
     */

    console.log("A new master is in control");
});


function countPrimes(data, callback) {
	var kwork = parseInt(data.k);
	var num = data.n;
	var count = data.c;

	if(isNaN(kwork)) {
		return false;
	}

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


countPrimes({c:0,n:0,k:5000}, function(result) {
	my_count = result.c;
	d.advertise({ip: my_index, count: result.c});
});

