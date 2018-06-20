var googleKey = "googlekey";
var sgGovKey = "sggovkey ";
var parkStops = [
	{stopTitle: "Sengkang Sports Centre", location: {lat:1.396499, lng:103.886805}},
	{stopTitle: "Sengkang Riverside Park", location: {lat:1.398268, lng:103.884155}},
	{stopTitle: "Punggol Point Park", location: {lat:1.420953, lng:103.911695}},
	{stopTitle: "Pulau Serangoon (Coney Island)", location: {lat:1.40893, lng:103.921899}},
	{stopTitle: "Uber Sports @ Punggol Sports Hub", location: {lat:1.392294, lng:103.916384}},
	{stopTitle: "Punggol Park", location: {lat:1.378083, lng:103.897083}},
	{stopTitle: "Sunrise Gateway", location: {lat:1.397657, lng:103.921781}},
	{stopTitle: "Buangkok Sports Park", location: {lat:1.38262, lng:103.879402}},
	{stopTitle: "Punggol Waterway Park", location: {lat:1.40977, lng:103.904703}},
	{stopTitle: "Sengkang Neighborhood Park", location: {lat:1.38492, lng:103.904448}}
	
];
var ajaxData = [{shopName: "test"}];

var storeMarkerArr = [];

var parkLocations = function(data) {
	this.locationName = data.stopTitle;
	this.locationLatLng = data.location;
};


var ViewModel = function() {
	var self = this;
	self.filterQuery = ko.observable('');
	self.currentLoc = ko.observable('');
	self.parkLocationsArray = ko.observableArray([]);
	self.nearbyFoodArray = ko.observableArray([]);
	self.justANearbyTitle = ko.observable('');
	self.justADiv = ko.observable('');
	self.toggleClassToOpen = ko.observable(false);
	//List array to store all items in the Model
	listArray = [];
	shopArray = [];
	
	for (var i=0; i < parkStops.length; i++) {
		self.parkLocationsArray.push(parkStops[i]);
		listArray.push(parkStops[i]);
	}
	//variable for query search
	self.updateList = function(self) {
		var queryVal = self.filterQuery();
		//clear observable array
		self.parkLocationsArray.removeAll();
		//Regexp to be used for matching query to location Name
		var reg = new RegExp(queryVal, 'gi');
		//add locations to observableArray that match the query string
		for (var i=0; i < listArray.length; i++) {
			var locName = listArray[i].stopTitle;
			var result = locName.match(reg);
			if (result != null) {
				self.parkLocationsArray.push(parkStops[i]);
			}
		}

		//Update the Markers during filter
		updateMarkersOnFilter(self.parkLocationsArray);
		//reset the ko.obervable array for
		self.justANearbyTitle('');
		self.justADiv('');
		self.nearbyFoodArray.removeAll();
		self.currentLoc('');
		clearStoreMarker();
		
		
	}
	//This function gets the API in foursquare
	self.showNearbyShops = function() {
		self.justANearbyTitle(null);
		self.justADiv(null);
		//Update Marker in map
		self.currentLoc(new parkLocations(this));
		singlePointMarker(self.currentLoc);
		//reinitialize observable for nearbyFoodArray
		self.nearbyFoodArray.removeAll();
		var apiLat = self.currentLoc().locationLatLng.lat;
		var apiLng = self.currentLoc().locationLatLng.lng;
		self.justANearbyTitle("<h3 class='prepend-class'>Nearby Food Stops</h3>");
		self.justADiv("<div class='div-border prepend-class'></div>");

		$.ajax({
			method: "GET",
			url: 'https://api.foursquare.com/v2/venues/search',
			data: { ll: apiLat+','+apiLng,
			categoryId: '4d4b7105d754a06374d81259',
			radius: 500,
			client_id: 'foursquare clientid',
			client_secret: 'foursquare client secret',
			limit: 10,
			v: 20170126
			},
			success: function(data){
				//push required api data to observable array to be used later
				if (data.response.venues.length === 0) {
					alert('No food shops found nearby in this location');
				}
				else {
					for (var i = 0; i < 10; i++) {
						//Added sanity checks for response
						var foodShopObj = {};
						var addressLen = data.response.venues[i].location.formattedAddress.length;
						data.response.venues[i].name ? foodShopObj["shopName"] = data.response.venues[i].name : "Shop Name not provided";
						foodShopObj["lat"] = data.response.venues[i].location.labeledLatLngs[0].lat;
						foodShopObj["lng"] = data.response.venues[i].location.labeledLatLngs[0].lng;
						foodShopObj["address"] = [];
						if (addressLen === 0) {
							foodShopObj["Foursquare"].push("Address Not Provided");
						}
						else {
							for (var n = 0; n < addressLen; n++) {
								foodShopObj["address"].push(data.response.venues[i].location.formattedAddress[n]);
							}
						}
						data.response.venues[i].location.distance ? foodShopObj["distance"] = data.response.venues[i].location.distance : "Distance not provided";
						self.nearbyFoodArray.push(foodShopObj);
					}
				}
			},
			error: function() {
				alert('foursquare data not loaded');
			}
		});

	}
	//this function sets up the marker and infowindow of the food shop selected
	self.displayShopDetails = function() {
		var locObj = {};
		locObj.lat = this.lat;
		locObj.lng = this.lng;
		var addressArr = this.address;
		var dist = this.distance;
		clearStoreMarker();
		//reinitialize array
		storeMarkerArr = [];
		//create info window for shop
		var shopInfowindow = new google.maps.InfoWindow();
		//create marker for the shop selected
		storeMarker = new google.maps.Marker({
					position: locObj,
					title: this.shopName,
					animation: google.maps.Animation.DROP,
					icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
				});

		//create listener for the shop marker
		storeMarker.addListener('click', function() {
				if (shopInfowindow.storeMarker == this) {
					console.log(storeMarker.id);
				}
				else {
					getStoreDetails(this, shopInfowindow, addressArr, dist);
				}
			
			});

		//set marker to map
		storeMarker.setMap(map);
		//add this to storeMarkerArr
		storeMarkerArr.push(storeMarker);
		toggleBounce(storeMarker);
	}

	self.openMenu = function() {
		self.toggleClassToOpen(!self.toggleClassToOpen());
	}
};



var InitMap = function() {
	ko.applyBindings(new ViewModel());
	//Load Map (default Location is 1st array element) and Mrt Transit map
	//console.log(parkStops[0].location);
	map = new google.maps.Map(document.getElementById('map'), {
		  center: {lat: 1.398644, lng: 103.899164},
		  zoom: 13
		});

	var mrtTransit = new google.maps.TransitLayer();
	mrtTransit.setMap(map);

	//Add all Markers
	markersArray = [];
	bouncingMarkers = [];
	for (var i=0; i < parkStops.length; i++) {
	  var runningPosition = parkStops[i].location;
	  var stopName = parkStops[i].stopTitle;
	  //console.log(runningPosition);
	  marker = new google.maps.Marker({
		position: runningPosition,
		title: stopName,
		animation: google.maps.Animation.DROP,
		id: i
	  });

	  	//google info window
	  	var infowindow = new google.maps.InfoWindow();
		//click listener
		marker.addListener('click', function() {
			toggleBounce(this);

			if (infowindow.marker == this) {
				
			}
			else {
				getPlacesDetails(this, infowindow);
			}
			
		});
		markersArray.push(marker);
	}

	for (var i = 0; i < markersArray.length; i++) {
		markersArray[i].setMap(map);
	}

	
}

//This function will animate the marker to bounce everytime it is clicked
function toggleBounce(marker) {
	if (bouncingMarkers.length !== 0) {
		bouncingMarkers.push(marker);
		bouncingMarkers[0].setAnimation(null);
		bouncingMarkers.shift();
		bouncingMarkers[0].setAnimation(google.maps.Animation.BOUNCE);
	}
	else {
		bouncingMarkers.push(marker);
		bouncingMarkers[0].setAnimation(google.maps.Animation.BOUNCE);
	}
	
	
}

//This function is called once user entered a string in the input box and it will filter the list
function updateMarkersOnFilter(locData) {
	//Hide all markers in array
	for (var i = 0; i < markersArray.length; i++) {
		//console.log(markersArray[i]);
		markersArray[i].setMap(null);
	}
	//search the filtered list items in markersArray
	//Set markers of the new filtered list to visible
	for (var n = 0; n < locData().length; n++) {
		var markerInArray = $.grep(markersArray, function(e){ 
			return e.title === locData()[n].stopTitle;
		});
		markerInArray[0].setMap(map);
		
	}
	//setup initial view of map
	map.setCenter({lat: 1.398644, lng: 103.899164});
	map.setZoom(13);


}


//This function is called when an item in the list of place is clicked.
function singlePointMarker(singleMarker) {
	//console.log(singleMarker().locationName());
	var singleLocPosition = singleMarker().locationLatLng;
	//var singleLocName = singleMarker().locationName();
	//informationWindow = new google.maps.InfoWindow();

	//Hide all park place markers in array
	for (var i = 0; i < markersArray.length; i++) {
		markersArray[i].setMap(null);
	}
	
	clearStoreMarker();

	//show the single marker
	var markerInArray = $.grep(markersArray, function(e){ 
		return e.title === singleMarker().locationName;
	});
	markerInArray[0].setMap(map);
	toggleBounce(markerInArray[0]);
	map.setCenter(singleLocPosition);
	map.setZoom(15);
}



//This function is called when the green marker in the map is clicked.
//This will display the food shop info.
function getStoreDetails(marker, infowindow, locObj, meters) {
	var addressLen = locObj.length;
	var storeHTML = "<h5 class=infowindow-store>"+marker.title+"</h5>";
	for (var n=0; n < addressLen; n++) {
		storeHTML += "<p class=infowindow-store>"+locObj[n]+"</p>";
	}
	storeHTML += "<p class=infowindow-store>Distance (meters): "+meters+"</p>";
	infowindow.setContent(storeHTML);
	infowindow.open(map, marker);
}

//This function is called by clicking markers on the map.
//Info window will show a custom static map and streetview image.
function getPlacesDetails(marker, infoWindow) {
	var apiLat = marker.position.lat();
	var apiLng = marker.position.lng();
	var titleName = marker.title;
	var streetViewLink = "https://maps.googleapis.com/maps/api/streetview?size=100x100&location="+ apiLat +","+ apiLng +"&heading=235&pitch=10&key="+ googleKey +"";
	var staticMap = "https://maps.googleapis.com/maps/api/staticmap?center="+apiLat+","+apiLng+"&zoom=15&markers=color:blue%7Clabel:S%7C"+apiLat+","+apiLng+"&size=100x100&maptype=hybrid&key="+googleKey+"";
	var innerHTML = "<h5 class=infowindow-h5>"+ titleName +"</h5>";
	//Api call to singapore gov environment data
	//GET the weather forecast
	$.ajax({
		url: 'https://api.data.gov.sg/v1/environment/2-hour-weather-forecast',
		beforeSend: function(xhr) {
			 xhr.setRequestHeader("api-key", sgGovKey)
		 },
		success: function(data) {
			var forecast = data.items[0].forecasts[33].forecast;
			innerHTML += "<p class='weather-class'>Forecast:"+ forecast +"</p>";
			infoWindow.setContent(innerHTML);
		},
		error: function() {
			alert("No weather info retrieved");
		}
	});
	//GET the Humidity and Temperature
	$.ajax({
		url: 'https://api.data.gov.sg/v1/environment/24-hour-weather-forecast',
		beforeSend: function(xhr) {
			 xhr.setRequestHeader("api-key", sgGovKey)
		 },
		success: function(data){
			var humidityHigh = data.items[0].general.relative_humidity.high;
			var humidityLow = data.items[0].general.relative_humidity.low;
			var tempHigh = data.items[0].general.temperature.high;
			var tempLow = data.items[0].general.temperature.low;
			innerHTML += "<p class='weather-class'>Humidity High:"+ humidityHigh +" Low: "+humidityLow+"</p>";
			innerHTML += "<p class='weather-class'>Temp(C) High:"+ tempHigh +" Low: "+tempLow+"</p>";
			infoWindow.setContent(innerHTML);
			//GET the Pollution Standard Index every 3 hours
			$.ajax({
				url: 'https://api.data.gov.sg/v1/environment/psi',
				beforeSend: function(xhr) {
					 xhr.setRequestHeader("api-key", sgGovKey)
				 }, 
				success: function(data){
					//console.log(data);
					var psiRead = data.items[0].readings.psi_three_hourly.east;
					innerHTML += "<p class='weather-class'>PSI:"+ psiRead +"</p>";
					infoWindow.setContent(innerHTML);
				},
				error: function() {
					alert("No PSI info retrieved");
				}
			});
		},
		error: function() {
			alert("No Temperature and Humidity info retrieved");
		}
	});


	innerHTML += "<img src = "+streetViewLink+ "></img>";
	infoWindow.open(map, marker);
}


function clearStoreMarker() {
	//remove the previous store marker
	if (storeMarkerArr.length !== 0) {
		storeMarkerArr[0].setMap(null);
	}
}

function mapError() { 
	alert("There is a problem with loading google maps")
}
