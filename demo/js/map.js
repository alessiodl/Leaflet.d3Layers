var map;

$(document).ready(function(){
	// Create the Map
	map = L.map('map').setView([42, 13.5], 4);
	
	// Create an SVG level on the map
	svg = d3.select(map.getPanes().overlayPane).append("svg");
	
	// Define BaseLayers
	gray 	= L.esri.basemapLayer('Gray');
	dgray 	= L.esri.basemapLayer('DarkGray');
	streets = L.esri.basemapLayer('Streets').addTo(map);
	topo 	= L.esri.basemapLayer('Topographic');
	terrain	= L.esri.basemapLayer('Terrain');
	imagery = L.layerGroup([
	          L.esri.basemapLayer('Imagery'), 
	          L.esri.basemapLayer('ImageryLabels')
	]);

	// Create D3 Layer instance
	var outbreaks = L.d3PointLayer(lyrConfig.outbreaks);
	
	// Query extracting the data
	var query = L.esri.query({url: global.mapservice+"/"+lyrConfig.outbreaks.mapserviceID});
	query.where(" DISEASE <> 'BT' ");
	// Run it!
	query.run(function(error, featureCollection, response){
		numResults = featureCollection.features.length;
	    console.log('Outbreaks caricati:' + numResults);
	    if (numResults >=10001) {
	    	alert(numResults+" punti sono troppi! Che ci devi fare?");
	    	return;
	    } else if (numResults < 1) {
	    	alert("Nessun risultato!");
	    } else {
	    	// Adds the data to the D3 Layer
	    	outbreaks.addData(featureCollection);
	    	// Adds the D3 Layer to the map
	    	outbreaks.addTo(map);
	    }
	}); // -- query.run closed
	
	var baseLayers = {
		"Gray": gray,
		"Dark Gray": dgray,
		"Streets": streets,
		"Topographic": topo,
		"Terrain": terrain,
		"Imagery": imagery
	};

	var overlays = {
		"Outbreaks": outbreaks
		// "Distribution": distribution
	}; 

	L.control.layers(baseLayers, overlays).addTo(map);

});