/* parse - goes thru and finds every move, whilst maintaining a 
 * count of material taken and estimating the positional value
 * of each move.
 * check - to see whether castling is possible.
 *
 * but first some stuff to calculate closeness of kings, and pawn-doubling
 * - trying to keep calculation outside of parse()
 */


q=[1,10,11,9]
moves=[0,0,[1,10],[21,19,12,8],[11,9],q,q,0]       //in order _,p,r,n,b,q,k       
castle=[3,3] // castle[0] &1 is white's left, castle[0]&2 is right castle
ky=[20,90]   // points to king - to be used in weighting 
kx=[5,5]
kp=[25,95]
pv=[0,1,5,3,3,9,63,0]  // value of various pieces
weight=[]              // gets made into centre waiting 



/* fill up moves list, and increase move pieces.
 * I can't see that it's better than longer lists
 */
PV=[[],[]]
for(z=0;z<8;){
    pv[z+8] = pv[z]*=10
    
    PV[0][z+8] = PV[0][z] = pv[z]  //same piece values for black and white
    PV[1][z+8] = PV[1][z] = pv[z]+5  //but slight tendency against swaps (pv2 is greater).
    if(moves[z]){
	s=moves[z].length           //probably some better way
	for(x=0;x<s;){
	    moves[z][s+x]=-moves[z][x++]
	}
    }
    moves[z+8]=moves[z++]          //both refer to same array
}



/* 
 * weights - tilt pieces in various ways (mostly centralising).
 * board - where stuff happens
 * screenboard - maps board onto screen
 */
pw='000012235700'
board=[]   //where it all happens - a 120 byte array 
// hoffmanesque compression of board.
x='g00000000g'         //g stands for off board
y='gggggggggg'
bstring=y+y+"g23456432gg11111111g"+x+x+x+x+"g99999999ggABCDECBAg"+y+y  //in base 35 (g is 16)
wstring=x+x+x+"000111100000123321000123553210"                         //weighting string -mirror image

weight=[]
weights=[]
for (z=2;z<6;z++){
    weights[z]=weights[z+8]=weight
}

screenboard=[]
for(y=0;y<12;y+_){
    for(x=0;x<10;x++){
	z=(y*10)+x;
	weights[9][119-z]=weights[1][z]=parseInt(pw.charAt(y)) //also need to add main weight set at start.
	weight[z]=parseInt(wstring.charAt(((z<60)?z:119-z)),35) // for all the ordinary pieces
	board[z]=parseInt(bstring.charAt(z),35)
	screenboard[z]=z
}
board[z]=0



/*
 * Closeness calculations - useless as currently formulated
 * 
 */


closeness=[0,0,[],[],[],[],[]]

z=0;
for(x=-2;x<3;x++){
    for(y=-2;y<3;y++){// so y is 
	p=40+y*10+x;
	closeness[6][p]=4-Math.abs(y)-Math.abs(x);
	closeness[3][p]=closeness[6][p]+(x==2*y||y==2*x);
	closeness[2][p]=closeness[6][p]+(x==0||y==0);
	closeness[4][p]=closeness[6][p]+(x==y);
	closeness[5][p]=closeness[6][p]+(x==0||y==0||y==6);
    }
}


/*
 * how to do it properly?
 * 'closeness' for rooks is rows and columns, bishops is diagonals
 * before each move, 'close' spots could be calculated for either king, 
 * and if the king moves during parsing, that is too bad.
 * or a huge table can be constructed for each king position.
 * 64 arrays of 120 (64 filled) positions. Then the kings exact 
 * position can be used each time. How slow will this make the start?
 * 
 */ 
;
/* also pawn doubling - array of pawn positions?
 * setting to 1 flags that column as empty.
 * can either be 2 arrays or 1 with 8 bit to flag black.  
 */;


pawns=[[],[]];

function parse(bm,EP,tpn) {
    //	var bord=board
    var tyx,yx;
    var h,E,a;
    var ic,cx,mv;
    var k=-1,bmx=bm>>3;
    var nbm=bm^8,nx=nbm>>3;
    var dir=10-bmx*20,mvl=[];
    var m,wate,cbmx=castle[bmx];    
    //    var pv=PV[bm==bmove];
    var z;
    var pbm=pieces[bm];
    for (z=0;z<pbm.length;z++){
	yx=pbm[z][1];
	a=board[yx];
	if (pbm[z][0]==a){	    
	    //	    if(a&15&&bm==(a&8)) { // already know a is bm safe, from pieces[bm] list
	    wate=weight[yx]*M2
		a&=7;
	    if(a>1){    //non-pawns
		ic=(closeness[a][40+kp[nx]-yx]||0); //initial closeness
		var ak=a==6;
		mv=moves[a];
		if(a==3||ak){
		    for(cx=0;cx<8;){     //knights,kings
			tyx=yx+mv[cx++];
			E=board[tyx];
			if(!E||(E&24)==nbm){
			mvl[++k]=[tpn+pv[E]+(ak?0:weight[tyx]*M1)-wate,yx,tyx]; 
			//rating,start,end,-- enpassant left undefined
			}
		    }
		    if(ak&&cbmx){
			if(cbmx&1&&!(board[yx-1]+board[yx-2]+board[yx-3])&&check(yx-2,nbm,dir,-1)){//Q side
			    mvl[++k]=[tpn+11,yx,yx-2];     //no analysis, just encouragement
			}
			if(cbmx&2&&!(board[yx+1]+board[yx+2])&&check(yx,nbm,dir,1)){//K side
			    mvl[++k]=[tpn+12,yx,yx+2];                                //no analysis, just encouragement
			}
		    }
		}
		else{//rook, bishop, queen
		    var mlen=mv.length;
		    for(cx=0;cx<mlen;){     //goeth thru list of moves
			E=0;
			m=mv[cx++];
			tyx=yx;
			while(!E){   //while on board && no piece
			    tyx+=m;
			    E=board[tyx];
			    if(!E||(E&24)==nbm){
				mvl[++k]=[tpn+pv[E]+(weight[tyx]*M1)-wate,yx,tyx];
			    }
			}
		    }
		}
	    }
	    else{    //pawns
		tyx=yx+dir;
		if(!board[tyx]){
		    mvl[++k]=[tpn+weight[tyx]*M1-wate,yx,tyx];
		    if(board[tyx+dir]&16){  //queening
			mvl[k][0]+=80;                         //overwrite previous
		    }
		    if(board[yx-dir-dir]&16&&(!board[tyx+dir])){  //2 squares at start
			mvl[++k]=[tpn+weight[tyx+dir]*M1-wate,yx,tyx+dir,tyx];    //ep points to the takeable spot
		    }
		}
		if(EP&&(EP==tyx+1||EP==tyx-1)&& bm!=(board[EP-dir]&8)) {       //enpassant
		    mvl[++k]=[tpn+1+weight[tyx]*M1-wate,yx,EP];
		}
		for(h=-1;h<2;h+=2){                        //h=-1,1 --for pawn capturing
		    E=board[tyx+h];
		    if(E&15 && (E&8)!=bm){
			mvl[++k]=[tpn+pv[E]+weight[tyx+h]*M1-wate,yx,tyx+h];
		    }
		}
	    }
	}
    }
    return mvl; //[mvl,beta]  //[[pl,s,e,EP],...]
}


//************************************CHECK

function check(yx,nbm,dir,side){         //dir is dir
    var tyx,E,E7,sx=yx%10,x,m,ex=yx+3,md=dir+2,k=moves[3];
    for(;yx<ex;yx++){ //go thru 3positions, checking for check in each
	for(m=dir-2;++m<md;){
	    E=board[yx+m];
	    if(E&&(E&8)==nbm&&((E&7)==1||(E&7)==6))return 0;        //don't need to check for pawn position --cannot arrive at centre without passing thru check
	    E=0;
	    tyx=yx;
	    while(!E){   //while on board && no piece
		tyx+=m;
		E=board[tyx];
		//                if (E&16)break
		if((E==nbm+2+(m!=dir)*2)||E==nbm+5)return 0;
	    }
	}
	for (z=0;z<8;){
	    if(board[yx+k[z++]]-nbm==3)return 0;      //knights
	}
    }
    E=0;
    yx-=3;
    while (!E){   //queen or rook out on other side
	yx-=side;
	E=board[yx];
	if(E==nbm+2||E==nbm+5)return 0;
    }
    return 1;
}
