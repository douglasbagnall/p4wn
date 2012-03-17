sx=sy=st=bmove=inhand=going=0
player=0
moveno=0
mn50=0
flip=1
d=document
board=[]
lttrs="abcdefgh"
x='g00000000g'         //g stands for off board
y='gggggggggg'
bstring=y+y+"g23456432gg11111111g"+x+x+x+x+"g99999999ggABCDECBAg"+y+y  //in base 26 (g is 16)
wstring=x+x+x+"000111100000123321000123553210"
moves=[0,0,[1,10],[21,19,12,8],[11,9],[1,10,11,9],[1,10,9,11],0]
//pawn=[8,48]
castle=[3,3]//castle[0] &1 is white's left, castle[0]&2 is right castle
ky=[20,90]
kx=[5,5]
kp=[25,95]
pv=[0,1,5,3,3,9,63,0]
pn=[]
weight=[]
ep=0  //en passant state off
M1=4    //centre weighting
M2=3    //centre weigting of departure point
M3=1    // line up with king weight
beta=[0,0,0,0,0,0]
parsees=prunees=evaluees=0
ss=0


A=E=d.all;
if (!E)event=0; //else errors in onmouseover.
DOM=d.getElementsByTagName || null;
if (DOM||E){
	d.write("<img src=0.gif id=pih name=pih width=33 height=33>");
	A= (E||d.getElementsByTagName("img"));
	itch=A["pih"].style
}

boardheap=[]

for(z=0;z<8;){
    pv[z+8]=pv[z]=10*pv[z]  //same piece values for black and white
    if(moves[z]){
        s=moves[z].length           //probably some better way
        for(x=0;x<s;){
            moves[z][s+x]=-moves[z][x++]
        }
    }
    moves[z+8]=moves[z++]          //both refer to same array
}

closeness=[0,0,[],[],[],[],[]]

z=0;
for(x=-2;x<3;x++){
	for(y=-2;y<3;y++){
		p=40+y*10+x
		closeness[6][p]=4-Math.abs(y)-Math.abs(x)
		closeness[3][p]=closeness[6][p]+2*(x==2*y||y==2*x)
		closeness[2][p]=closeness[6][p]+2*(x==0||y==0)
		closeness[4][p]=closeness[6][p]+2*(x==y)
		closeness[5][p]=closeness[6][p]+2*(x==0||y==0||y==6)
	}
}

screenboard=[]
for(z=0;z<120;z++){
	weight[z]=parseInt(wstring.charAt(((z<60)?z:119-z)),26)
	board[z]=parseInt(bstring.charAt(z),26)
	screenboard[z]=z
}
board[120]=0

// draw screen, and construct weighting tables



//**************************************************functions
// tyx==position+ move (temp yx)
// bmx== blackness flag
// k
// yx,h,aa,a,cx,mv,k=-1,bmx=bm>>3,dir=bmx*10-20,mvl=[],mvlength,wate

function parse(bm,EP,tpn){
//	var bord=board
    var tyx,yx,h,aa,a,cx,mv,k=-1,bmx=bm>>3,nbm=bm^8,nx=nbm>>3,dir=10-bmx*20,mvl=[],m,wate,cbmx=castle[bmx]
    for(yx=21;yx<99;yx++){
		a=board[yx]
        if(a&15&&bm==(a&8)){
            wate=weight[yx]*M2
            a&=7
            if(a>1){    //non-pawns
            	ic=(closeness[a][40+kp[nx]-yx]||0)//initial closeness
                ak=a==6
                mv=moves[a]
                if(a==3||ak){
                   for(cx=0;cx<8;){     //knights,kings
                   		tyx=yx+mv[cx++]
                        aa=board[tyx]
                        if(!aa||(aa&24)==nbm){
                            mvl[++k]=[tpn+pv[aa]+(ak?0:weight[tyx]*M1)-wate+(ak&&mn50?(closeness[a][40+kp[nx]-tyx]||0)*M3-ic:0),yx,tyx] //rating,start,end,-- enpassant left undefined
                            //if ((aa&7)==6)return 0
                        }
                    }
                    if(ak&&cbmx){
                        if(cbmx&1&&!(board[yx-1]+board[yx-2]+board[yx-3])&&check(yx-2,nbm,dir,-1)){//Q side
                            mvl[++k]=[tpn+11,yx,yx-2]                                //no analysis, just encouragement
                        }
                        if(cbmx&2&&!(board[yx+1]+board[yx+2])&&check(yx,nbm,dir,1)){//K side
                            mvl[++k]=[tpn+12,yx,yx+2]                                //no analysis, just encouragement
                        }
                    }
                }
                else{//rook, bishop, queen
        			var mlen=mv.length
                    for(cx=0;cx<mlen;){     //goeth thru list of moves
                    	aa=0
                    	m=mv[cx++]
                        tyx=yx
                        while(!aa){   //while on board && no piece
                            tyx+=m
                            aa=board[tyx]
                            if(!aa||(aa&24)==nbm){
                                mvl[++k]=[tpn+pv[aa]+(weight[tyx]*M1)-wate+(closeness[a][40+kp[nx]-tyx]||0)*M3-ic,yx,tyx]
                                //if ((aa&7)==6)return 0
                            }
                        }
                    }
                }
            }
            else{    //pawns
                tyx=yx+dir
                if(!board[tyx]){
                    mvl[++k]=[tpn+weight[tyx]*M1-wate,yx,tyx]
                    if(board[tyx+dir]&16){  //queening
                        mvl[k][0]+=80                         //overwrite previous
                    }
                    if(board[yx-dir-dir]&16&&(!board[tyx+dir])){  //2 squares at start
                        mvl[++k]=[tpn+weight[tyx+dir]*M1-wate,yx,tyx+dir,tyx]    //ep points to the takeable spot
                    }
                }
                if(EP&&(EP==tyx+1||EP==tyx-1)&& bm!=(board[EP-dir]&8)) {       //enpassant
                    mvl[++k]=[tpn+1+weight[tyx]*M1-wate,yx,EP]
                }
                for(h=-1;h<2;h+=2){                        //h=-1,1 --for pawn capturing
                    aa=board[tyx+h]
                    if(aa&15 && (aa&8)!=bm){
                        mvl[++k]=[tpn+pv[aa]+weight[tyx]*M1-wate,yx,tyx+h]
                        //if(aa&7==6)return 0
                    }
                }
			}
			//if(mvl.length && beta<mvl[k][0])return [mvl,mvl[k][0]]  //so top score becomes new beta
        }
    }
    return mvl//[mvl,beta]  //[[pl,s,e,EP],...]
}

//################treeclimb
//treeclimber(level,bmove,500,120,120,ep,pruner)
//tpn == cumulative score

var comp=new Function('a','b','return b[0]-a[0]')//comparison function for treeclimb integer sort (descending)

function treeclimber(count,bm,tpn,s,e,EP,pruner){
    var z,mvl,pl,mvt,mv,b,cmp=comp
//    var cmp=comp
    var a=board[s],aa=board[e],best=[-999]
    board[e]=a
    board[s]=0
    mvl=parse(bm,EP,tpn)
    if(mvl){
        pl=mvl.length
        parsees+=pl
        if(!count){
			b=beta[0] //localise for extra speed
			for(z=0;z<pl;z++){
				if(mvl[z][0]>best[0]){
					best=mvl[z]
					evaluees++
					if (best[0]>b){
						break
					}
				}
			}
        }
        else{
            mvl.sort(cmp)//descending order
            b=beta[count]
			beta[--count]=999
            for(z=0;z<pl;z++){
                mv=mvl[z]
                if (!pruner || mv[0]>-beta[count]){
					mvt=(mv[0]>-400) ? -treeclimber(count,8-bm,-mv[0],mv[1],mv[2],mv[3],pruner)[0] : mv[0]  //ie, if king taken, don't follow thread
					if(mvt>best[0]){
						evaluees++
						best=[mvt,mv[1],mv[2]]  //
						if (best[0]>beta[count]||beta[count]>998){
							beta[count]=-best[0]
			//				break
						}
						if (best[0]>b)break
					}
				}
				else{
					prunees++
				}
            }
        }
    }
    else best=[600]
    board[s]=a
    board[e]=aa
    return best
}


//************************************CHECK

function check(yx,nbm,dir,side){         //dir is dir
    var tyx,aa,aa7,sx=yx%10,x,m,ex=yx+3,md=dir+2,k=moves[3]
    for(;yx<ex;yx++){ //go thru 3positions, checking for check in each
        for(m=dir-2;++m<md;){
			aa=board[yx+m]
            if(aa&&(aa&8)==nbm&&((aa&7)==1||(aa&7)==6))return 0        //don't need to check for pawn position --cannot arrive at centre without passing thru check
            aa=0
            tyx=yx
            while(!aa){   //while on board && no piece
                tyx+=m
                aa=board[tyx]
//                if (aa&16)break
                if((aa==nbm+2+(m!=dir)*2)||aa==nbm+5)return 0
            }
        }
        for (z=0;z<8;){
            if(board[yx+k[z++]]-nbm==3)return 0      //knights
        }
    }
    aa=0
    yx-=3
	while (!aa){   //queen or rook out on other side
		yx-=side
		aa=board[yx]
		if(aa==nbm+2||aa==nbm+5)return 0
	}
	return 1
}


//*************************************making moves

function findmove(){
    var s,e,pn,themove,sb,bs
    millisecs1=new Date()       //timing routine
    level=d.fred.hep.selectedIndex+1
    evaluees=parsees=prunees=0
	beta[level]=999
    themove=treeclimber(level,bmove,0,120,120,ep,1)
    if (themove[0] >60){
		debug ("retrying",themove)
		beta[level]=999
	    themove=treeclimber(level,bmove,0,120,120,ep,0)
	}
    millisecs2=new Date()
    //d.fred.ep.value=millisecs2-millisecs1+ 'ms'
    bubbit("prs:"+parsees+ "eval:"+evaluees+" prune:"+prunees)
    pn=-themove[0]
	s=themove[1]
	e=themove[2]
	move(s,e,0,pn+" ev."+evaluees+" "+(millisecs2-millisecs1)+ 'ms' )
	//if (pn>200){going=0;debug('checkmate',themove)}

}

// move the piece (no testing)



function move(s,e,queener,score){
    var a=board[s]&7,bmx=bmove>>3,dir=10-bmx*20,aa=board[e],x=s%10,tx=e%10,ty=e-tx,gap=e-s;
	var c
	//test if this move is legal
	p=parse(bmove,ep,0,0)
	test=0;
    for (z=0;z<p.length;z++){
        test=test||(s==p[z][1]&&e==p[z][2]);
	}
	if (!test)return 0;

/// now see whether in check after this move, by getting the best reply.
	themove=treeclimber(1,8-bmove,0,s,e,ep,0);
	if (themove[0]<-400){
		debug (treeclimber(2,bmove,0,0,0,0,0)[0])
		debug(' incheck',themove);
		return false
	}
	//if got this far, the move is accepted (except for castling?). Now we need to make it, and save board state.
	//put board on heap.

    boardheap[moveno]=[board.toString(),castle.toString(),ep,M1,M2,M3]
    //debug (boardheap);

    ep=0// ep reset

    if(a==1){ //pawns
//     	debug(board[e+dir],"piece:",5-queener,'e',e,'s',s)
        if(board[e+dir]>15)board[s]+=4-queener //queener is choice for pawn queening
        if(e==s+2*dir && (board[e-1]&1||board[e+1]&1))ep=s+dir  //set up ep - with pawn test to save time in parse loop

        if(!aa&&x!=tx)shift(e,e-dir)// blank ep pawn
    }
    if(s==21+bmx*70||s==28+bmx*70)castle[bmx]&=(x<5)+1        //castle flags (blank on any move from rook points)
    if(a==6){
        if(gap*gap==4){  //castling - move rook too
        	//if (!check(s,8-bmove,dir,gap>>1))return false
            shift(s-4+(s<e)*7,s+gap/2)
        }
        castle[bmx]=0
        kx[bmx]=tx
        ky[bmx]=ty
        kp[bmx]=e
    }
    // from here there is no turning back
    shift(s,e)
    //attempt to find if checked
	p=parse(8-bmove,ep,0,0)
	test=0;
	for (z=0;z<p.length;z++){
		test=test||(p[z][0]>400);
	}
	if (test)c=1;
	themove=treeclimber(1,bmove,0,120,120,ep,0)
	if (themove[0]<-400){going=0;debug('checkmate',themove);c=1}

    display2(s,e,score,aa,c)


    if(!(++moveno%7)){   //alter strategy multipliers
        M1=(M1-1||1)
        M2=(M2-1||1)
        M3=M3>3?4:(moveno>>4)
        mn50=moveno<50
    }
    bmove=8-bmove
	beta[1]=999
	return true
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
    findmove()          //do other colour
    Btime=setTimeout("B2()",500)
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

function bubbit(s){
	d.fred.bub.value=s
}

function debug(){
	for (var z=0;z<arguments.length;z++){
		var az=arguments[z]
		d.fred.bug.value+=az+"  "
	}
	d.fred.bug.value+="\n"
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

function drag(e) {
	e=e||event //MSIE uses "event" magical variable, netscapes magically populate 1st argument (e)
	itch.left=(e.clientX+1)+"px";
	itch.top=(e.clientY-4)+"px";
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
            html+=('<td class=' + ((x+(y/10))&1?'b':'w') + '><a href="#" onclick="B(player?119-'+z+':'+z+');return false"><img src=0.gif width=44 height=44 name=i'+z+' border=0></a></td>\n')
        }
    }
    html+='</tr>\n'
}
html+='</table>'


d.write(html)
refresh(board,0)



///***********************************************testing


function parsetest(){
	var z,x,y=500
	x=new Date()
	for (z=0;z<y;z++){
		parse(bmove,ep,0)
	}
	x-=new Date()
	debug ('parse took '+ -x/y +' milliseconds')
}

