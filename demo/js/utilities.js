/**
 * Formatter functions for the popup templates
 */
function epochToDate(arg) {
	// Epoch Milliseconds to UTC
	utcDate = new Date(arg);
	// UTC to DD/MM/YYYY
	var day   = utcDate.getUTCDate();
    var month = utcDate.getUTCMonth()+1;
    var year  = utcDate.getUTCFullYear();
    var dmy = day+"/"+month+"/"+year;
    if (dmy == "1/1/1970"){
        return " - ";
    } else {
        return dmy;
    }
};