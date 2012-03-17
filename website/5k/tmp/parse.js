









moves=[0,0,[1,10],[21,19,12,8],[11,9],[1,10,11,9],[1,10,11,9],0]
castle=[3,3]


kp=[25,95]

pv=[0,1,5,3,3,9,63,0]
weight=[]





PV=[[],[]]
for(z=0;z<8;z++){
pv[z+8] = pv[z]*=10


mz=moves[z]
if(mz){
s=mz.length
for(x=0;x<s;){
    mz[s+x]=-mz[x++]
}
}

}










board=[]


x='g00000000g'
y='gggggggggg'
bstring=y+y+"g23456432gg11111111g"+x+x+x+x+"g99999999ggABCDECBAg"+y+y
wstring=x+x+x+"000111100000123321000123553210"


weights=[]



pw='000012235900'
b_pweights=[];
b_weights=[];
screenboard=[];
for(y=0;y<12;y++){
for(x=0;x<10;x++){
z=(y*10)+x;
b_pweights[z]=parseInt(pw.charAt(y));
b_weights[z]=parseInt(wstring.charAt((z<60)?z:119-z),35)&7;
board[z]=parseInt(bstring.charAt(z),35);
screenboard[z]=z;
}
}
board[120]=0;




var pieces=[]






s0=3;
s1=1;
function prepare(){
var z,BM;

s0-=(moveno%5&&s0>1);
s1+=(moveno>>4)&1;
pieces[0]=[];
pieces[8]=[];
kweights=[];
pweights=[[],[]];
for(z=21;z<99;z++){


a=board[z];
if(a&7){
pieces[a&8][pieces[a&8].length]=[a,z];
}
weights[z]=b_weights[z]*s0;
kweights[z]=(moveno>40)||(10-2*b_weights[z])*s0;
pweights[1][119-z]=pweights[0][z]=b_pweights[z]+((moveno<8)*b_weights[z]>>1)<<1;
}

}









pawns=[[],[]];
dirs=[10,-10];

function parse(bm,EP,tpn) {

var yx,tyx;
var h;
var E,a;

var cx;
var mv;
var k=-1;
var bmx=bm>>3;
var nbm=bm^8;
var nx=nbm>>3;
var dir=dirs[bmx];
var mvl=[];
var m;
var wate;
var pweight=pweights[bmx];

var weight;
var cbmx=castle[bmx];

var z;
var ak;
var mlen;
var pbm=pieces[bm];
if (! pbm) alert('no pbm');
var pbl=pbm.length;
var B=board;
for (z=0;z<pbl;z++){
yx=pbm[z][1];
a=B[yx];
if (pbm[z][0]==a){

a&=7;
if(a>1){
ak=a==6;
weight=ak?kweights:weights
wate=tpn-weight[yx];
mv=moves[a];
if(a==3||ak){
for(cx=0;cx<8;){
tyx=yx+mv[cx++];
E=B[tyx];
if(!E||(E&24)==nbm){
mvl[++k]=[wate+pv[E]+weight[tyx],yx,tyx];

}
}
if(ak&&cbmx){
if(cbmx&1&&!(B[yx-1]+B[yx-2]+B[yx-3])&&check(yx-2,nbm,dir,-1)){
mvl[++k]=[wate+11,yx,yx-2];
}
if(cbmx&2&&!(B[yx+1]+B[yx+2])&&check(yx,nbm,dir,1)){
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
if(!E||(E&24)==nbm){
mvl[++k]=[wate+pv[E]+weight[tyx],yx,tyx];
}
}
}
}
}
else{
wate=tpn-pweight[yx];
tyx=yx+dir;
if(!B[tyx]){
mvl[++k]=[wate+pweight[tyx],yx,tyx];



if(! pweight[yx] && (!B[tyx+dir])){
mvl[++k]=[wate+pweight[tyx+dir],yx,tyx+dir,tyx];
}
}
if(EP&&(EP==tyx+1||EP==tyx-1)){


mvl[++k]=[wate+pweight[tyx],yx,EP];
}
for(h=tyx-1;h<tyx+2;h+=2){
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




function check(yx,nbm,dir,side){
var tyx,E,E7,sx=yx%10,x,m,ex=yx+3,md=dir+2,k=moves[3],B=board;
for(;yx<ex;yx++){
for(m=dir-2;++m<md;){
E=B[yx+m];
if(E&&(E&8)==nbm&&((E&7)==1||(E&7)==6))return 0;
E=0;
tyx=yx;
while(!E){
tyx+=m;
E=B[tyx];

if((E==nbm+2+(m!=dir)*2)||E==nbm+5)return 0;
}
}
for (z=0;z<8;){
if(B[yx+k[z++]]-nbm==3)return 0;
}
}
E=0;
yx-=3;
while (!E){
yx-=side;
E=B[yx];
if(E==nbm+2||E==nbm+5)return 0;
}
return 1;
}
