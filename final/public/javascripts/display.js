function checkcount(counter, currid){
	if(counter>0){

				$("#"+currid).css('background','yellow');
				}
				else if(counter==0){
					$("#"+currid).removeAttr('style');
					$("#"+currid).html(currid);
				}
				else{
					$("#"+currid).html("Error: work in negatives");
				}
}

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
							else if(parsed[i][j].truck=="X"){
								if(currid==1 && bay1){
									checkcount(parsed[i][j].count, currid);
								} else if (currid==2 && bay2){
									checkcount(parsed[i][j].count, currid);

								} else if (currid==3 && bay3){ 
									checkcount(parsed[i][j].count, currid);

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

		});
	}, 2000); 
});