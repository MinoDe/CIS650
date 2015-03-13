$(document).ready(function(){


	$(this).click(function(event) {
		var placework= event.target.id;
		if(placework==1 || placework==2 || placework==3){

			$("#"+placework).css('background','yellow');
			//$("#"+placework).html("Work placed in this bay"); 
			var curr= $("#bag").html();
			curr+="<br> Worked added to "+placework;
			console.log(curr); 
			$("#bag").html(curr);
			$.post("/bay", {id:placework}); 
		}
		if(placework=="S1" || placework=="S2"|| placework=="S3"){
			console.log("Reading "+placework);
		}

		if(placework=="Shut1" || placework=="Shut2"|| placework=="Shut3"){

		var elem= placework.substr(placework.length -1);
		console.log("Elem: "+elem);
		/*var audioElement = document.createElement('audio');
        audioElement.setAttribute('src', 'http://soundbible.com/mp3/Warning Siren-SoundBible.com-898272278.mp3');
        audioElement.setAttribute('autoplay', 'autoplay');

        $.get();

        audioElement.addEventListener("load", function() {
            audioElement.play();
        }, true);

        audioElement.play();*/
        $("#"+elem).unbind('click');
        $("#img"+elem).css("display","block");
        console.log("Shutting "+placework);

        
		}
	});
});