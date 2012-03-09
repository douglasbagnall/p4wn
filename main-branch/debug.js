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


function parsetest(){
    var z,x,y=500;
    x=new Date();
    for (z=0;z<y;z++){
        parse(board, bmove,ep,0);
    }
    x-=new Date();
    trace ('parse took '+ -x/y +' milliseconds');
}
