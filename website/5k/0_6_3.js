M=0
I=0
going=0
N=0
ep=0
Bt=1999
Al=-Bt
ss=0
s0=3;
mate=0;
d=document;


Ds=[10,-10];
BE=120;

Rheap=[]
G=[]
R=[]

KL=[3,3]
pv=[0,1,5,3,3,9,63,0]
MV=[0,0,[1,10],[21,19,12,8],[11,9],[1,10,11,9],[1,10,11,9],0]
for(z=0;z<8;){
pv[z+8]=pv[z]<<=4;
m=MV[z++]
if(m){
s=m.length
for(x=0;x<s;){
m[s+x]=-m[x++]
}
}
}

x='g00000000g'
y='gggggggggg'
b=y+y+"g23456432gg11111111g"+x+x+x+x+"g99999999ggABCDECBAg"+y+y
w=x+x+x+"000111100000123321000123553210"
Hs=[]
pw='000012346900';
b_pHs=[];
b_Hs=[];
for(y=0;y<12;y++){
for(x=0;x<10;x++){
z=(y*10)+x;
b_pHs[z]=parseInt(pw.charAt(y));
b_Hs[z]=parseInt(w.charAt((z<60)?z:119-z),35)&7;
R[z]=parseInt(b.charAt(z),35);
}
}
R[BE]=0;



A=E=d.all;
if (!E)event=0;
DM=d.getElementsByTagName||null;
if (DM||E){
d.write("<img src=0.gif id=pih name=pih width=20 height=32>");
A= (E||d.getElementsByTagName("img"));
Ic=A["pih"].style;
}



var cp=new Function('a','b','return b[0]-a[0]');
/****Z */
function Z(c, U, sc, s, e, A, B, EP){
var z=-1,sc=-sc;
var nU=8-U;
if (sc <-400)return [sc,s,e];
var b=Al;
var r=R;
var S,E=r[e];
r[e]=S=r[s];
r[s]=0;
if(S)G[nU][G[nU].length]=[S,e];


var rs,re;
if(S-U==1 && r[e+Ds[U>>3]]>15){
r[e]+=4;
}
if(S-U==6 && (s-e==2||e-s==2)){
rs=s-4+(s<e)*7;
re=(s+e)>>1;
r[rs]=0;
r[re]=U+2;	
}

var L=parse(U,EP,sc);
var N=L.length;
var mv;
if (N) {
if(c){	

var t;
var Cp=cp;	
L.sort(Cp);
c--;
best=L[0];
var bs=best[1];
var be=best[2];
b=-Z(c, nU, best[0], bs, be, -B, -A, best[3])[0];
for(z=1;z<N;z++){		
if (b>A)A=b;
mv = L[z];	
t= -Z(c, nU, mv[0], mv[1], mv[2], -A-1, -A, mv[3])[0];
if ((t>A) && (t<B)){
t= -Z(c, nU, mv[0],mv[1],mv[2],-B,-t, mv[3])[0];
}		
if (t>b){
b=t;
bs=mv[1];
be=mv[2];
if(t>A)A=t;
if (b>B){
break;
}
}
}
}	
else{
b=Al;

while(--N &&  B>b){
if(L[N][0]>b){
b=L[N][0];
}
}
}
}else{debug('no movelist')};
if(rs){
r[rs]=U+2;
r[re]=0;
}
r[s]=S;
r[e]=E;
G[nU].length--;

return [b,bs,be];
}


function safetywrapper(c,U,s,e,ep){
var E=R[e],S=R[e]=R[s];
R[s]=0;
prepare();
U=Z(c,U,0,BE,BE,Al,Bt,ep);
R[s]=S;
R[e]=E;
return U[0];
}









function findmove(){
level=d.fred.hep.selectedIndex+1;
var t=Z(level,M,0,BE,BE,Al,Bt,ep);
return move(t[1],t[2],0);
}


function move(s,e,Qn){
var E=R[e];
var S=R[s];
var a=S&7;
var Ux=M>>3;
var ch=0;
var t=0;
var z=0;
if (!M){prepare();var p=parse(M,ep,0);for (;z<p.length;z++){
t=t||(s==p[z][1]&&e==p[z][2]);
}
if (!t) {
going=0;
debug ('no such move!',p,'\ns e',s,e,'\n',S,E);
return 0;
}
if (safetywrapper(0,8-M,s,e,ep)>400)return 0;
}
if (safetywrapper(0,M,s,e,ep)>400){
debug('check!',t);
ch=1;
}
display2(s,e,E,ch);

if(safetywrapper(1,8-M,s,e,ep)<-400){	
finish(ch);
}
if((E&7)==6){finish(1);return0;}
Rheap[N]=[R.toString(),KL.toString(),ep];
ep=0;
var x=s%10;
var gap=e-s;
var D=Ds[Ux];
if(a==1){
if(R[e+D]>15)R[s]+=4-Qn;
if(gap==2*D && (R[e-1]&1||R[e+1]&1))ep=s+D;
if(!E&& gap%10)shift(e,e-D);
}
if(s==21+Ux*70||s==28+Ux*70)KL[Ux]&=(x<5)+1;
if(e==21+Ux*70||e==28+Ux*70)KL[!Ux]&=(x<5)+1;
if(a==6){

if(gap*gap==4){
shift(s-4+(s<e)*7,s+gap/2);
}
KL[Ux]=0;
}
shift(s,e);
prepare();
N++;
M=8-M;
return 1
}

function finish(ch){
dfbv(ch?'checkmate!':'stalemate!');
mate=ch++;
going=0;


}






function prepare(){
var z=99,Q;

s0=(N<32)?4-(N>>3):(N>64);
G[0]=[];
G[8]=[];
kHs=[];
pHs=[[],[]];
for(;z>20;z--){
a=R[z];
if(a&7){
G[a&8][G[a&8].length]=[a,z];
}
Hs[z]=b_Hs[z]*s0;
kHs[z]=(N>40)||(10-2*b_Hs[z])*s0;
Q=pHs[1][119-z]=pHs[0][z]=b_pHs[z];
if (N<7 && z>40){
pHs[0][z]=pHs[1][119-z]=Q+(Math.random()*Hs[z])|1;
Hs[24]=Hs[94]=29;
}
}


}




function parse(U,EP,tpn) {

var yx,tyx;
var h;
var E,a;
var cx;
var mv;
var k=-1;
var Ux=U>>3;
var nU=U^8;
var nx=nU>>3;
var D=Ds[Ux];
var mvl=[];
var m;
var wate;
var pH=pHs[Ux];

var H;
var cUx=KL[Ux];

var z;
var ak;
var mlen;
var pU=G[U];
if (! pU) alert('no pU');
var pbl=pU.length;
var B=R;
for (z=0;z<pbl;z++){
yx=pU[z][1];
a=B[yx];
if (pU[z][0]==a){	
a&=7;
if(a>1){
ak=a==6;
H=ak?kHs:Hs
wate=tpn-H[yx];
mv=MV[a];
if(a==3||ak){
for(cx=0;cx<8;){
tyx=yx+mv[cx++];
E=B[tyx];
if(!E||(E&24)==nU){
mvl[++k]=[wate+pv[E]+H[tyx],yx,tyx];
}
}
if(ak&&cUx){
if(cUx&1&&!(B[yx-1]+B[yx-2]+B[yx-3])&&check(yx-2,nU,D,-1)){
mvl[++k]=[wate+11,yx,yx-2];
}
if(cUx&2&&!(B[yx+1]+B[yx+2])&&check(yx,nU,D,1)){
mvl[++k]=[wate+12,yx,yx+2];
}
}
}
else{
mlen=mv.length;
for(cx=0;cx<mlen;){
E=0;
m=mv[cx++];
tyx=yx;
while(!E){
tyx+=m;
E=B[tyx];
if(!E||(E&24)==nU){
mvl[++k]=[wate+pv[E]+H[tyx],yx,tyx];
}
}
}
}
}
else{
wate=tpn-pH[yx];
tyx=yx+D;
if(!B[tyx]){
mvl[++k]=[wate+pH[tyx],yx,tyx];
if(! pH[yx] && (!B[tyx+D])){
mvl[++k]=[wate+pH[tyx+D],yx,tyx+D,tyx];
}
}
if(EP&&(EP==tyx+1||EP==tyx-1)){
mvl[++k]=[wate+pH[tyx],yx,EP];
}		
for(h=tyx-1;h<tyx+2;h+=2){
E=B[h]+U;
if(E&7&&E&8){
mvl[++k]=[wate+pv[E]+pH[h],yx,h];
}
}
}
}
}
return mvl;
}




function check(yx,nU,D,side){
var tyx,E,sx=yx%10,x,m,ex=yx+3,md=D+2,k=MV[3],B=R;
for(;yx<ex;yx++){
for(m=D-2;++m<md;){
E=B[yx+m];
if(E&&(E&8)==nU&&((E&8)==1||(E&7)==6))return 0;
E=0;
tyx=yx;
while(!E){
tyx+=m;
E=B[tyx];
if((E==nU+2+(m!=D)*2)||E==nU+5)return 0;
}
}
for (z=0;z<8;){
if(B[yx+k[z++]]-nU==3)return 0;
}
}
E=0;
yx-=3;
while (!E){
yx-=side;
E=B[yx];
if(E==nU+2||E==nU+5)return 0;
}
return 1;
}








function B(it){
var a=R[it],p='pih';
if (mate)return;
if (ss==it && I){
Bim(p,0);
Bim(ss,I,1);
I=0;
return;
}
if (a&&M==(a&8)){
if (I) Bim(ss,I,1);
I=a;
ss=it;
Bim(ss,0,1);
Bim(p,a);
if(E)drag();
d.onmousemove=drag;
return;
}
if (I){
if(move(ss,it,d.fred.hob.selectedIndex,y)){
Bim(p,0);
d.onmousemove=null;
if(A) Ic.top=Ic.left='0px';
I=0;
B2();
}
}
}





Btime=0;
function B1(){
if(!mate && findmove()){
Btime=setTimeout("B2()",500)
}
else{ going=0}
}
function B2(){
if (going || P!=M){
clearTimeout(Btime);
B1();
}
}






function shift(s,e){
var z=0,a=R[s];
R[e]=a;
R[s]=0;
Bim(s,0,1);
Bim(e,a,1);
}

function display2(s,e,b,c){
var x=s%10,t=e%10,n=1+(N>>1),l="abcdefgh";
dfbv((M?'     ':(n<10?" ":"")+n+".  ")+l.charAt(x-1)+((s-x)/10-1)+(b?'x':'-')+l.charAt(t-1)+((e-t)/10-1)+(c?'+':' '));
}

function dfbv(x){
d.fred.bib.value+='\n '+x;
}




function refresh(bw){
P=bw;
for (var z=0;z<BE;z++){
if(R[z]<16)Bim(z,R[z],1);
}

}


function goback(){
if (!N)return;
N-=2;
var b=Rheap[N];
R=eval("["+b[0]+"]");
KL=eval("["+b[1]+"]");
dfbv(' --undo--');
ep=b[2];
M=N%2;
refresh(M);
prepare();
}


var px="px";
function drag(e) {
e=e||event;
Ic.left=(e.clientX+1)+px;
Ic.top=(e.clientY-4)+px;
}

function Bim(img,src,swap){
if (A || img!='pih'){
if (swap){
img="i"+(P?119-img:img);
}
d.images[img].src=src+'.gif';
}
}





html='<table cellpadding=4>'
for (y=90;y>10;y-=10){
html+="<tr>"
for(x=0;x<10;x++){
z=y+x
if(x&&x<9){
html+=('<td class=' + (x+(y/10)&1?'b':'w') + '><a href="#" onclick="B(P?119-'+z+':'+z+');return false"><img src=0.gif width=7 height=40 border=0><img src=0.gif width=25 height=40 name=i'+z+' border=0><img src=0.gif width=7 height=40 border></a></td>\n')
}
}
html+='</tr>\n'
}
html+='</table>'


d.write(html);
refresh(0);
