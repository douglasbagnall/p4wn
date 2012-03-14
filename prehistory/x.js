bmove=0    // the moving player 0=white 8=black
inhand=0   // piece in hand (ie, during move)
going=0    // DEV: denotes auto play, or not. 
player=0   // human colour (0=white, 8=black)
moveno=0   // no of moves  
ep=0       //en passant state (points to square behind takable pawn, ie, where the taking pawn ends up.
Bt=1999    
Al=-Bt
ss=0       //used in display.js
s0=3;
mate=0;   //1 for stale-, 2 for check-
d=document;
lttrs="abcdefgh"
pawns=[[],[]];
dirs=[10,-10];
BE=120;
//kp=[25,95]
boardheap=[]  // history of board state, for undo.
pieces=[]
board=[]  
moves=[0,0,[1,10],[21,19,12,8],[11,9],[1,10,11,9],[1,10,11,9],0]       //in order _,p,r,n,b,q,k       
castle=[3,3] 
pv=[0,1,5,3,3,9,63,0]
weight=[]           
for(z=0;z<8;z++){
    pv[z+8] = pv[z]<<=4;
    mz=moves[z]
    if(mz){ 
	s=mz.length 
	for(x=0;x<s;){
	    mz[s+x]=-mz[x++]
	}
    }
}
//alert(pv);
x='g00000000g'
y='gggggggggg'
bstring=y+y+"g23456432gg11111111g"+x+x+x+x+"g99999999ggABCDECBAg"+y+y
wstring=x+x+x+"000111100000123321000123553210"
weights=[]
pw='000012346900';
b_pweights=[];
b_weights=[];    // central weighting for ordinary pieces.
for(y=0;y<12;y++){
    for(x=0;x<10;x++){
	z=(y*10)+x;
	b_pweights[z]=parseInt(pw.charAt(y));    //also need to add main weight set at start.
	b_weights[z]=parseInt(wstring.charAt((z<60)?z:119-z),35)&7; // for all the ordinary pieces
	board[z]=parseInt(bstring.charAt(z),35);
    }
}
board[BE]=0;

//**************some display stuff.

A=E=d.all;
if (!E)event=0; //else errors in onmouseover.
DOM=d.getElementsByTagName || null;
if (DOM||E){
  d.write("<img src=0.gif id=pih name=pih width=20 height=32>");
  A= (E||d.getElementsByTagName("img"));
  itch=A["pih"].style;
}

///////////////////////////treeclimb begins

var comp=new Function('a','b','return b[0]-a[0]'); //comparison function for treeclimb integer sort (descending)
/****treeclimber */
function treeclimber(count, bm, sc, s, e, alpha, beta, EP){
    var z=-1;
    sc=-sc;
    var nbm=8-bm;
    if (sc <-400)return [sc,s,e];      //if king taken, no deepening.
    var b=Al;     //best move starts at -infinity
    var S,E=board[e];
    board[e]=S=board[s];
    board[s]=0;
    if(S)pieces[nbm][pieces[nbm].length]=[S,e];

    //now some stuff to handle queening, castling
    var rs,re;
    if(S&7==1 && board[e+dirs[bm>>3]]>15){
    	board[e]+=4-queener; //queener is choice for pawn queening
    }
    if(S&7==6 && (s-e==2||e-s==2)){  //castling - move rook too
    	rs=s-4+(s<e)*7;
	re=(s+e)>>1; //avg of s,e=rook's spot
	board[rs]=0;
	board[re]=bm+2;	
    }

    var movelist=parse(bm,EP,sc);
    var movecount=movelist.length;
    var mv;
    if (movecount) {
	if(count){	
	    //BRANCH NODES
	    var t;
	    var cmp=comp;	
	    movelist.sort(cmp); //descending order
	    count--;
	    best=movelist[0];
	    var bs=best[1];
	    var be=best[2];
	    b=-treeclimber(count, nbm, best[0], bs, be, -beta, -alpha, best[3])[0];
	    for(z=1;z<movecount;z++){		
		if (b>alpha)alpha=b;  //b is best
		mv = movelist[z];	
		t= -treeclimber(count, nbm, mv[0], mv[1], mv[2], -alpha-1, -alpha, mv[3])[0];
		if ((t>alpha) && (t<beta)){
		    t= -treeclimber(count, nbm, mv[0],mv[1],mv[2],-beta,-t, mv[3])[0];
		}		
		if (t>b){
		    b=t;
		    bs=mv[1];
		    be=mv[2];
		    if(t>alpha)alpha=t;
		    if (b>beta){
			break;
		    }
		}
	    }
	}	
	else{
	    b=Al;
	    //LEAF NODES
	    while(--movecount &&  beta>b){
		if(movelist[movecount][0]>b){
		    b=movelist[movecount][0];
		}
	    }
	}
    }else{debug('no movelist')};
    if(rs){
	board[rs]=bm+2;
	board[re]=0;
    }
    board[s]=S;
    board[e]=E;
    pieces[nbm].length--;

    return [b,bs,be];
}


function safetywrapper(count,bm,s,e,ep){
    var E=board[e],S=board[e]=board[s];
    board[s]=0;
    prepare();
    bm=treeclimber(count,bm,0,BE,BE,Al,Bt,ep);
    board[s]=S;
    board[e]=E;
    return bm[0];
}







//************************************* findmove();

function findmove(){
    level=d.fred.hep.selectedIndex+1;
    var t=treeclimber(level,bmove,0,BE,BE,Al,Bt,ep);
    return move(t[1],t[2],0);
}

//**************************************** move();
function move(s,e,queener){

    var E=board[e];
    var S=board[s];
    var a=S&7;
    var bmx=bmove>>3;
    var ch=0;

    //test if this move is legal
    var t=0;
    var z=0;
    if (bmove==player){
	prepare();
	var p=parse(bmove,ep,0);
	for (;z<p.length;z++){
	    t=t||(s==p[z][1]&&e==p[z][2]);
	}
	if (!t) {
	    going=0;
	    debug ('no such move!',p,'\ns e',s,e,'\n',S,E);
	    return 0;
	}
	// get best other player's move
	// if it's check, squawk
	t=safetywrapper(0,8-bmove,s,e,ep);
	if (t>400){
	    debug('in check',t);
	    return 0;
	}	
    }
    display2(s,e,E,ch);
    t=safetywrapper(0,bmove,s,e,ep);
    if (t>400){
	debug('check!',t);
	ch=1;
    }
    // and if it isn't check before opposition's best move, it's stalemate.
    t=safetywrapper(1,8-bmove,s,e,ep);
    if(t<-400){	
	going=0;
	finish(ch);
	//	if(!ch)return 0; //don't do stale mate move.
    }
    if(E&7==6){finish(1)}

    //put board on heap.
    boardheap[moveno]=[board.toString(),castle.toString(),ep];
    ep=0;
    var x=s%10;
    var gap=e-s;
    var dir=dirs[bmx];
    if(a==1){ // pawns
	if(board[e+dir]>15)board[s]+=4-queener;
	if(gap==2*dir && (board[e-1]&1||board[e+1]&1))ep=s+dir;
	if(!E&& gap%10)shift(e,e-dir);
    }
    if(s==21+bmx*70||s==28+bmx*70)castle[bmx]&=(x<5)+1;        //castle flags (blank on any move from rook points)
    if(e==21+bmx*70||e==28+bmx*70)castle[!bmx]&=(x<5)+1;       //(or on any move *too* opposition corners)
    if(a==6){
	//	kp[bmx]=e; 
	if(gap*gap==4){  //castling - move rook too
	    shift(s-4+(s<e)*7,s+gap/2);
	}
	castle[bmx]=0;
    }
    shift(s,e);
    prepare();   // get stuff ready for next move
    moveno++;
    bmove=8-bmove;
    return 1;
}

function finish(ch){
    dfbv(ch?'checkmate!':'stalemate!');
    mate=ch++;
    going=0;    
    //    Bim(kp[bmove>>3],0); 
    //    setTimeout('Bim(kp[bmove>>3],bmove+6)',2000); 
}




////////////////////////////////////parse

function prepare(){
    var z=99,Q;
    //    alert('in prepare');
    s0=(moveno<32)?4-(moveno>>3):(moveno>64);
    pieces[0]=[];
    pieces[8]=[];
    kweights=[];
    pweights=[[],[]];
    for(;z>20;z--){
	a=board[z];
	if(a&7){
	    pieces[a&8][pieces[a&8].length]=[a,z];
	}
	weights[z]=b_weights[z]*s0;
	kweights[z]=(moveno>40)||(10-2*b_weights[z])*s0;// while moveno <= 40, weight to edge.
	Q=pweights[1][119-z]=pweights[0][z]=b_pweights[z];//centralising for first 8 moves, then forwards only.
	if (moveno<7 && z>40){
	    pweights[0][z]=pweights[1][119-z]=Q+(Math.random()*weights[z])|1;
	    weights[24]=weights[94]=19;//hold queens at home
	}
    }
    //    debug("moveno s0",moveno,s0);

}




function parse(bm,EP,tpn) {
    //	var bord=board
    var yx,tyx;    //start and end position
    var h;         //for pawn taking moves
    var E,a;       //E=piece at end place, a= piece moving
    var cx;     // loop for move direction
    var mv;     // list of move direction
    var k=-1;   // length of movelist (mvl)
    var bmx=bm>>3; //0 for white, 1 for black
    var nbm=bm^8;  //not bm (bm is the players colour)
    var nx=nbm>>3; //not bmx (ie 1 for white, 0 for black)
    var dir=dirs[bmx]; //dir= 10 for white, -10 for black
    var mvl=[];        // movelist (built up with found moves
    var m;             // current value in mv[cx]
    var wate;          // initial weighting of piece's position
    var pweight=pweights[bmx];//=pweights[bmx]
    //var pv=pv;            //localised pv
    var weight;       //=weight localised weight
    var cbmx=castle[bmx];    // flags whether this side can castle
    //var pv=PV[bm==bmove];
    var z;//loop counter.
    var ak;              //flags piece moving is king.
    var mlen;            //mv length in inner loop
    var pbm=pieces[bm];  //list of pieces that can move
    if (! pbm) alert('no pbm');
    var pbl=pbm.length;   //marginal time saving
    var B=board;          //local ref to board
    for (z=0;z<pbl;z++){
	yx=pbm[z][1];
	a=B[yx];
	if (pbm[z][0]==a){	
	    //	    if(a&7&&bm==(a&8)) { // already know a is bm safe, from pieces[bm] list
	    a&=7;
	    if(a>1){    //non-pawns
		ak=a==6;
		weight=ak?kweights:weights //different weight tables for king/knight
		wate=tpn-weight[yx];
		mv=moves[a];
		if(a==3||ak){
		    for(cx=0;cx<8;){     //knights,kings
			tyx=yx+mv[cx++];
			E=B[tyx];
			if(!E||(E&24)==nbm){
			mvl[++k]=[wate+pv[E]+weight[tyx],yx,tyx];
			}
		    }
		    if(ak&&cbmx){
			if(cbmx&1&&!(B[yx-1]+B[yx-2]+B[yx-3])&&check(yx-2,nbm,dir,-1)){//Q side
			    mvl[++k]=[wate+11,yx,yx-2];     //no analysis, just encouragement
			}
			if(cbmx&2&&!(B[yx+1]+B[yx+2])&&check(yx,nbm,dir,1)){//K side
			    mvl[++k]=[wate+12,yx,yx+2];                                //no analysis, just encouragement
			}
		    }
		}
		else{//rook, bishop, queen
		    mlen=mv.length;
		    for(cx=0;cx<mlen;){     //goeth thru list of moves
			E=0;
			m=mv[cx++];
			tyx=yx;
			while(!E){   //while on board && no piece
			    tyx+=m;
			    E=B[tyx];
			    if(!E||(E&24)==nbm){
				mvl[++k]=[wate+pv[E]+weight[tyx],yx,tyx];
			    }
			}
		    }
		}
	    }
	    else{    //pawns
		wate=tpn-pweight[yx];
		tyx=yx+dir;
		if(!B[tyx]){
		    mvl[++k]=[wate+pweight[tyx],yx,tyx];
		    if(! pweight[yx] && (!B[tyx+dir])){  //2 squares at start - start flagged by 0 pweights weighting
			mvl[++k]=[wate+pweight[tyx+dir],yx,tyx+dir,tyx];    //ep points to the takeable spot
		    }
		}
		if(EP&&(EP==tyx+1||EP==tyx-1)){
		    mvl[++k]=[wate+pweight[tyx],yx,EP];
		}		
		for(h=tyx-1;h<tyx+2;h+=2){                        //h=-1,1 --for pawn capturing
		    E=B[h]+bm;
		    if(E&7&&E&8){
			mvl[++k]=[wate+pv[E]+pweight[h],yx,h];
		    }
		}
	    }
	}
    }
    return mvl;
}


//************************************CHECK

function check(yx,nbm,dir,side){         //dir is dir
    var tyx,E,sx=yx%10,x,m,ex=yx+3,md=dir+2,k=moves[3],B=board;
    for(;yx<ex;yx++){ //go thru 3positions, checking for check in each
	for(m=dir-2;++m<md;){
	    E=B[yx+m];
	    if(E&&(E&8)==nbm&&((E&7)==1||(E&7)==6))return 0;        //don't need to check for pawn position --cannot arrive at centre without passing thru check
	    E=0;
	    tyx=yx;
	    while(!E){   //while on B && no piece
		tyx+=m;
		E=B[tyx];
		//                if (E&16)break
		if((E==nbm+2+(m!=dir)*2)||E==nbm+5)return 0;
	    }
	}
	for (z=0;z<8;){
	    if(B[yx+k[z++]]-nbm==3)return 0;      //knights
	}
    }
    E=0;
    yx-=3;
    while (!E){   //queen or rook out on other side
	yx-=side;
	E=B[yx];
	if(E==nbm+2||E==nbm+5)return 0;
    }
    return 1;
}



//////////////////////display


//*************************************** macro-control

function B(it){ //it is clicked square
    var a=board[it],p='pih';
    if (mate)return;
    if (ss==it && inhand){   //ss is global, for starting place of moving piece.
	Bim(p,0);         //this bit replaces a piece if you click on the square it came from
	Bim(ss,inhand,1);
	inhand=0;
	return;
    }
    if (a&&(bmove==(a&8))){     //ie, if one picked up of right colour, it becomes start
        if (inhand) Bim(ss,inhand,1); //put back old piece, if any
	inhand=a;
        ss=it;
        Bim(ss,0,1);     //not real shift, but blank start
        Bim(p,a);     //dragging piece
        if(E)drag();      //puts in right place
        d.onmousemove=drag;  //link in hand image to mouse
    	return;
    }
    if (inhand){
	if(move(ss,it,d.fred.hob.selectedIndex,y)){
	    Bim(p,0); //blank moving
	    d.onmousemove=null;         //and switch off mousemove.
	    if(A) itch.top=itch.left='0px';
	    inhand=0;
	    B2();
	}
    }
}


//////////////////////////////to go:

//B1 is auto
Btime=0;
function B1(){
    if(!mate && findmove()){          //do other colour
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
    var z=0,a=board[s];
    board[e]=a;
    board[s]=0;
    Bim(s,0,1);
    Bim(e,a,1);
}

function display2(s,e,b,c){
    var x=s%10,tx=e%10,mn=1+(moveno>>1);
    dfbv("\n"+(bmove?'     ':(mn<10?" ":"")+mn+".  ")+lttrs.charAt(x-1)+((s-x)/10-1)+(b?'x':'-')+lttrs.charAt(tx-1)+((e-tx)/10-1)+(c?'+':' '));
}

function dfbv(x){
    d.fred.bib.value+=x;
}


//*******************************************redraw screen from board

function refresh(bw){
    player=bw;
    for (var z=0;z<BE;z++){
	if(board[z]<16)Bim(z,board[z],1);
    }
    //    if (player!=bmove)B2();
}


function goback(){
    if (!moveno)return;
    moveno-=2;
    var b=boardheap[moveno];
    board=eval("["+b[0]+"]");
    castle=eval("["+b[1]+"]");
    dfbv('\n --undo--');
    ep=b[2];
    bmove=moveno%2;
    refresh(bmove);
    prepare();
}

//*********************************************drag piece
var px="px";
function drag(e) {
    e=e||event;
    itch.left=(e.clientX+1)+px;
    itch.top=(e.clientY-4)+px;
}

function Bim(img,src,swap){
    if (A || img!='pih'){
	if (swap){
	    img="i"+(player?119-img:img);
	}
	d.images[img].src=src+'.gif';
    }
}


//*********************************************final write,etc
    // can be merged with weighters;

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


d.write(html);
refresh(0);
