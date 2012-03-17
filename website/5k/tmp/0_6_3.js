







bmove=0
inhand=0
going=0
player=0
moveno=0
mn50=0
ep=0

parsees=0
prunees=0
evaluees=0
Bt=1999
Al=-Bt

ss=0

d=document
lttrs="abcdefgh"

boardheap=[]












var comp=new Function('a','b','return b[0]-a[0]');























function treeclimber(count, bm, sc, s, e, alpha, beta, EP){
var z=-1;
sc=-sc;
var nbm=8-bm;
if (sc <-400)return [sc,s,e];


var b=Al;
var S,E=board[e];
board[e]=S=board[s];
board[s]=0;


if(S)pieces[nbm][pieces[nbm].length]=[S,e];














var movelist;
var movecount;
var mv;
movelist=parse(bm,EP,sc);
movecount=movelist.length;
parsees+=movecount;
evaluees++;
if(count){

var t;
var cmp=comp;

movelist.sort(cmp);
count--;
best=movelist[0];
var bs=best[1];
var be=best[2];
b=-treeclimber(count, nbm, best[0], bs, be, -beta, -alpha, best[3])[0];


for(z=1;z<movecount;z++){

if (b>alpha)alpha=b;


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
b=Al

while(--movecount &&  beta>b){
if(movelist[movecount][0]>b){
b=movelist[movecount][0];
}
}
}




board[s]=S;
board[e]=E;
pieces[nbm].length--

return [b,bs,be];
}





function findmove(){
var s,e,pn,themove,sb,bs;
millisecs1=new Date();
level=d.fred.hep.selectedIndex+1;
evaluees=parsees=prunees=0;
themove=treeclimber(level,bmove,0,120,120,Al,Bt,ep);
millisecs2=new Date();

bubbit("prs:"+parsees+ "eval:"+evaluees+" prune:"+prunees);
pn=themove[0];
s=themove[1];
e=themove[2];




return move(s,e,0,pn+" "+(millisecs2-millisecs1)+ 'ms' );
}


function move(s,e,queener,score){
var E=board[e];
var S=board[s];
var a=S&7;
var bmx=bmove>>3;
var dir=dirs[bmx];
var x=s%10;


var gap=e-s;
var ch;
var test=0;

var p=parse(bmove,ep,0);
for (z=0;z<p.length;z++){
var t=p[z];
test= test || (s==t[1] && e==t[2]);
}
if (!test) {
going=0;
debug ('no such move!',p,'\ns e',s,e,'\n',S,E,'\n',score);
return 0;
}

themove=treeclimber(0,8-bmove,0,s,e,Al,Bt,ep);
if (themove[0]<-400){
debug('in check',themove);
return false;
}

themove=treeclimber(0,bmove,0,s,e,Al,Bt,ep);
if (themove[0]<-400){
debug('check!',themove);
ch=1;
}



if(treeclimber(1,8-bmove,0,s,e,Al,Bt,ep)[0]<-400){
going=0;
debug(ch?'checkmate':'stalemate');
}






boardheap[moveno]=[board.toString(),castle.toString(),ep];
display2(s,e,score,E,ch);
ep=0;
if(a==1){

if(board[e+dir]>15)board[s]+=4-queener;
if(e==s+2*dir && (board[e-1]&1||board[e+1]&1))ep=s+dir;
if(!E&&(s-e)%10)shift(e,e-dir);
}
if(s==21+bmx*70||s==28+bmx*70)castle[bmx]&=(x<5)+1;
if(a==6){

kp[bmx]=e;
if(gap*gap==4){

shift(s-4+(s<e)*7,s+gap/2);
}
castle[bmx]=0;
}

shift(s,e);

moveno++


bmove=8-bmove;
prepare();
return 1;
}

