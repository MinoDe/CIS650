$(document).ready(function(){
	setInterval(function(){
		$.ajax("/map",{
			success: function(data){
				
			},

			error:function(){console.log("Error in reading bag data");}
		});
	},2000);
});