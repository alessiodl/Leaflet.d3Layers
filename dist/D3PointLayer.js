/**
 * Copyright 2017 
 *
 * @author: Alessio Di Lorenzo <alessio.dl@gmail.com>
 * @description: Point layer class with D3 and QuadTree
 * @version: 1.2.2 RC
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
L.D3PointLayer = L.Layer.extend({
	
	initialize: function (layerConfigObject) {
		// Layer configuration data
		this._lyrName = layerConfigObject.layerName;
		this._styleObject = layerConfigObject.symbolizer;
		this._highlightObject = layerConfigObject.highlight;
		this._popupObject = layerConfigObject.popup;
	},
   
	addData: function (featureCollection) {
	
		var features = featureCollection.features;
		// Order features
		if (this._styleObject.type == "CategorizedSymbols") {
			var categField = this._styleObject.field;
			var categories = this._styleObject.categories;
			// Sorting array
			categories.forEach(function(cat, i){
				features.forEach(function(feature){
					if (feature.properties[categField] == cat.value){
						// Add a Z-INDEX property to each feature
						feature.properties["Z___INDEX"] = i;
					} 
				});
			});
			// console.log(features);
		};
		
		// Load data in qtree structure
		qtree = d3.geom.quadtree(features.map(function (data, i) {
