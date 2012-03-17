


A=E=d.all;
if (!E)event=0;
DOM=d.getElementsByTagName || null;
if (DOM||E){
d.write("<img src=0.gif id=pih name=pih width=20 height=32>");
A= (E||d.getElementsByTagName("img"));
itch=A["pih"].style;
}

function B(it){
var a,z,p

a=board[it]
if (ss==it && inhand){
Bim('pih',0)
Bim(ss,inhand,1)
inhand=0;
return
}
if (a&&(bmove==(a&8))){
if (inhand) Bim(ss,inhand,1)
inhand=a
ss=it
Bim(ss,0,1)
Bim('pih',a)
if(E)drag()
d.onmousemove=drag;
return
}

if (inhand){
bubbit('trying '+ss+' '+it)
if(move(ss,it,d.fred.hob.selectedIndex,y)){
Bim('pih',0);
d.onmousemove=null;
if(A) itch.top=itch.left='400px'
inhand=0;
}
}
}


Btime=0
function B1(){
if(findmove()){
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







function refresh(bw){
player=bw;
for (var z=0;z<120;z++){
screenboard[z]=(z);
if(board[z]<16)Bim(screenboard[z],board[z],1);
}


}


function goback(x){
if (x>moveno)return
moveno-=x
var b=boardheap[moveno]

board=eval("["+b[0]+"]")
castle=eval("["+b[1]+"]")
ep=b[2]
bmove=moveno%2
refresh(bmove)
}


var px="px";
function drag(e) {
e=e||event
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
prepare();
