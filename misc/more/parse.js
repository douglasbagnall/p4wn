/* parse - goes thru and finds every move, whilst maintaining a 
 * count of material taken and estimating the positional value
 * of each move.
 * check - to see whether castling is possible.
 *
 * but first some stuff to calculate closeness of kings, and pawn-doubling
 * - trying to keep calculation outside of parse()
 */


moves=[0,0,[1,10],[21,19,12,8],[11,9],[1,10,11,9],[1,10,11,9],0]       //in order _,p,r,n,b,q,k       
castle=[3,3] // castle[0] &1 is white's left, castle[0]&2 is right castle


kp=[25,95]// points to king - to be used in weighting 

pv=[0,1,5,3,3,9,63,0]  // value of various pieces
weight=[]              // gets made into centre waiting 


/* fill up moves list, and increase move pieces.
 * I can't see that it's better than longer lists
 */
PV=[[],[]]
for(z=0;z<8;z++){
    pv[z+8] = pv[z]*=10;
}
    //    PV[0][z+8] = PV[0][z] = pv[z]  //same piece values for black and white
    //PV[1][z+8] = PV[1][z] = pv[z]+5  //but slight tendency against swaps (pv2 is greater).
    //    mz=moves[z]// should be ref to same array as moves[z]
    //if(mz){ // adding in negative version of the move (ie backwards for white)
    //	s=mz.length           //probably some better way
    //for(x=0;x<s;){
    //    mz[s+x]=-mz[x++]
    //}
    //}
    //    moves[z+8]=moves[z++]        //both refer to same array
//}



/* 
 * weights - tilt pieces in various ways (mostly centralising).
 * board - where stuff happens
 * screenboard - maps board onto screen
 */


board=[]   //where it all happens - a 120 byte array 
boardmoves=[]
// hoffmanesque compression of board.
x='g00000000g'         //g stands for off board
y='gggggggggg'
bstring=y+y+"g23456432gg11111111g"+x+x+x+x+"g99999999ggABCDECBAg"+y+y  //in base 35 (g is 16)
wstring=x+x+x+"000111100000123321000123553210"                         //weighting string -mirror image

//weight=[]
weights=[]
//for (z=2;z<6;z++){
//   weights[z]=weights[z+8]=weight
//}
pw='000012346900';
b_pweights=[];
b_weights=[];    // central weighting for ordinary pieces.


pawn_moves=[];
pawn_takes=[];
dirs=[10,-10];

for(y=0;y<12;y++){
    for(x=0;x<10;x++){
	z=(y*10)+x;
	b_pweights[z]=parseInt(pw.charAt(y)); //also need to add main weight set at start.
	b_weights[z]=parseInt(wstring.charAt((z<60)?z:119-z),35)&7; // for all the ordinary pieces
	board[z]=parseInt(bstring.charAt(z),35);
	//now find the moves from each place.
	//the point is to move this calculation out of the time-critical parse routine 
	// (where an array look-up can be used instead)
	boardmoves[z]='help!';
	if (board[z]!=16){
	    boardmoves[z]=[];
	    for(ptype=2;ptype<7;ptype++){
		boardmoves[z][ptype]=[];
		mv=moves[ptype];
		plen=0;
		for(v=0;v<mv.length;v++){
		    //now, in the case of knights and kings, the final position is stored.
		    //In the case of other major pieces, the vector is stored.
		    //twice in either case. (?? in case black ever uses moves array without a&7)
		    if(board[z+mv[v]]!=16){			
			boardmoves[z][ptype][plen++]=(ptype==3||ptype==6)*z + mv[v];
		    }
		    if(board[z-mv[v]]!=16){			
			boardmoves[z][ptype][plen++]=(ptype==3||ptype==6)*z - mv[v];
		    }
		}
	    }
	    //	    pawnmoves[z][0]=[];
	    //pawnmoves[z][8]=[];
	    //pawntakes[z][0]=[];
	    //pawntakes[z][8]=[];
	    //for(w=0;w<2;w++){
	    //	dir=dirs[w];
	    //ddir=dir*2;
	    //if(board[z-ddir]==16){  //2 squares at start
	    //    pawnmoves[z][w<<3]=[z+dir, z+ddir];
	    //}
	    //else{
	    //    pawnmoves[z][w<<3]=[z+dir];
	    //}
	    //for(h=-1;h<2;h+=2){  //h=-1,1 --for pawn capturing
	    //    if(board[z+dir+h]!=16){
	    //	ptlen=0;
	    //	pawntakes[z][ptlen++]=z+dir+h;
	    //    }
	    //}	       
	    //}
	}
    }
}
board[120]=0;
boardmoves[120]=[];



var pieces=[]//becomes array of each colours pieces and positions

/* prepare()  - called just before leaping into treeclimber.
 * or before human move (so move()s treeclimbs are configured right)
 * sets up proper weighting for this moveno, and collects the movable pieces.
 */   


s00=3;
s0=4;
s1=1;
function prepare(){
    var z,BM;
    //    alert('in prepare');
    
    if(!(moveno&7) && s0>1)s0--;//every 4 moves for first 20, s0 decreases.
    s1=(moveno>>4)&1;   //every sixteen moves s1 increases
    pieces[0]=[];
    pieces[8]=[];
    kweights=[];
    pweights=[[],[]];
    for(z=21;z<99;z++){
	// get moveno, and work out appporopriate weightings from it.
	// using base weightings.       	
	a=board[z];
	if(a&7){
	    pieces[a&8][pieces[a&8].length]=[a,z];
	}
	weights[z]=b_weights[z]*s0;
	kweights[z]=(moveno>40)||(10-2*b_weights[z])*s0;// while moveno <= 40, weight to edge. 
	pweights[1][119-z]=pweights[0][z]=b_pweights[z];//centralising for first 8 moves, then forwards only.
	if (moveno<5 && z>40)pweights[0][z]=pweights[1][119-z]+=(Math.random()*weights[z])>>1;
    }
    // debug("moveno s0,s1",moveno,s0,s1);
    //    alert(pieces);
}



/* also pawn doubling - array of pawn positions?
 * setting to 1 flags that column as empty.
 * can either be 2 arrays or 1 with 8 bit to flag black.  
 */;


pawns=[[],[]];
dirs=[10,-10];

function parse(bm,EP,tpn) {
    //	var bord=board
    var yx,tyx;    //start and end position  
    var h;         //for pawn taking moves
    var E,a;       //E=piece at end place, a= piece moving
    //    var ic;     // ic - initial closeness(to king); 
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
	//	if (boardmoves[yx]=='help!') {alert(yx)};
	if (pbm[z][0]==a){	    
	    //	    if(a&7&&bm==(a&8)) { // already know a is bm safe, from pieces[bm] list
	    a&=7;
	    if(a>1){    //non-pawns
		ak=a==6;
		weight=ak?kweights:weights //different weight tables for king/knight
		wate=tpn-weight[yx];		
		mv=boardmoves[yx][a];  //lookup in moves table!	      
		mlen=mv.length
		if(a==3||ak){
		    for(cx=0;cx<mlen;){     //knights,kings
			tyx=mv[cx++];
			E=B[tyx];
			if(!E||(E&8)==nbm){
			mvl[++k]=[wate+pv[E]+weight[tyx],yx,tyx]; 
			//rating,start,end,-- enpassant left undefined
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
		    //		    if(B[tyx+dir]&16){      //queening, now done in pweights thingy
		    //mvl[k][0]+=80;                         //overwrite previous
		    //}
		    if(! pweight[yx] && (!B[tyx+dir])){  //2 squares at start - start flagged by 0 pweights weighting
			mvl[++k]=[wate+pweight[tyx+dir],yx,tyx+dir,tyx];    //ep points to the takeable spot
		    }
		}
		if(EP&&(EP==tyx+1||EP==tyx-1)){//&& bm!=(B[EP-dir]&8)) { 
		    //enpassant. if EP is working proper, the last test is
		    //redundant		    
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
    return mvl; //[mvl,beta]  //[[pl,s,e,EP],...]
}


//************************************CHECK

function check(yx,nbm,dir,side){         //dir is dir
    var tyx,E,E7,sx=yx%10,x,m,ex=yx+3,md=dir+2,k=moves[3],B=board;
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
