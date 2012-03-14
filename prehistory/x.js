sx=sy=st=bmove=moveno=inhand=going=0
flip=1
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
castle=[3,3]
ky=[20,90]
kx=[5,5]
pv=[0,1,5,3,3,9,31,0]
pn=[]
weight=[]
ep=0  //en passant state off
M1=4    //centre weighting
M2=3    //centre weigting of departure point
M3=1    // line up with king weight


for(z=0;z<8;z++){
    pv[z+8]=pv[z]=10*pv[z]  //same piece values for black and white
    if(moves[z]){
        s=moves[z].length           //probably some better way
        for(x=0;x<s;x++){
            moves[z][s+x]=-moves[z][x]
        }
    }
    moves[z+8]=moves[z]          //both refer to same array
}

// draw screen, and construct weighting tables
for (y=110;y>=0;y-=10){
    for(x=0;x<10;x++){
        z=y+x
        weight[z]=parseInt(wstring.charAt(((z<60)?z:119-z)),26)
        board[z]=parseInt(bstring.charAt(z),26)
        if(y>10 && y<100){
            if(x &&x<9){
                html+=('<td class=' + ((x+(y/10))&1?'b':'w') + '><a href="#" onclick="B('+z+')"><img src='+board[z]+'.gif width=44 height=44 name=i'+z+' border=0></a></td>\n')
            }
            else html+='<td class=h>'+(y-10)/10+'</td>'
        }
        else{
            if(y%90==10) html+=('<td class=h>'+lttrs.charAt(x-1)+'</td>')
            else  html+=('<td class=g><img src='+((z%6)+1+8*(y>50))+'.gif></td>')
        }
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

function parse(bm,EP,tpn,b){
    var tyx,yx,h,aa,a,cx,mv,k=-1,bmx=bm>>3,nbm=bm^8,dir=10-bmx*20,mvl=[],mvlength,wate
    for(yx=21;yx<99;yx++){
        a=board[yx]
        if(a&15&&bm==(a&8)){
            wate=weight[yx]*M2
            a&=7
            if(a>1){    //non-pawns
                ak=a==6
                mv=moves[a]
                mvlength=mv.length
                if(a==3||ak){
                   for(cx=0;cx<mvlength;cx++){     //knights,kings
                        tyx=yx+mv[cx]
                        aa=board[tyx]
                        if(!aa||(aa&24)==nbm){
                            mvl[++k]=[tpn+pv[aa]+(ak?0:weight[tyx]*M1)-wate,yx,tyx] //rating,start,end,-- enpassant left undefined
                            //if ((aa&7)==6)return 0
                        }
                    }
                    if(ak&&castle[bmx]){
                        if(castle[bmx]&1&&!board[yx-1]&&!board[yx-2]&&!board[yx-3]&&check(yx-2,bm,dir)){
                            mvl[++k]=[tpn+11,yx,yx-2]                                //no analysis, just encouragement
                        }
                        if(castle[bmx]&2&&!board[yx+1]&&!board[yx+2]&&check(yx,bm,dir)){
                            mvl[++k]=[tpn+12,yx,yx+2]                                //no analysis, just encouragement
                        }
                    }
                }
                else{
                    for(cx=0;cx<mvlength;cx++){     //goeth thru list of moves
                        m=mv[cx]
                        tyx=yx
                        aa=0
                        while(!aa){   //while on board && no piece
                            tyx+=m
                            aa=board[tyx]
                            if(!aa||(aa&24)==nbm){
                                mvl[++k]=[tpn+pv[aa]+(ak?0:weight[tyx]*M1)-wate,yx,tyx]
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
                        mvl[++k]=[tpn+weight[tyx+dir]*M1-wate,yx,tyx+dir,tyx]    //ep points to the takable spot
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
//treeclimber(level,bmove,500,120,120,ep)
//tpn == cumulative score

var comp=new Function('a','b','return b[0]-a[0]')//comparison function for treeclimb integer sort (descending)

function treeclimber(count,bm,tpn,s,e,EP){
    var z,mvl,pl,mvt,pl2,pl3,pr,mv
    var a=board[s],aa=board[e],mz=-999
    board[e]=a
    board[s]=0
    mvl=parse(bm,EP,tpn,beta[count])
    if(mvl){
        pl=mvl.length
        parsees+=pl
        if(!count){
			for(z=0;z<pl;z++){
				if(mvl[z][0]>mz){
					mz=mvl[z][0]
//					evaluees++
//					if (mz[0]<beta[1]){
//						beta[1]=mz[0]
//						break
//					}
				}
			}
        }
        else{
            mvl.sort(comp)//descending order
            for(z=0;z<pl;z++){
                mv=mvl[z]
                mvt=treeclimber(count-1,8-bm,-mv[0],mv[1],mv[2],mv[3])
                if(mvt[0]>mz){
					evaluees++
					mz=mvt[0]
//					if (mz[0]<beta[count+1]){
//						beta[count+1]=mz[0]
//						break
//					}
				}
            }
        }

        mz=-mz
    }
    else mz=-300
//    beta[count]=-1000
    board[s]=a
    board[e]=aa
    return mz
}


//************************************CHECK

function check(yx,bm,dir){         //dir is dir
    var tyx,aa,aa7,sx=yx%10
    for(x=sx;x<sx+3;x++){
        for(m=dir-1;m<dir+2;m++){
            aa=board[yx+m]
            if(aa&&(aa&8)==bm&&((aa&7)==1||(aa&7)==6))return 0        //don't need to check for pawn position --cannot arrive at centre without passing thru check
            aa=0
            tyx=yx
            while(!aa){   //while on board && no piece
                tyx+=m
                aa=board[tyx]
                if (aa&16)break
                if((aa==bm+2+(m==dir)*2)||aa==bm+5)return 0
            }
        }
        for (z=0;z<8;z++){
            if(board[yx+moves[3][z]]-bm==3)return 0      //knights
        }
        return 1
    }
}


//*************************************making moves


function findmove(){
    var s,e,pn,themove,sb,bs
    millisecs1=new Date()       //timing routine
    level=d.fred.hep.selectedIndex+1
    evaluees=parsees=0
	beta=[99,99,99,99,99,99]
	beta[level+1]=1000

    mvl=parse(bmove,ep,0,beta[level])
    themove=[-300,120,120]
    if(mvl){
		mvl.sort(comp)//descending order
		for(z=0;z<mvl.length;z++){
			mv=mvl[z]
			mvt=treeclimber(level-1,8-bmove,0,mv[1],mv[2],mv[3])
			if(mvt>themove[0]){
				themove=[mvt,mv[1],mv[2]]
			}
		}
	}

    //themove=treeclimber(level,bmove,0,120,120,ep,0)
    millisecs2=new Date()
    d.fred.ep.value=millisecs2-millisecs1+ 'ms'
    bubbit("parsed "+parsees+ "evaluated "+evaluees)
    pn=themove[0]
    if (pn<-200){going=0;alert('checkmate')}
    else{
        s=themove[1]
        e=themove[2]
        move(s,e,0,pn+" ev."+evaluees+" "+(millisecs2-millisecs1)+ 'ms' )
    }
}

// move the piece (no testing)
function move(s,e,queener,score){
    var a=board[s]&7,bmx=bmove>>3,dir=bmx*10-20,aa=board[e],x=s%10,tx=e%10,ty=e-tx,gap=e-s
    ep=0
    if(a==1){ //pawns
        if(board[e+dir]&16) board[s]+=4-queener //queener is choice for pawn queening
        if(e==s+2*dir)ep=s+dir       //set up ep  - perhaps do pawn test (save time in loop)
        if(!aa&&x!=tx)shift(e,e+dir)// blank ep pawn
    }
    if(s==21+bmx*70||s==28+bmx*70)castle[bmx]&=(x>5)+1        //castle flags
    if(a==6){
        if(gap*gap==4){  //castling - move rook too
            shift(s-4+(s<e)*7,s+gap/2)
        }
        castle[bmx]=0
        kx[bmx]=tx
        ky[bmx]=ty
    }
    shift(s,e)
    display2(s,e,score,aa)
    moveno+=bmx
    if(!(moveno%3)){   //alter strategy multipliers
        M1=(M1-1||1)
        M2=(M2-1||1)
        M3+=1
    }
    bmove=8-bmove
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
        d
        return
    }
    if (inhand){
        p=parse(bmove,ep,0,0)
        debug (p)
        for (z=0;z<p.length;z++){
            if(p[z][1]==ss &&p[z][2]==it){
				bubbit('trying '+ss+' '+it)
                //y=treeclimber(1,8-bmove,500,ss,it,ep)[0]
                move(ss,it,d.fred.hob.selectedIndex,y)
                //else{
                //    alert('check! '+y)
                //    d.images['i'+ss].src=inhand+'.gif'
                //}
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
    d.fred.bib.value+="\n"+(bmove?'    ':(moveno<10?" ":"")+moveno+". ")+lttrs.charAt(x-1)+(y-1)+(b?'x':'-')+lttrs.charAt(tx-1)+(ty-1)+'    '+a
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

//*********************************************final write,etc

d.write(html)