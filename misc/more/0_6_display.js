


A=E=d.all;
if (!E)event=0; //else errors in onmouseover.
DOM=d.getElementsByTagName || null;
if (DOM||E){
  d.write("<img src=0.gif id=pih name=pih width=20 height=32>");
  A= (E||d.getElementsByTagName("img"));
  itch=A["pih"].style;
}






//*************************************** macro-control

function B(it){ //it is clicked square
    var a,z,p
 //   it=player?119-it:it
    a=board[it]
    //alert(player)
    //if(!a&&!inhand) return
	if (ss==it && inhand){   //ss is global, for starting place of moving piece.
		Bim('pih',0)         //this bit replaces a piece if you click on the square it came from.
		Bim(ss,inhand,1)
		inhand=0;
		return
	}
    if (a&&(bmove==(a&8))){     //ie, if one picked up of right colour, it becomes start
        if (inhand) Bim(ss,inhand,1) //put back old piece, if any
        inhand=a
        ss=it
        Bim(ss,0,1)     //not real shift, but blank start
        Bim('pih',a)     //dragging piece
        if(E)drag()      //puts in right place
        d.onmousemove=drag;  //link in hand image to mouse
    	return
    }

    if (inhand){      //now, here seems to be doing parsing, when the if move should do it.
		bubbit('trying '+ss+' '+it)
		if(move(ss,it,d.fred.hob.selectedIndex,y)){
			Bim('pih',0); //blank moving gif
			d.onmousemove=null;         //and switch off mousemove.
			if(A) itch.top=itch.left='400px'//flick moving img off board
			inhand=0;
		}
    }
}

//B1 is auto
Btime=0
function B1(){
    if(findmove()){          //do other colour
	Btime=setTimeout("B2()",500)
    }
    else{ going=0}
}
function B2(){
	if (going || player!=bmove){
		clearTimeout(Btime);
		B1();
	}
}




//*******************************shift & display

function shift(s,e){
    var a=board[s]
    board[e]=a
    board[s]=0
    Bim(s,0,1)
    Bim(e,a,1)
}

function display2(s,e,a,b,c){
    var z,x=s%10,y=(s-x)/10,tx=e%10,ty=(e-tx)/10,mn=1+(moveno>>1)
    d.fred.bib.value+="\n"+(bmove?'    ':(mn<10?" ":"")+mn+". ")+lttrs.charAt(x-1)+(y-1)+(b?'x':'-')+lttrs.charAt(tx-1)+(ty-1)+(c?'+':' ')+'  '+a+prunees
}


function flash(mv){
    

}





//*******************************************redraw screen from board

function refresh(bd,bw){
	player=bw
	for (var z=0;z<120;z++){
		screenboard[z]=(z)
		if(bd[z]<16)Bim(screenboard[z],bd[z],1)
	}
//	alert (bd)
// in real game, if bmove!=player, give computer the turn
}


function goback(x){
	if (x>moveno)return
	moveno-=x
	var b=boardheap[moveno]
	//alert(b)
	board=eval("["+b[0]+"]")
	castle=eval("["+b[1]+"]")
	ep=b[2]
	M1=b[3]
	M1=b[4]
	M1=b[5]
	bmove=moveno%2
	refresh(board,bmove)
}

//*********************************************drag piece
var px="px";
function drag(e) {
	e=e||event //MSIE uses "event" magical variable, netscapes magically populate 1st argument (e)
	itch.left=(e.clientX+1)+px;
	itch.top=(e.clientY-4)+px;
}

function Bim(img,src,swap){
	if (A || img!='pih'){
		if (swap){img="i"+(player?119-img:img)}
	    d.images[img].src=src+'.gif'
	}
}






//*********************************************final write,etc

html='<table cellpadding=4>'
for (y=90;y>10;y-=10){
	html+="<tr>"
    for(x=0;x<10;x++){
        z=y+x
        if(x&&x<9){
            html+=('<td class=' + ((x+(y/10))&1?'b':'w') + '><a href="#" onclick="B(player?119-'+z+':'+z+');return false"><img src=0.gif width=7 height=40 border=0><img src=0.gif width=25 height=40 name=i'+z+' border=0><img src=0.gif width=7 height=40 border></a></td>\n')
        }
    }
    html+='</tr>\n'
}
html+='</table>'


d.write(html)
refresh(board,0)
