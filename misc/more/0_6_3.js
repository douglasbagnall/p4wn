/*
 * 5k chess -by douglas@paradise.net.nz
 * 
 * DEV -denotes debugging or development use only.
 * MVL -used in move list only. can be scrapped if necessary. 
 *
 */

bmove=0    // the moving player 0=white 8=black
inhand=0   // piece in hand (ie, during move)
going=0    // DEV: denotes auto play, or not. 
player=0   // human colour (0=white, 8=black)
moveno=0   // no of moves  
mn50=0     // flags no of moves > 50. (makes pieces hone in on king)
ep=0       //en passant state (points to square behind takable pawn, ie, where the taking pawn ends up.

parsees=0  //DEV: number of moves read by parser
prunees=0  //DEV: number of parsses cut off without evaluation
evaluees=0 //DEV: number of times in treeclimber
Bt=1999    
Al=-Bt

ss=0       //used in display.js

d=document
lttrs="abcdefgh"   //MVL: lookup table for move list.

boardheap=[]  // history of board state, for undo.



//**************************************************functions
// tyx==position+ move (temp yx)
// bmx== blackness flag
// k
// yx,h,E,a,cx,mv,k=-1,bmx=bm>>3,dir=bmx*10-20,mvl=[],mvlength,wate

//################treeclimb
//tpn == cumulative score

var comp=new Function('a','b','return b[0]-a[0]'); //comparison function for treeclimb integer sort (descending)
    /* TREECLIMBER - climbs trees
     * count - parse depth (0=leaf node)
     * bm    - colour of player to move
     * tpn   - running evaluation of move.
     * EP    - position of enpassent (if any) 
     * pruner- flag for lossy forward pruning
     * alpha, beta
     * s,e - start, end
     */
    /* z     - used in loops
     * movelist - produced by parsing  [score,start,end,EP]
     * movecount -length of movelist.
     * mv    - the move in question
     * sc    - score of this move
     * ep    - enpassent in a variation
     * b,a   - temporary alpha, beta
     * cmp   - localised comparison function
     * t     - first alphabeta try
     * best  - best in this branch
     */      



function treeclimber(count, bm, sc, s, e, alpha, beta, EP){
    var z=-1;
    sc=-sc;
    var nbm=8-bm;
    if (sc <-400)return [sc,s,e];      //if king taken, no deepening.
    //    if (sc > 400)return [sc,s,e]; //if king taken, no deepening.

    var b=Al;     //best move starts at -infinity    
    var S,E=board[e];
    board[e]=S=board[s];
    board[s]=0;
    //rather than trying to track changes
    //parse checks to see if each one is still there
    if(S)pieces[nbm][pieces[nbm].length]=[S,e]; 


    //now some stuff to handle queening, castling
    var rs,re;
    if(S&7==1 && board[e+dirs[bm>>3]]>15){
    	board[e]+=4-queener; //queener is choice for pawn queening
    }
    if(S&7==6 && (s-e==2||e-s==2)){  //castling - move rook too
    	rs=s-4+(s<e)*7;
    re=(s+e)>>1; //avg of s,e=rook's spot
    board[rs]=0;
    board[re]=bm+2;	    
    }

    var movelist;
    var movecount;
    var mv;
    movelist=parse(bm,EP,sc);   
    movecount=movelist.length;
    parsees+=movecount;
    evaluees++;
    if (movecount) {
	if(count){	
	    //BRANCH NODES 
	    var t;
	    var cmp=comp;
	
	    movelist.sort(cmp); //descending order
	    count--;
	    best=movelist[0];
	    var bs=best[1];
	    var be=best[2];
	    b=-treeclimber(count, nbm, best[0], bs, be, -beta, -alpha, best[3])[0];
	    
	    //	best[0]=b;
	    for(z=1;z<movecount;z++){
		
		if (b>alpha)alpha=b;  //b is best
		//alpha is always set to best or greater.
		
		mv = movelist[z];	   
		// try now with empty window - assuming fail.
		t= -treeclimber(count, nbm, mv[0], mv[1], mv[2], -alpha-1, -alpha, mv[3])[0];
		if ((t>alpha) && (t<beta)){
		    // but if not fail, now look for the actual score.
		    //which becomes new best.
		    t= -treeclimber(count, nbm, mv[0],mv[1],mv[2],-beta,-t, mv[3])[0];
		}
		
		if (t>b){ 
		    // if this move is still better than best,
		    // it becomes best. 
		    b=t;
		    bs=mv[1];
		    be=mv[2];
		    //		best[0]=b;
		    // and alpha becomes this score,
		    // and if this is better than beta, stop looking.
		    if(t>alpha)alpha=t;
		    if (b>beta){
			// if best > beta, other side won't have it.
			break;
		    }
		}
	    }
	}	    
	else{
	    b=Al;
	    //LEAF NODES
	    while(--movecount &&  beta>b){
		if(movelist[movecount][0]>b){
		    b=movelist[movecount][0];
		}
	    }
	}
    }	    
    if(rs){
	board[rs]=bm+2;
	board[re]=0;
    }
    board[s]=S;
    board[e]=E;
    pieces[nbm].length--;
    
    return [b,bs,be];
}



//*************************************making moves

function findmove(){
    var s,e,pn,themove,sb,bs;
    millisecs1=new Date();       //timing routine
    level=d.fred.hep.selectedIndex+1;
    evaluees=parsees=prunees=0;
    themove=treeclimber(level,bmove,0,120,120,Al,Bt,ep);
    millisecs2=new Date();
    //d.fred.ep.value=millisecs2-millisecs1+ 'ms'
    bubbit("prs:"+parsees+ "eval:"+evaluees+" prune:"+prunees);
    pn=themove[0];
    s=themove[1];
    e=themove[2];

    /*    //testing this here
    var test=0;
    var p=parse(bmove,ep,0);  
    for (z=0;z<p.length;z++){
	var t=p[z];
	test= test || (s==t[1] && e==t[2]);
    }
    if (!test) {
	going=0;
	debug ('no such move in findmove!',p,'\ns e',s,e);
    }
    //end test
    */

    return move(s,e,0,pn+" "+(millisecs2-millisecs1)+ 'ms' );
}


function move(s,e,queener,score){
    var E=board[e];
    var S=board[s];
    var a=S&7;
    var bmx=bmove>>3;
    var dir=dirs[bmx];
    var x=s%10;
    //    var tx=e%10;
    //    var ty=e-tx;
    var gap=e-s;
    var ch;
    var test=0;
    //test if this move is legal
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
    var themove;
    // now see whether in check after this move, by getting the best reply.  

    //    shift(s,e);

    board[e]=S;
    board[s]=0;
    p=pieces[bmove];
    for (z=0;z<p.length;z++){
	if (p[z][1]==s)p[z][1]=e;
	//debug(p)
    }

    themove=treeclimber(0,8-bmove,0,120,120,Al,Bt,ep);
    if (themove[0]>400){
	debug('in check',themove);
	return false;
	
    }

    //if got this far, the move is accepted. 
    // there is no turning back

    // now see if it is check and/or mate
    // but first move the piece

    //now assume null opposition move, to see if putting in check
    //note passing s,e to treeclimber instead of shifiting it would not
    //work, because the move gets appended to the opponent of the treeclimbing one.

    p=pieces[bmove];
    for (z=0;z<p.length;z++){
	if (p[z][1]==s)p[z][1]=e;
	//debug(p)
    }

    themove=treeclimber(0,bmove,0,120,120,Al,Bt,ep);
    if (themove[0]>400){
	debug('check!',themove);
	ch=1;
    }
    //that's check. But if it is still check after opposition move
    // then it's checkmate.
    // and if it isn't check before opposition's best move, it's stalemate.
    if(treeclimber(1,8-bmove,0,120,120,Al,Bt,ep)[0]<-400){
	going=0;
	debug(ch?'checkmate':'stalemate');
	finish(ch);
    }
    //finsihed those checks, put board back in place.
    board[s]=S;
    board[e]=E;



    //Now it's a matter of saving changed state (enpassant, castling, history, and queening.)
    //put board on heap.
  
    boardheap[moveno]=[board.toString(),castle.toString(),ep];
    display2(s,e,score,E,ch);  
    ep=0; // ep reset
    if(a==1){ // pawns
	//     	debug(board[e+dir],"piece:",5-queener,'e',e,'s',s)
	if(board[e+dir]>15)board[s]+=4-queener; //queener is choice for pawn queening
	if(e==s+2*dir && (board[e-1]&1||board[e+1]&1))ep=s+dir;  //set up ep - with pawn test to save time in parse loop
	if(!E&&(s-e)%10)shift(e,e-dir);// blank ep pawn
    }
    if(s==21+bmx*70||s==28+bmx*70)castle[bmx]&=(x<5)+1;        //castle flags (blank on any move from rook points)
    if(a==6){

	kp[bmx]=e;//king position for fancy weighting 
	if(gap*gap==4){  //castling - move rook too
	    //if (!check(s,8-bmove,dir,gap>>1))return false
	    shift(s-4+(s<e)*7,s+gap/2);
	}
	castle[bmx]=0;
    }

    shift(s,e);
    prepare();   // get stuff ready for next move
    moveno++
    // the move is done 
    //so  give the other side a turn.
    bmove=8-bmove;
    return 1;
}

function finish(ch){
    debug(ch);


}
