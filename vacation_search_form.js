var longitude = false, latitude = false;
$("#zip-code-form").submit(function() {
	$.post(base_url, $(this).serialize(), function(result) {
		if(result && result.status) {
			setLonLat(result.point.latitude, result.point.longitude);
		}
		else {
			alert("There was an error looking up your zip code!");
		}
	}, 'json');
	return false;
});
$("#geolocate-activator").click(function() {
	if(!navigator.geolocation) {
		alert("Your browser needs to be updated to use geolocation.");
		return false;
	}
	navigator.geolocation.getCurrentPosition(function(position) {
		setLonLat(position.coords.latitude, position.coords.longitude);
	});
});
function setLonLat(latitude, longitude) {
	$("input[name='latitude']").val(latitude);
	$("input[name='longitude']").val(longitude);
	globe_illustrator.setPoint(latitude, longitude);
	setDistance();
}
function setDistance() {
	globe_illustrator.setDistanceFromPoint($('input[name="distance"]:checked').val());
}
$('input[name="distance"]').change(setDistance);

$("#language-select").on('change keyup', function () {
    if($(this).val() == "0")
		$(this).addClass("empty");
    else
		$(this).removeClass("empty")
});
$("#language-select").change();

var humidity_levels = ["very dry", "dry", "dry/comfortable", "comfortable", "humid", "muggy", "oppressive"];
$('.echo').each(function() {
	var _this = $(this), which_echo = _this.data('echo-input'), inp = $("#"+which_echo), value;
	function setEcho() {
		if(which_echo == 'humidity_indicator')
			value = humidity_levels[inp.val()];
		else
			value = inp.val() + (which_echo == 'rainfall_inches' ? '"' : "");
		_this.html(value);

	}
	inp.on('mousemove mouseup change', setEcho);
	setEcho();
});
$("#vacation-search-form-submit").click(function() {
	if(!$("input[name='latitude']").val()) {
		$(window).scrollTop(0);
		alert("Please find your location before submitting the form!");
		return false;
	}

// clear previous data:
	$("#vacation-form-result-container").html("");

// Get load screen:
	$("#vacation-form-results-container").fadeIn();
	$("#vacation-form-load-screen").show();
	$(window).scrollTop($("#vacation-form-load-screen").offset().top);

// AJAX request for city data:
	$.post(base_url, {
		form_submitted: 'vacation_search',
		longitude: $("input[name='longitude']").val(),
		latitude: $("input[name='latitude']").val(),
		distance: $('input[name="distance"]:checked').val(),
		language: $("#language-select").val(),
		month: $("#month-select").val(),
		temp_range: $("#temperature-range").val(),
		sunlight_per_day: $("#sunlight_per_day").val(),
		humidity: $("#humidity_indicator").val(),
		rainfall: $("#rainfall_inches").val()
	}, function(result) {
		if(result && result.status) {
			$("#vacation-form-load-screen").fadeOut();

		// Parse city data:
			if(!result.cities.length) {
				$("#vacation-form-result-container").html("No cities were found... it looks like you need to broaden your search criteria!");
				return false;
			}
			result.base_url = base_url;
			result.max_t = 100;
			result.min_t = 0;
			result.max_h = 80;
			result.min_h = 20;
			$("#vacation-form-result-container").html(new EJS({url: base_url+'views/templates/city_list.ejs?fdjk'}).render(result));
		}
	}, 'json');
});


