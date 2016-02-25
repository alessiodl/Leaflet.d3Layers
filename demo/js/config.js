var global = { 
	mapservice: "http://mapserver.izs.it/public/rest/services/Public/ARBOZOONET/MapServer" 
};

/* Symbolizers */
var outbreakSimple = {
	type:"Simple",
	symbol:'circle', // 'triangle-up', 'triangle-down', 'square', 'cross', 'diamond'
	symbolSize:15,
	fill:"#900C3F",
	fillOpacity:0.75,
	strokeColor:"#FFF",
	strokeWidth:1.5
};

var outbreakCategories = {
	type:"CategorizedSymbols",
	field:"DISEASE",
	fillOpacity:0.75,
	strokeWidth:1.5,
	categories:[
		/** The drawing z-order of each category respects its (reversed) position in the array:
			in this case WND outbreaks will be drawn above SBV, RVF, CCHF.
			This is useful if you need to define priorities among the categories of a layer!
		*/
		{value:"WND", color:"#900C3F", strokeColor:"#FFF", symbol:"circle", symbolSize:10},
		{value:"SBV", color:"#48CB1E", strokeColor:"#FFF", symbol:"circle", symbolSize:15},
		{value:"RVF", color:"#FFC300", strokeColor:"#FFF", symbol:"circle", symbolSize:20},
		{value:"CCHF",color:"#1ECBAF", strokeColor:"#FFF", symbol:"circle", symbolSize:35}
	]
};

/* Info popup Template */
var outbreaksPopupTemplate = {
	title: "Outbreak information",
	values: [
	    {label:"Id",fieldName:"ID_OUTBREAK",formatFn:false},
		{label:"Disease",fieldName:"DISEASE",formatFn:false},
		{label:"Country",fieldName:"COUNTRY",formatFn:false},
		{label:"Source",fieldName:"SOURCE_TYPE_",formatFn:false},
		{label:"Date",fieldName:"DATE_OF_START_OF_THE_EVENT",formatFn:epochToDate}
	]
};

var lyrConfig = {
	// JSON configuration object for Outbreaks
	// ***************************************
	outbreaks: {
		layerId: "0",
		layerName:"Outbreaks",
		symbolizer: outbreakCategories,
		highlight: {
			active:true,
			strokeColor:"#00FFFF",
			strokeWidth:3
		},
		popup: {
			active:true,
			template: outbreaksPopupTemplate
		}
	},
	// JSON configuration object for PIPPO...
	// ***************************************
};