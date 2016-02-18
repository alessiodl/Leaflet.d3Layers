/**
 * Copyright 2016 
 *
 * @author: Alessio Di Lorenzo <alessio.dl@gmail.com>
 * @description: Polygon layer class with D3
 * @version: 0.0.1 alpha
 *
 */
 
// Check requirements
if (typeof d3 == "undefined") {
    throw "D3 SVG Overlay for Leaflet requires D3 library loaded first";
}
if (typeof L == "undefined") {
    throw "D3 SVG Overlay for Leaflet requires Leaflet library loaded first";
}

// Class definition
L.D3PolygonLayer = L.Layer.extend({
	
	initialize: function (layerConfigObject) {
		
		lyr_id 			= layerConfigObject.layerID;
		styleObject 	= layerConfigObject.symbolizer; 
		highlightObject = layerConfigObject.highlight;
		popupObject 	= layerConfigObject.popup;

   },
   
   addData: function (featureCollection) {		
		
		// Signal that the data is ready
		this.fire('dataLoaded', {data: featureCollection});
   }
 });
 
 //Factory method
L.d3PolygonLayer = function (layerConfigObject) {
	return new L.D3PolygonLayer(layerConfigObject);
};