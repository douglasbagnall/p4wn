// stuff for mere testing, or debug display.

function debug(){
	for (var z=0;z<arguments.length;z++){
		var az=arguments[z]
		d.fred.bug.value+=az+"  "
	}
	d.fred.bug.value+="\n"
}


function parsetest(){
	var z,x,y=500
	x=new Date()
	for (z=0;z<y;z++){
		parse(bmove,ep,0)
	}
	x-=new Date()
	debug ('parse took '+ -x/y +' milliseconds')
}

