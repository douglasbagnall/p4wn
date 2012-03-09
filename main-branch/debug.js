// stuff for mere testing, or debug display.


DEBUG=1;

function trace(){
    if (DEBUG){
	for (var z=0;z<arguments.length;z++){
            var az=arguments[z];
	    document.fred.bug.value+=az+"  ";
	}
	document.fred.bug.value+="\n";
    }
}
