sx=sy=st=bmove=inhand=going=0
moveno=flip=1
d=document
board=[]
lttrs="abcdefgh"
strink=''
html='<table cellpadding=4 class=t><tr>'
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


// draw screen, and construct weighting tables
for (y=110;y>=0;y-=10){
    for(x=0;x<10;x++){
        z=y+x
        weight[z]=parseInt(wstring.charAt(((z<60)?z:119-z)),26)
        w=board[z]=parseInt(bstring.charAt(z),26)
        if(w<16){
            html+=('<td class=' + ((x+(y/10))&1?'b':'w') + '><a href="#" onclick="B('+z+')"><img src='+board[z]+'.gif width=44 height=44 name=i'+z+' border=0></a></td>\n')
        }
		else{
			if(y%110) html+=('<td class=h>&nbsp;</td>')
//            else{ if(x%9==0 &&y%110)html+='<td class=h>'+(y-10)/10+'</td>'
//                  else html+=('<td class=g><img src='+((z%6)+1+8*(y>50))+'.gif></td>')
//            }
    	}
//		else{
//			if(y%90==10) html+=('<td class=h>'+lttrs.charAt(x-1)+'</td>')
//            else{ if(x%9==0 &&y%110)html+='<td class=h>'+(y-10)/10+'</td>'
//                  else html+=('<td class=g><img src='+((z%6)+1+8*(y>50))+'.gif></td>')
//            }
//    	}
    }
    html+='</tr><tr>\n'
}
board[120]=0
html+='</tr></table>'



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
                            mvl[++k]=[tpn+pv[aa]+(ak?0:weight[tyx]*M1)-wate+(ak&&moveno<30?(closeness[a][40+kp[nx]-tyx]||0)*M3-ic:0),yx,tyx] //rating,start,end,-- enpassant left undefined
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
    var z,mvl,pl,mvt,mv,b
//    var cmp=comp
    var a=board[s],aa=board[e],mz=[-999]
    board[e]=a
    board[s]=0
    mvl=parse(bm,EP,tpn)
    if(mvl){
        pl=mvl.length
        parsees+=pl
        if(!count){
			b=beta[0] //localise for extra speed
			for(z=0;z<pl;z++){
				if(mvl[z][0]>mz[0]){
					mz=mvl[z]
					evaluees++
					if (mz[0]>b){
						break
					}
				}
			}
        }
        else{
            mvl.sort(comp)//descending order
            b=beta[count]
			beta[--count]=999
            for(z=0;z<pl;z++){
                mv=mvl[z]
                if (!pruner || mv[0]>-beta[count]){
					mvt=(mv[0]<400) ? mvt=treeclimber(count,8-bm,-mv[0],mv[1],mv[2],mv[3],pruner)[0] : mv[0]  //ie, if king taken, don't follow thread
					if(mvt>mz[0]){
						evaluees++
						mz=[mvt,mv[1],mv[2]]  //
						if (mz[0]>beta[count]||beta[count]>998){
							beta[count]=-mz[0]
			//				break
						}
						if (mz[0]>b)break
					}
				}
				else{
					prunees++
				}
            }
        }
        mz[0]=-mz[0]
    }
    else mz=[-600]
//    beta[count]=-1000
    board[s]=a
    board[e]=aa
    return mz
}


//************************************CHECK

function check(yx,nbm,dir,side){         //dir is dir
    var tyx,aa,aa7,sx=yx%10,x,m,ex=yx+3,md=dir+2
    for(;yx<ex;yx++){ //go thru 3positions, checking for check in each
        for(m=dir-2;++m<md;){
			aa=board[yx+m]
            if(aa&&(aa&8)==nbm&&((aa&7)==1||(aa&7)==6))return 0        //don't need to check for pawn position --cannot arrive at centre without passing thru check
            aa=0
            tyx=yx
            while(!aa){   //while on board && no piece
                tyx+=m
                aa=board[tyx]
                if (aa&16)break
                if((aa==nbm+2+(m==dir)*2)||aa==nbm+5)return 0
            }
        }
        for (z=0;z<8;){
            if(board[yx+moves[3][z++]]-nbm==3)return 0      //knights
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
    d.fred.ep.value=millisecs2-millisecs1+ 'ms'
    bubbit("prs:"+parsees+ "eval:"+evaluees+" prune:"+prunees)
    pn=-themove[0]
	s=themove[1]
	e=themove[2]
	move(s,e,0,pn+" ev."+evaluees+" "+(millisecs2-millisecs1)+ 'ms' )
	//if (pn>200){going=0;debug('checkmate',themove)}

}

// move the piece (no testing)
function move(s,e,queener,score){
    var a=board[s]&7,bmx=bmove>>3,dir=10-bmx*20,aa=board[e],x=s%10,tx=e%10,ty=e-tx,gap=e-s
    ep=0
    if(a==1){ //pawns
//     	debug(board[e+dir],"piece:",5-queener,'e',e,'s',s)
        if(board[e+dir]>15)board[s]+=4-queener //queener is choice for pawn queening
        if(e==s+2*dir)ep=s+dir       //set up ep  - perhaps do pawn test (save time in loop)
        if(!aa&&x!=tx)shift(e,e+dir)// blank ep pawn
    }
    if(s==21+bmx*70||s==28+bmx*70)castle[bmx]&=(x<5)+1        //castle flags
    if(a==6){
        if(gap*gap==4){  //castling - move rook too
            shift(s-4+(s<e)*7,s+gap/2)
        }
        castle[bmx]=0
        kx[bmx]=tx
        ky[bmx]=ty
        kp[bmx]=e
    }

    shift(s,e)
    display2(s,e,score,aa)
    moveno+=bmx
    if(!(moveno%3)){   //alter strategy multipliers
        M1=(M1-1||1)
        M2=(M2-1||1)
        M3=M3>3?4:(moveno>>3)
    }
    bmove=8-bmove
	beta[1]=999
	themove=treeclimber(1,bmove,0,120,120,ep,0)
	if (themove[0]>200){going=0;debug('checkmate',themove)}

	d.fred.check.value=castle

}

//*************************************** macro-control

function B(it){
    var a=board[it],z,p
    if(!a&&!inhand) return
    if (a&&(bmove==(a&8))){     //ie, if one picked up of right colour, it becomes start
        if (inhand) d.images['i'+ss].src=inhand+'.gif'
        inhand=a
        ss=it
        d.images['i'+ss].src='0.gif'     //not real shift, but blank start
        d.images['pih'].src=a+'.gif'
        return
    }
    if (inhand){
        p=parse(bmove,ep,0,0)
        for (z=0;z<p.length;z++){
            if(p[z][1]==ss &&p[z][2]==it){
				bubbit('trying '+ss+' '+it)
                move(ss,it,d.fred.hob.selectedIndex,y)
                inhand=0
            }
        }
    }
}

//B1 is auto

function B1(){
    findmove()          //do other colour
    setTimeout("if(going)B1()",500)
}

//*******************************shift & display

function shift(s,e){
    var a=board[s]
    board[e]=a
    board[s]=0
    d.images['i'+s].src='0.gif'
    d.images['i'+e].src=a+'.gif'
}

function display2(s,e,a,b){
    var z,x=s%10,y=(s-x)/10,tx=e%10,ty=(e-tx)/10
    d.fred.bib.value+="\n"+(bmove?'    ':(moveno<10?" ":"")+moveno+". ")+lttrs.charAt(x-1)+(y-1)+(b?'x':'-')+lttrs.charAt(tx-1)+(ty-1)+'   '+a+prunees
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
//	bw*=120
	for (var z=0;z<110;z++){
		if(bd[z]<16)d.images['i'+z].src=bd[z]+'.gif'
	}
}





//*********************************************final write,etc

d.write(html)