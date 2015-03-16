$(document).ready(function(){

	$(this).click(function(event) {
		var placework= event.target.id;
		if((placework==1 && bay1)|| (placework==2 && bay2)|| (placework==3 && bay3)){

			$("#"+placework).css('background','yellow'); 
			var curr= $("#bag").html();
			curr+="<br> Worked added to "+placework;
			console.log(curr); 
			$("#bag").html(curr);
			$.post("/bay", {id:placework}, {
                success: function(data){

                console.log("Bay click sent sucessfully");
            },

            error:function(){console.log("Error in sending bay data");
        }}); 
		}
		if(placework=="S1" || placework=="S2"|| placework=="S3"){
			var sensor= placework.substr(placework.length -1);
			var formdata = {id:sensor};
			$.ajax({url : "/readsensor",
    				type: "POST",
    				data : formdata,
			success: function(data){

				var parsed=$.parseJSON(data);
				alert("Sensor value: "+parsed.value);

			},

			error:function(){console.log("Error in reading bag data");}
		});
		}
		var bay= placework.substr(placework.length -1);
		if(placework=="Shut1"){
			
			if(bay1){
				bay1=false;
				shutbay(bay);
				
			}
			else{

				bay1=true;
				reopenbay(bay);
			}
		} else if( placework=="Shut2"){
			
			if(bay2){
				bay2=false;
				shutbay(bay);
			}
			else{
				bay2=true;
				reopenbay(bay);
			}
		} else if (placework=="Shut3"){

			if(bay3){
				bay3=false;
				shutbay(bay);
			}
			else{
				bay3=true;
				reopenbay(bay);
			}

		}
	});
});