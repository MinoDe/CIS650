$(document).ready(function(){

	    
    $(this).click(function(event) {
        var placework= event.target.id;
        if(placework==1 || placework==2 || placework==3){
        $("#"+placework).css('background','yellow');
        $("#"+placework).html("Work placed in this bay");  
        $.post("/bay", {id:placework}); 
    }
    });
});