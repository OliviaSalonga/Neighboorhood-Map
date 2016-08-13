var Place = function (data) {
	var self = this;
	
	self.name = data.name;
	self.geometry = data.geometry;
	self.formatted_address = data.formatted_address;
	self.display_phone = data.display_phone;
	self.rating = data.rating;
	self.image_url = data.image_url;
	self.yelpCallSuccess = data.yelpCallSuccess;
	self.marker = data.marker;
};
	
var markers = [];
var locationArea = {lat: 39.1128, lng: -84.5183};  // Cincinnati OH


//declare YELP Info variables
//for the AJAX call
var yelpKey = 'jcGAPQ6FfeYmXVnUi7KAEg';
var yelpToken = 'g1_-uL1p1RYcExnlDTdRKRXNQKcBQV8X';
var yelpKeySecret = 'sgFRCaoqIjnQCwytcET0fMbVl8g';
var yelpTokenSecret = 'uLam9rXlroNyXPQ2-nNI_FU8QzM';
var yelpBaseUrl = 'https://api.yelp.com/v2/search?';


var map;
var service;

// Set request information 
var request = {
	location: locationArea,
	radius: '500',
	query: 'coffee'
};

function googleError() {
	alert('Sorry we seem to have lost our google maps connection');
};

function googleSuccess() {
	// Define map
	map = new google.maps.Map(document.getElementById('map'), {
  		center: locationArea,
  		zoom: 15
	});

	// Define Google map window and service Send 
    service = new google.maps.places.PlacesService(map);

	ko.applyBindings(new viewModel());
};		

function viewModel() {
	var self = this;
	
	this.placeList = ko.observableArray();
	this.currentPlace = ko.observable();	
	this.currentPlaceName = ko.observable();
	this.filterPlace = ko.observable();


	// set info window 
	this.infoWindow = new google.maps.InfoWindow();
	var currentInfoWindow;

	// Send request to Google Maps  
	service.textSearch(request, callback);
	
	// Make map responsive
	google.maps.event.addDomListener(window, "resize", function() {
		var center = map.getCenter();
		google.maps.event.trigger(map, "resize");
		map.setCenter(center); 
	});

	// Filter list of places depending on input
	this.filteredPlace = ko.computed(function () {
		var filter = self.filterPlace();
		if (!filter) {
			return self.placeList();	
		} else {
         	return ko.utils.arrayFilter(self.placeList(), function (place) {
         		if (place.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0) {
         			return place;
         		} else {
         			return false;
         		}
             });
		}
 	}, this);

	// Set marker depending on place selected from list
	this.setCurrentPlace = function(index) {
		self.currentPlace(self.placeList()[index]);
		self.currentPlaceName(self.currentPlace().name);
		closeCurrentWindow();
		if (index < 0) {
			// 'All' is selected, therefore show all markers
			showAllMarkers();
		} else { 
			// Clear all markers and only display selected place
			clearMarkers();
			showMarkerOfSelectedPlace(index);
		}
	};

	// Process Google map response 
	function callback(mapResults, status) {
		
		if (status === google.maps.places.PlacesServiceStatus.OK) {
			
			mapResults.forEach(function(mapResult) {					
				self.placeList.push(new Place(mapResult));
				createMarker(new Place(mapResult));
			}, self);
			// loadPlaceToListOfSelections();
		}
	}

	// Create and display marker to a place
	function createMarker(Place) {
			
		// Define marker for the place
		Place.marker = new google.maps.Marker({
			map: map,    
			title: Place.name,
			clickable: true,
			animation: google.maps.Animation.DROP,
			icon: "http://maps.google.com/mapfiles/kml/shapes/coffee.png",
			position: Place.geometry.location
		});
		
		// Add marker to list of markers
		markers.push(Place.marker);

		// Define what action to do if marker is clicked
		google.maps.event.addListener(Place.marker, 'click', function() {
			
			// Close previous info window
			closeCurrentWindow();
			
			// Call Yelp API, Open info window, set marker settings
			callYelpAndOpenWindow(Place);
			map.setCenter(Place.marker.position);
			Place.marker.setAnimation(google.maps.Animation.BOUNCE);
			setTimeout(function() {
				Place.marker.setAnimation(null);
			}, 1500);
							
		});
	
	}
	
	// Close previous info window
	function closeCurrentWindow() {			
		if (currentInfoWindow) {  
			currentInfoWindow.close();
		}
	}
		  
	// Display marker to selected place
	function showMarkerOfSelectedPlace(index) {
		markers[index].setMap(map);
		map.panTo(markers[index].getPosition());
	}

	// Sets the map on all markers in the array.
	function setMapOnAll(map) {
		for (var i = 0; i < markers.length; i++) {
			markers[i].setMap(map);
		}
	}

	// Removes the markers from the map, but keeps them in the array.
	function clearMarkers() {
		setMapOnAll(null);
	}

	// Shows any markers currently in the array.
	function showAllMarkers() {
		setMapOnAll(map);
		map.panTo(locationArea);
	}

	// Calculate oauth_nonce
	function nonce_generate() {
	  return (Math.floor(Math.random() * 1e12).toString());
	}

	// Call Yelp API and open window 
	// var callYelpAndOpenWindow = function (Place) {	
	function callYelpAndOpenWindow (Place) {	
	
		// Set Yelp API call parameters	
		var parameters = {
			term: Place.name,
			limit: 1, 
			location: Place.formatted_address,
			oauth_consumer_key: yelpKey,
			oauth_token: yelpToken,
			oauth_nonce: nonce_generate(),
			oauth_timestamp: Math.floor(Date.now()/1000),
			oauth_signature_method: 'HMAC-SHA1',
			oauth_version : '1.0',
			callback: 'cb'
		};
		
		var encodedSignature = oauthSignature.generate('GET',yelpBaseUrl, parameters, yelpKeySecret, yelpTokenSecret);
		parameters.oauth_signature = encodedSignature;

		// Other Yelp API call settings	
		var settings = {
			url: yelpBaseUrl,
			data: parameters,
			cache: true,
			dataType: 'jsonp',
			error: function () {
				Place.yelpCallSuccess = false;
				openYelpWindow(Place);
			},
			success: function(yelpResults) {
				//build content string for infowindow
				Place.rating = yelpResults.businesses[0].rating;
				Place.image_url = yelpResults.businesses[0].image_url;
				Place.display_phone = yelpResults.businesses[0].display_phone;	
				Place.yelpCallSuccess = true;
				openYelpWindow(Place);
			}
		};
		
		// Send AJAX query via jQuery library.
		$.ajax(settings);
	}
	
	// Open Yelp Window with place details
	function openYelpWindow(Place) {
		
		// Set window content
		var infoWindowContent;
		if (Place.yelpCallSuccess) {
			infoWindowContent = 
				'<div id="iw-container">'+
					'<div id="iw-body">'+
						'</div>'+
							'<h3 id="iw-title" class="iw-title">' + Place.name + '</h3>'+
							'<div id="iwContent">' + 
								'<h4>Yelp Rating:' + Place.rating + ' </h4>' + 
								'<p>' + Place.display_phone + '</p>' +
								'<p>' + Place.formatted_address + '</p>' +
								'<img class="iw-img" src="' + Place.image_url + '">' +
							'</div>'+
						'</div>' +
					'</div>' +
				'</div>';
		} else {
			infoWindowContent = 
				'<div id="iw-container">'+
					'<div id="iw-body">'+
						'</div>'+
							'<h3 id="iw-title" class="iw-title">' + Place.name + '</h3>'+
							'<div id="iwContent">' + 
								'<p>' + Place.formatted_address + '</p>' +
								'<p>Sorry there is a problem getting the Yelp data for this place :(</p>' +
							'</div>'+
						'</div>' +
					'</div>' +
				'</div>';
			
		} 
		
		//Create the pop up window for each coffee shop
		Place.infoWindow = new google.maps.InfoWindow({
			content: infoWindowContent,
			maxHeight: 150,
			maxWidth: 200
		});
		
		// Open window
		Place.infoWindow.open(map, Place.marker);
		
		// Set current window
		currentInfoWindow = Place.infoWindow;
	}

}