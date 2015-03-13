$(document).ready(function(){
	setInterval(function(){
		$.ajax("/map",{
			success: function(data){
				var curr=$("#bag").html();
				var parsed=$.parseJSON(data);
				curr="BAG:<br>"+parsed[1][0].id;
				console.log(curr);
				$("#bag").html(curr);
			},

			error:function(){console.log("Error in reading bag data");}
		});
	},2000);
});