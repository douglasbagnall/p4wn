sx=sy=st=0
piecenet=bmove=moveno=piece=inhand=0
going=0
flip=1
level=2
d=document
board=[]
lttrs="abcdefgh"
strink=''
html='<table cellpadding=5 class=t><tr>'
bstring="23456432111111110000000000000000000000000000000099999999ABCDECBA"
wstring="00000000001111000123321012355321"
moveinit=[0,0,[1,0,0,8],[1,16,2,8],[1,8],[1,0,0,8,1,8],[1,0,0,8,1,8],0]
moves=[]
pawn=[8]
pawn[8]=48

pv=[0,1,5,3,3,9,50,2]
pn=[]
weight=[]
ep=9  //ie off
multi=[4,3]

for(z=0;z<8;z++){
    pv[z]=10*pv[z]
    pv[z+8]=-pv[z]
    moves[z]=moves[z+8]=[]          //both refer to same array
    mv=moveinit[z]
    y=0
    if(mv){
        for(x=0;x<mv.length;x++){
            mx=mv[x]
            my=mv[++x]
            for(fy=0;fy<2;fy++){        //must be shorter logic
                for(fx=0;fx<2;fx++){
                    moves[z][y++]=mx
                    moves[z][y++]=my
                    mx=-mx
                    fx+=!mx //if mx=0, don't repeat
                }
                my=-my
                fy+=!my
            }
        }
    }
    else{moves[z]=0}
}

for (y=56;y>=0;y-=8){
    for(x=0;x<8;x++){
        z=y+x
        weight[z]=parseInt(wstring.charAt(((z<32)?z:63-z)))
        board[z]=parseInt(bstring.charAt(z),16)
        html+=('<td class=' + ((x+(y>>3))%2?'w':'b') + '><a href="#" onclick="B('+z+')"><img src='+board[z]+'.gif width=55 height=55 name=i'+z+' border=0></a></td>\n')
    }
    html+='</tr><tr>\n'
}
html+='</tr></table>'


//**************************************************functions

function parse(bm,EP,tpn){
    var tyx,yx,tx,ty,x,y,h,aa,a,cx,mv,mx,my,fx,fy,mvlist=[],k=0,ep=9,dir=8-bm*2,aa7=0,bmc=(bm==bmove)*2-1,pl=[],el=[],sl=[],epl=[]
    for(y=0;y<64;y+=8){
        for(x=0;x<8;x++){
            yx=y+x
            a=board[yx]
            a8=(bm==(a&8))
            a&=7
            if(a>1&&a8){
                mv=moves[a]
                for(cx=0;cx<mv.length;cx++){     //mv to prevent pawns, goeth thru list of moves
                    mx=mv[cx]
                    my=mv[++cx]
                    ty=y
                    tx=x
                    aa=0
                    while(!aa &&(tx+=mx)>=0 && (ty+=my)>=0 && tx<8 && ty<57){   //while on board && no piece
                        aa=board[ty+tx]
                        if(!aa || !((aa&8)==bm)){
                            aa7=aa&7
                            pl[k]=tpn+bmc*(pv[aa7]+weight[ty+tx]*multi[0]-weight[yx]*multi[1])     //rating
                            sl[k]=yx  //start
                            el[k]=tx+ty   //end
                            epl[k++]=9 //enpassant
                            if (aa7==6)return 0
                        }
                        aa=(a==3||a==6)||aa         //sets aa to 1 if knight or king; breaks loop
                    }
                }
            }
            if(a==1&&a8){
                wate=weight[yx]*multi[1]
                tyx=yx+dir
                if(!board[tyx]){
                    pl[k]=tpn+bmc*(weight[tyx]*multi[0]-wate);sl[k]=yx;el[k]=tyx;epl[k++]=9
                    if(pawn[bm]==y&&(!board[tyx+dir])){  //2 squares at start
                        pl[k]=tpn+bmc*(weight[tyx+dir]*multi[0]-wate);sl[k]=yx;el[k]=tyx+dir;epl[k++]=x
                    }
                }
                if((EP==x+1||EP==x-1)&&pawn[bm]==y) {       //enpassant
                    pl[k]=tpn+bmc*(1+weight[tyx]*multi[0]-wate);sl[k]=yx;el[k]=tyx-x+EP;epl[k++]=9
                }
                for(h=-1;h<2;h+=2){                        //h=-1,1 --for pawn capturing
                    aa=board[tyx+h]
                    if(aa && (aa&8)!=bm && h+x<8 && h+x>=0){
                        pl[k]=tpn+bmc*(pv[aa&7]+weight[tyx]*multi[0]-wate);sl[k]=yx;el[k]=tyx+h;epl[k++]=9
                        if(aa&7==6)return 0
                    }
                }
            }
        }
    }
    return [pl,sl,el,epl]
}

function treeclimber(count,bm,ep,tpn,s,e){
    var z,x,y,tx,ty,mvl,a,aa,pl=[],el=[],sl=[],epl=[],bmc=(bm==bmove),mvt,mvworst=[99],mvbest=[-99]
    aa=board[e]
    a=board[e]=board[s]
    board[s]=0
    if(!count){
        board[s]=a
        board[e]=aa
    }   //for initial parse
    mvl=parse(bm,ep,tpn)
    if(!mvl) {
        board[s]=a
        board[e]=aa
        return [(bmc)?tpn+50:tpn-50,s,e,ep]
    }
    pl=mvl[0]
    sl=mvl[1]
    el=mvl[2]
    epl=mvl[3]
    if(count==level){
        if(bmc)for(z=0;z<pl.length;z++)if(pl[z]>mvbest[0])mvbest=[pl[z],sl[z],el[z],epl[z]]
        else for(z=0;z<pl.length;z++)if(pl[z]<mvworst[0])mvworst=[pl[z],sl[z],el[z],epl[z]]
    }
    else{
        for(z=0;z<pl.length;z++){
            mvt=treeclimber(count+1,8-bm,epl[z],pl[z],sl[z],el[z])
            if(mvt[0]>mvbest[0])mvbest=[mvt[0],sl[z],el[z],epl[z]]
            if(mvt[0]<mvworst[0])mvworst=[mvt[0],sl[z],el[z],epl[z]]
            //if (count==0)display2(sl[z],el[z],mvt[0],count)  //debug
        }
    }
    board[s]=a
    board[e]=aa
    return bmc?mvbest:mvworst
}

//*************************************making moves


function findmove(){
    var s,e,pn,themove
    strink="\ncolour="+bmove//debug
    themove=treeclimber(0,bmove,ep,0,0,0)
    display2(themove[1],themove[2],themove[0],themove[3])
    d.fred.bib.value+=strink//debug
    //alert(themove)
    pn=themove[0]
    s=themove[1]
    e=themove[2]
    shift(s,e)
    //showmove(s,e)
}


function B(it){
    var a=board[it]
    if(moveno%4){
        multi[0]=(multi[0]-1||1)
        multi[1]=(multi[0]-1||1)
    }
    if(!a&&!inhand) return
    if (a&&(bmove==(a&8))){     //ie, if one picked up of right colour, it becomes start
        if (inhand) d.images['i'+ss].src=inhand+'.gif'
        inhand=a
        ss=it
        d.images['i'+ss].src='0.gif'     //not real shift, but blank start
        return
    }
    if (inhand){
        if(test(ss,it)){      //if holding one, and test is good, it is end
            ++moveno
            shift(ss,it)
            bmove=bmove^8       //0 indicates white to move, 8 black
            millisecs1=new Date()       //timing routine
            findmove()          //do other colour
            millisecs2=new Date()
            d.fred.ep.value=millisecs2-millisecs1+ 'ms'
            bmove=bmove^8       //0 indicates white to move, 8 black
        }
        else{
            if (inhand)d.images['i'+ss].src=inhand+'.gif'
            a=0
        }
        inhand=0
    }
}

function test(s,e){
    var S,E,mvl,good,z,a,aa
    mvl=parse(bmove,ep,0)        //colour,en passant flag
    if(!mvl)alert('checkmate, I believe'+ bmove)
    good=0
    for(z=0;z<mvl[0].length;z++){
        S=mvl[1][z]
        E=mvl[2][z]
        aa=board[E]
        a=board[E]=board[S]
        board[S]=0
        good=good||(s==S&&e==E&&parse(8-bmove,9,42))
        //display(S,E,'')
        board[S]=a
        board[E]=aa
    }
    display(s,e,'the move')
    return good
}


function shift(s,e){
    var a=board[s]
    board[e]=a
    board[s]=0
    d.images['i'+s].src='0.gif'
    d.images['i'+e].src=a+'.gif'
}


//*************************************************************************************************************** debug

function display(s,e,a){
    var sx,sy,x,y
    sx=s%8
    sy=(s-sx)/8
    //if(isNaN(sy+1))alert("s:"+s+" e:"+e+" a:"+a)
    x=e%8
    y=(e-x)/8
    d.fred.bib.value+="\n"+lttrs.charAt(sx)+(sy+1)+'-'+lttrs.charAt(x)+(y+1)+'  '+a
}
function display2(s,e,a,b){
    var z,sx,sy,x,y,space=""
    sx=s%8
    sy=(s-sx)/8
    x=e%8
    y=(e-x)/8
    for (z=b;z<level;z++)space+=" "
    strink+="\n"+(moveno<10?" ":"")+moveno+". "+lttrs.charAt(sx)+(sy+1)+'-'+lttrs.charAt(x)+(y+1)+'    '+a
}



//*********************************************final write,etc

d.write(html)
