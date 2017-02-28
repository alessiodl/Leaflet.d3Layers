/**
 * Copyright 2017 
 *
 * @author: Alessio Di Lorenzo <alessio.dl@gmail.com>
 * @description: Point layer class with D3 quadTree
 * @version: 1.3
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
   
	addData: function (featureCollection,queryString) {
	
		var features = featureCollection.features;
		// The query parameter is used in server-side identify
		this._query  = queryString;

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
			
			return {
	    		x: data.geometry.coordinates[0],
	    		y: data.geometry.coordinates[1],
	    		all: data
	    	};
		}));
		
		// Update quadtree nodes
		this._updateNodes(qtree);
		
		// Signal that the data is ready
		this.fire('dataLoaded', {data: featureCollection});
	},
	
	_MercatorXofLongitude: function (lon) {
		return lon * 20037508.34 / 180;
	},
	
	_MercatorYofLatitude: function (lat) {
		return (Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;
	},
	
	_getZoomScale: function () {
		var mapWidth = map.getSize().x;
		var bounds 	 = map.getBounds();
		var planarWidth = this._MercatorXofLongitude(bounds.getEast()) - this._MercatorXofLongitude(bounds.getWest());
		var zoomScale 	= mapWidth / planarWidth;
		return zoomScale;
	},
	
	_projectPoint: function (x, y) {
		var point = map.latLngToLayerPoint(new L.LatLng(y, x));
		this.stream.point(point.x, point.y);
	},
	
	_updateNodes: function (quadtree) {
		var nodes = [];
		quadtree.depth = 0; // root
		quadtree.visit(function (node, x1, y1, x2, y2) {
			var MercatorX = function (lon) { return lon * 20037508.34 / 180; }
			var MercatorY = function (lat) { return (Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180; }
			var nodeRect = {
				left: MercatorX(x1),
				right: MercatorX(x2),
				bottom: MercatorY(y1),
				top: MercatorY(y2)
			};
			node.width = (nodeRect.right - nodeRect.left);
			node.height = (nodeRect.top - nodeRect.bottom);
			if (node.depth == 0) {
				// console.log("width: " + node.width + "; height: " + node.height);
			}
			nodes.push(node);
			for (var i = 0; i < 4; i++) {
				if (node.nodes[i]) node.nodes[i].depth = node.depth + 1;
			}
		});
		return nodes;
	},
   
	_search: function (quadtree, x0, y0, x3, y3) {
		//Find the nodes within the specified rectangle
		var pts = [];
		var subPixel = false;
		var subPts = [];
		var scale = this._getZoomScale();
		var counter = 0;
		quadtree.visit(function (node, x1, y1, x2, y2) {
		   var p = node.point;
		   var pwidth = node.width * scale;
		   var pheight = node.height * scale;
		   //-- if this is too small rectangle only count the branch and set opacity
		   if ((pwidth * pheight) <= 1) {
			   // start collecting sub Pixel points
			   subPixel = true;
		   }
		   // -- jumped to super node large than 1 pixel
		   else {
			   // end collecting sub Pixel points
			   if (subPixel && subPts && subPts.length > 0) {
				   subPts[0].group = subPts.length;
				   pts.push(subPts[0]); // add only one todo calculate intensity
				   counter += subPts.length - 1;
				   subPts = [];
				}
				subPixel = false;
			}

			if ((p) && (p.x >= x0) && (p.x < x3) && (p.y >= y0) && (p.y < y3)) {

				if (subPixel) {
					subPts.push(p.all);
				} else {
					if (p.all.group) {
						delete (p.all.group);
					}
					pts.push(p.all);
				}
			}
			// if quad rect is outside of the search rect do nto search in sub nodes (returns true)
			return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
		});
		// console.log(" Number of removed  points: " + counter);
		return pts;
	},
	
	_redrawSubset: function (subset) {
	
		if (this._styleObject.type == "CategorizedSymbols") {
			subset.sort(function(a,b){
				return parseInt(a.properties["Z___INDEX"]) - parseInt(b.properties["Z___INDEX"]);
			}).reverse();
		}
		
		var transform = d3.geo.transform({ point: this._projectPoint });
		var path = d3.geo.path().projection(transform);
	
		var buffer_space = 200; // To fully drawn point markers
		var bounds = path.bounds({ type: "FeatureCollection", features: subset });
		var topLeft = bounds[0], bottomRight = bounds[1];
     
		topLeft[0] -= buffer_space;
		topLeft[1] -= buffer_space;
		bottomRight[0] += buffer_space;
		bottomRight[1] += buffer_space;

		svg.attr("width", bottomRight[0] - topLeft[0])
		   .attr("height", bottomRight[1] - topLeft[1])
   	       .style("left", topLeft[0] + "px")
		   .style("top", topLeft[1] + "px");

		g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

		var points = g.selectAll("path").data(subset, function (d) {
			return d.id;
		});
		points.enter().append("path");
		points.exit().remove();
		/* Configurable SVG symbol: SIMPLE STYLE */
		if (this._styleObject.type == "Simple") {
			var pointSymbol = d3.svg.symbol().type(this._styleObject.symbol).size(this._styleObject.symbolSize*10);
			points.attr("d", pointSymbol);
		/* Configurable SVG symbol: CATEGORIZED SYMBOL STYLE */
		} else if (this._styleObject.type == "CategorizedSymbols") {
			var style = this._styleObject;
			var styleField = this._styleObject.field;
			var styleArray = this._styleObject.categories;
			var symbols = []; var symbolSizes=[]; var categories = [];
			styleArray.forEach(function(obj){
				symbols.push(obj.symbol);
				symbolSizes.push(obj.symbolSize*10);
				categories.push(obj.value);
			});
			points.attr("d", d3.svg.symbol()
				.size(function(d){ 
					var symbolSizeScale = d3.scale.ordinal()
						.domain(categories)
						.range(symbolSizes);
					return symbolSizeScale(d.properties[styleField]); 
				})
				.type(function(d){ 
					var symbolScale = d3.scale.ordinal()
						.domain(categories)
						.range(symbols);
					return symbolScale(d.properties[styleField]);
				})
			);
		}
		points.attr("transform", function(d) {
			var latlng = L.latLng(d.geometry.coordinates[1],d.geometry.coordinates[0])
			return "translate(" + 
				map.latLngToLayerPoint(latlng).x+","+map.latLngToLayerPoint(latlng).y
			+ ")"; 
		});
		
		/* Configurable style properties: SIMPLE STYLE */
		if (this._styleObject.type == "Simple") {
			points.style({
				"fill":this._styleObject.fill,
				"fill-opacity":this._styleObject.fillOpacity,
				"stroke":this._styleObject.strokeColor,
				"stroke-width":this._styleObject.strokeWidth,
				"pointer-events": "visible"
			});
		/* Configurable style properties: CATEGORIZED SYMBOL STYLE */
		} else if (this._styleObject.type == "CategorizedSymbols") {
			points.style({
				"fill-opacity":this._styleObject.fillOpacity,
				"stroke-width":this._styleObject.strokeWidth,
				"pointer-events": "visible"
			});
			var styleField = this._styleObject.field;
			var styleArray = this._styleObject.categories;
			var colors = []; var strokeColors=[]; var categories = [];
			styleArray.forEach(function(obj){
				colors.push(obj.color);
				strokeColors.push(obj.strokeColor);
				categories.push(obj.value);
			});
			var colorScale = d3.scale.ordinal()
				.domain(categories)
				.range(colors);
			var strokeColorScale = d3.scale.ordinal()
				.domain(categories)
				.range(strokeColors);
			points.style("fill", function(d){ return colorScale(d.properties[styleField]); });
			points.style("fill-opacity", this._styleObject.fillOpacity);
			points.style("stroke", function(d){ return strokeColorScale(d.properties[styleField]); });
			points.style("stroke-width", this._styleObject.strokeWidth);
		}
		/* Highlight properties */
		if (this._highlightObject.active == true) {
			var highlight = this._highlightObject;
			var style = this._styleObject;
			points.style("cursor","pointer");
			points.on("mouseover", function(d) {
				d3.select(this).style({
					"stroke": highlight.strokeColor,
					"stroke-width": highlight.strokeWidth
				});
			});      
			points.on("mouseout", function(d) {
				if (style.type == "Simple") {
					d3.select(this).style({
						"stroke":style.strokeColor,
						"stroke-width": style.strokeWidth
					});
				} else if (style.type == "CategorizedSymbols") {
					d3.select(this).style("stroke",function(d){ return strokeColorScale(d.properties[styleField]); });
					d3.select(this).style("stroke-width",style.strokeWidth);
				}
			});
		}
		/* Popup */
		if ((this._popupObject.active == true) && (this._popupObject.method == "client")) {
			var popup = this._popupObject;
			points.on("click",function(d){
				d3.event.stopPropagation();
				// console.log(d.geometry.coordinates[1],d.geometry.coordinates[0]);
				var popupTitle = popup.template.title; // or... d.properties['ID_OUTBREAK']
				var attributeArray = popup.template.values;
				var popupContent = "<p><strong>"+popupTitle+"</strong></p>";
				popupContent += "<table class='table table-condensed table-striped'>";
				attributeArray.forEach(function(obj){
					// console.log(obj);
					label = obj.label;
					fieldName = obj.fieldName;
					formatFn = obj.formatFn;
					// content table
					if (formatFn != false){
						popupContent += "<tr><td>"+label + "</td><td>" +formatFn(d.properties[fieldName])+"</td></tr>";
					} else {
						popupContent += "<tr><td>"+label + "</td><td>" +d.properties[fieldName]+"</td></tr>";
					}
				});
				popupContent += "</table>";
				
				L.popup()
					.setLatLng([d.geometry.coordinates[1],d.geometry.coordinates[0]])
					.setContent(popupContent).openOn(map);
				
			});
		} else if ((this._popupObject.active == true) && (this._popupObject.method == "server")) {
			var popup = this._popupObject;
			var query = this._query;
			points.on("click",function(d){
				d3.event.stopPropagation();
				// console.log(d.geometry.coordinates[1],d.geometry.coordinates[0]);
				// Map Bounds
				var xmin = map.getBounds()._southWest.lng;
				var ymin = map.getBounds()._southWest.lat;
				var xmax = map.getBounds()._northEast.lng;
				var ymax = map.getBounds()._northEast.lat;
				var mapExtent = xmin+","+ymin+","+xmax+","+ymax
				console.log(mapExtent);
				// Server identify
				$.ajax({ 
					url: popup.url+"/identify", 
					dataType:"jsonp",
					data: { 
						"geometry": '{x:'+d.geometry.coordinates[0]+',y:'+d.geometry.coordinates[1]+'}',
						"geometryType":"esriGeometryPoint",
						"sr": 4326,
						"maxAllowableOffset": 0.1,
						"layers": "all:"+popup.layerId,
						"layerDefs": popup.layerId+":"+query, 
						"tolerance": popup.tolerance,
						"mapExtent": '"'+mapExtent+'"',
						"imageDisplay":"400,300,96",
						"f": "json" 
					}, 
					success: function( data ) {
						console.log( data );
						// TO DO: Open a paginated popup 
					}
				});
			});
		}
	},

	onAdd: function (map) {   
		// Create the SVG group to be filled with data elements
		g = svg.append("g")
	   		  .attr("class", "leaflet-zoom-hide")
			  .attr("id",this._lyrName);
		
		map.on('moveend', this._viewreset, this);
		this._viewreset();
		this.fire('layerAdded');
	},

	onRemove: function (map) {
	   	SvgGroupID = "g#"+this._lyrName+"";
	   	// console.log(SvgGroupID);
	   	d3.select(SvgGroupID).remove();
		this.fire('layerRemoved');
	},
   
	_viewreset: function() {
		var mapBounds = map.getBounds();
		var subset = this._search(qtree, mapBounds.getWest(), mapBounds.getSouth(), mapBounds.getEast(), mapBounds.getNorth());
		this._redrawSubset(subset);
	},
   
});

//Factory method
L.d3PointLayer = function (layerConfigObject) {
	return new L.D3PointLayer(layerConfigObject);
};
