$(document).ready(function(){
	setInterval(function(){
 		$.ajax("/map",{
			success: function(data){
				var parsed= $.parseJSON(data);
				var truckA="#660000"; var truckB="#FF9900";

				for(var i=0; i< parsed.length; i++){
					for(var j=0; j<parsed[i].length; j++){

						if(parsed[i][j]!=false){
							var currid=parsed[i][j].id;
							if(parsed[i][j].truck=="A"){

								$("#"+currid).css('background', truckA);
							}
							else if(parsed[i][j].truck=="B"){
								$("#"+currid).css('background', truckB);
							}
							else if(parsed[i][j].truck=="X"&&(currid==1 || currid==2 || currid==3)){
								if(parsed[i][j].count>0){
									$("#"+currid).css('background','yellow');
									$("#"+currid).html("Work placed in this bay. Count: "+parsed[i][j].count);
								}
								else if(parsed[i][j].count==0){
									$("#"+currid).removeAttr('style');
									$("#"+currid).html(currid);
								}
								else{
									$("#"+currid).html("Error: work in negatives");
								}
							}
							else{
								$("#"+currid).removeAttr('style');
							}
						}
					}
				}


			},
			error:function(){console.log("Error occurred")}

		}, 2000);
	}); 
});