// stuff for mere testing, or debug display.

function debug(){
	for (var z=0;z<arguments.length;z++){
		var az=arguments[z]
		d.FF.bug.value+=az+"  "
	}
	d.FF.bug.value+="\n"
}

