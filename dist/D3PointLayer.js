/**
 * Copyright 2016 
 *
 * @author: Alessio Di Lorenzo <alessio.dl@gmail.com>
 * @description: Point layer class with D3 and QuadTree
 * @version: 1.0.2 beta
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

var qtree, lyr_id, styleObject, highlightObject, popupObject;

L.D3PointLayer = L.Layer.extend({
	
	initialize: function (layerConfigObject) {
		
		lyr_id 			= layerConfigObject.layerID;
		styleObject 	= layerConfigObject.symbolizer; 
		highlightObject = layerConfigObject.highlight;
		popupObject 	= layerConfigObject.popup;

   },
   
   addData: function (featureCollection) {
		
		// Load data in qtree structure
		qtree = d3.geom.quadtree(featureCollection.features.map(function (data, i) {
			return {
	    		x: data.geometry.coordinates[0],
	    		y: data.geometry.coordinates[1],
	    		all: data
	    	};
		}));
		
		// Signal that the data is ready
		this.fire('dataLoaded', {data: featureCollection});
   },

   onAdd: function (map) {   
	   	   
	   // Create the SVG group to be filled with data elements
	   g = svg.append("g")
	   		  .attr("class", "leaflet-zoom-hide")
			  .attr("id",lyr_id);
   		
   		updateNodes(qtree);
		
		map.on('moveend', this._moveend, this);
		this._reset();
		this.fire('layerAdded');
   },

   onRemove: function (map) {
	   	SvgGroupID = "g#"+lyr_id+"";
	   	// console.log(SvgGroupID);
	   	d3.select(SvgGroupID).remove();
		this.fire('layerRemoved');
   },
   
   _moveend: function(){
		var mapBounds = map.getBounds();
		var subset = search(qtree, mapBounds.getWest(), mapBounds.getSouth(), mapBounds.getEast(), mapBounds.getNorth());
		redrawSubset(subset);
   },
   
   _reset: function(){
		var mapBounds = map.getBounds();
		var subset = search(qtree, mapBounds.getWest(), mapBounds.getSouth(), mapBounds.getEast(), mapBounds.getNorth());
		redrawSubset(subset);
   }
   
});

//Factory method
L.d3PointLayer = function (layerConfigObject) {
	return new L.D3PointLayer(layerConfigObject);
};


/**
 * Helper functions
 */

MercatorXofLongitude = function (lon) {
	return lon * 20037508.34 / 180;
};

MercatorYofLatitude = function (lat) {
	return (Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;
};

function updateNodes(quadtree) {
	var nodes = [];
	quadtree.depth = 0; // root
	quadtree.visit(function (node, x1, y1, x2, y2) {
		var nodeRect = {
			left: MercatorXofLongitude(x1),
			right: MercatorXofLongitude(x2),
			bottom: MercatorYofLatitude(y1),
			top: MercatorYofLatitude(y2),
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
}

//Find the nodes within the specified rectangle.
function search(quadtree, x0, y0, x3, y3) {
	var pts = [];
	var subPixel = false;
	var subPts = [];
	var scale = getZoomScale();
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
}

function projectPoint(x, y) {
 	var point = map.latLngToLayerPoint(new L.LatLng(y, x));
 	this.stream.point(point.x, point.y);
 }
	
var transform = d3.geo.transform({ point: projectPoint });
var path = d3.geo.path().projection(transform);

function getZoomScale() {
	var mapWidth = map.getSize().x;
	var bounds 	 = map.getBounds();
	var planarWidth = MercatorXofLongitude(bounds.getEast()) - MercatorXofLongitude(bounds.getWest());
	var zoomScale 	= mapWidth / planarWidth;
	return zoomScale;
}

function redrawSubset(subset) {
   	path.pointRadius(styleObject.radius);// * scale);
	
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
	points.attr("d", path);
	/* Configurable style properties: SIMPLE STYLE */
	if (styleObject.type == "Simple") {
		points.style({
			"fill":styleObject.fill,
			"fill-opacity":styleObject.fillOpacity,
			"stroke":styleObject.strokeColor,
			"stroke-width": styleObject.strokeWidth
		});
	/* Configurable style properties: CATEGORIZED SYMBOL STYLE */
	} else if (styleObject.type == "CategorizedSymbols") {
		points.style({
			"fill-opacity":styleObject.fillOpacity,
			"stroke":styleObject.strokeColor,
			"stroke-width": styleObject.strokeWidth
		});
		styleField = styleObject.field;
		styleArray = styleObject.categories;
		colors = []; categories = [];
		styleArray.forEach(function(obj){
			colors.push(obj.color);
			categories.push(obj.value);
		});
		var colorScale = d3.scale.ordinal()
		  .domain(categories)
		  .range(colors);
		points.style("fill",function(d){ return colorScale(d.properties[styleField]); });
		points.style("fill-opacity", styleObject.fillOpacity);
		points.style("stroke",styleObject.strokeColor);
		points.style("stroke-width", styleObject.strokeWidth);
	}
	/* Highlight properties */
	if (highlightObject.active == true) {
	    points.style("cursor","pointer");
	    points.on("mouseover", function(d) {
	  		d3.select(this).style({
	  			"stroke":highlightObject.strokeColor,
				"stroke-width": highlightObject.strokeWidth
	  		});
	    });                  
	    points.on("mouseout", function(d) {
	    	d3.select(this).style({
	    		"stroke":styleObject.strokeColor,
				"stroke-width": styleObject.strokeWidth
	    	});
	    });
	}
    /* Popup */
    if (popupObject.active == true) {
    	points.on("click",function(d){
	    	d3.event.stopPropagation();
	    	// console.log(d.geometry.coordinates[1],d.geometry.coordinates[0]);
	    	var popupTitle = popupObject.template.title; // or... d.properties['ID_OUTBREAK']
	    	attributeArray = popupObject.template.values;
	    	var popupContent = "<h3>"+popupTitle+"</h3>";
	    	attributeArray.forEach(function(obj){
	    		// console.log(obj);
	    		label = obj.label;
	    		fieldName = obj.fieldName;
	    		formatFn = obj.formatFn;
	    		// content
	    		if (formatFn != false){
	    			popupContent += label + ": " +formatFn(d.properties[fieldName])+"<br/>";
	    		} else {
	    			popupContent += label + ": " +d.properties[fieldName]+"<br/>";
	    		}
	    	});
	    	
	    	L.popup()
	    		.setLatLng([d.geometry.coordinates[1],d.geometry.coordinates[0]])
	 			.setContent(popupContent).openOn(map);
	    	
	    });
    }
};
