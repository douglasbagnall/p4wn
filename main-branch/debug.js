// stuff for mere testing, or debug display.


debug=1;

function trace(){
    if (debug){
	for (var z=0;z<arguments.length;z++){
            var az=arguments[z]
	    d.fred.bug.value+=az+"  "
	}
	d.fred.bug.value+="\n"
    }
}


function parsetest(){
    var z,x,y=500
    x=new Date()
    for (z=0;z<y;z++){
        parse(bmove,ep,0)
    }
    x-=new Date()
    trace ('parse took '+ -x/y +' milliseconds')
}

function loadposition(){
    board=[16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,0,13,0,0,0,0,0,0,16,16,0,0,0,0,0,0,0,0,16,16,0,0,0,0,0,0,0,0,16,16,0,0,0,0,10,9,0,0,16,16,0,0,0,0,0,0,0,0,16,16,0,0,0,6,0,0,0,0,16,16,0,14,0,0,0,0,0,0,16,16,0,0,0,0,0,0,0,0,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,0];
    castle=[0,0];
    ep=0;
    refresh(0);
}
