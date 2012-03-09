/* p4wn, AKA 5k chess - by Douglas Bagnall <douglas@paradise.net.nz>
 *
 * This code is in the public domain, or as close to it as various
 * laws allow. No warranty; no restrictions.
 *
 * lives at http://p4wn.sf.net/
 *
 * Additional work by: [add yourself if you wish]
 *
 *  Chris Lear
 */

/* TODO
 * Drop Netscape 3 support
 * clarify variable names
 * generalise player state, (perhaps tick boxes for b and w computer control)
 * change colour bit to bit 0
 * sensibly rearrange piece numbers [allowing bitwise parsing]
 * test
 * perhaps improve the HTML.
 */

var MAX_SCORE = 9999;    // extremes of evaluation range
var MIN_SCORE = -MAX_SCORE;

var DIRS=[10,-10];
var OFF_BOARD=120;
var DEBUG=0;

var MOVES = [0, 0,
             0, 0,
             [1,10,-1,-10], [1,10,-1,-10],
             [21,19,12,8,-21,-19,-12,-8], [21,19,12,8,-21,-19,-12,-8],
             [11,9,-11,-9], [11,9,-11,-9],
             [1,10,11,9,-1,-10,-11,-9], [1,10,11,9,-1,-10,-11,-9],
             [1,10,11,9,-1,-10,-11,-9], [1,10,11,9,-1,-10,-11,-9]
            ]; // in order, doubled _,p,r,n,b,q,k

var VALUES=[0, 0,    //Piece values
            16, 16,  //pawns
            80, 80,  //rooks
            48, 48,  //knights
            48, 48,  //bishops
            144, 144,//queens
            999, 999,//kings
            0];



var BASE_WEIGHTS;    //base weights  central weighting for ordinary pieces.
var BASE_PAWN_WEIGHTS;
var PAWN = 2, ROOK = 4, KNIGHT = 6, BISHOP = 8, QUEEN = 10, KING = 12;


// fills the board and initialises some look up tables
function board_state(){
    var board = [];
    BASE_WEIGHTS = [];
    BASE_PAWN_WEIGHTS = [];
    /* Encoding is base-35
     * g is 16, meaning off board
     * pieces are valued 2, 4, 6, etc
     * + 1 for black
     */
    var x = 'g00000000g';
    var y ='gggggggggg';
    //var board_string=y+y+"g23456432gg11111111g"+x+x+x+x+"g99999999ggABCDECBAg"+y+y;
    var board_string=y+y+"g468ac864gg22222222g"+x+x+x+x+"g33333333gg579bd975g"+y+y;
    var weight_string=x+x+x+"000111100000123321000123553210";
    var pawn_weights='000012346900';  //per row - reward advancement.
    var pweights = [[], []];

    for(y=0;y<12;y++){
        for(x=0;x<10;x++){
            var z=(y*10)+x;
            BASE_PAWN_WEIGHTS[z] = parseInt(pawn_weights.charAt(y));
            BASE_WEIGHTS[z] = parseInt(weight_string.charAt((z < 60) ? z : 119 - z), 35) & 15;
            board[z]=parseInt(board_string.charAt(z), 35);
            pweights[0][z] = 0;
            pweights[1][z] = 0;
        }
    }
    board[OFF_BOARD] = 0;
    return {
        board: board,
        enpassant: 0,//en passant state (points to square behind takable pawn, ie, where the taking pawn ends up.
        castles: [3, 3],
        pawn_promotion: [10, 10],
        to_play: 0, //0: white, 8: black
        taken_piece: 0,
        weights: [],
        pweights: pweights,
        kweights: [],
        pieces: [],
        moveno: 0
    };
}


///////////////////////////treeclimb begins

var comp=new Function('a','b','return b[0]-a[0]'); //comparison function for treeclimb integer sort (descending)


/****treeclimber */
function treeclimber(state, count, colour, sc, s, e, alpha, beta, ep){
    var board = state.board;

    var z = -1;
    var ncolour = 1 - colour;
    var removeLater=false;
    sc = -sc;
    if (sc <-400) return [sc, s, e];  //if king taken, no deepening.
    var b = MIN_SCORE;     //best move starts at -infinity
    var S = board[s];
    var E = board[e];
    board[e]=S;
    board[s]=0;
    var pieces = state.pieces;
    if(S) {
        pieces[ncolour].push([S,e]);
        removeLater=true;
    }

    //now some stuff to handle queening, castling
    var piece = S & 14;
    var rs,re;
    if(piece == 2 && board[e + DIRS[colour]] > 15){
        board[e] = state.pawn_promotion[colour] + colour;
    }
    else if (piece == 12 && (s-e==2||e-s==2)){  //castling - move rook too
        rs=s-4+(s<e)*7;
        re=(s+e)>>1; //avg of s,e=rook's spot
        board[rs]=0;
        board[re]=colour+4;
    }

    var movelist = parse(state, colour, ep, sc);
    var movecount = movelist.length;
    var mv;
    if (movecount) {
        if(count){
            //BRANCH NODES
            var t;
            var cmp=comp;
            movelist.sort(cmp); //descending order
            count--;
            var best=movelist[0];
            var bscore = best[0];
            var bs=best[1];
            var be=best[2];
            var bep = best[3];
            b=-treeclimber(state, count, ncolour, bscore, bs, be,
                           -beta, -alpha, bep)[0];
            for(z=1;z<movecount;z++){
                if (b>alpha)alpha=b;  //b is best
                mv = movelist[z];
                t = -treeclimber(state, count, ncolour, mv[0], mv[1], mv[2],
                                 -alpha-1, -alpha, mv[3])[0];
                if ((t > alpha) && (t < beta)){
                    t = -treeclimber(state, count, ncolour,
                                     mv[0],mv[1],mv[2],-beta,-t, mv[3])[0];
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
            b=MIN_SCORE;
            //LEAF NODES
            while(--movecount>-1 &&  beta>b){ //***
                if(movelist[movecount][0]>b){
                    b=movelist[movecount][0];
                }
            }
        }
    }else{trace('no movelist');};
    if(rs){
        board[rs]=colour + 4;
        board[re]=0;
    }
    board[s]=S;
    board[e]=E;
    if (removeLater) {
        pieces[ncolour].length--;
    }

    return [b, bs, be];
}









//************************************* findmove();

function findmove(state, level){
    var t=treeclimber(state, level, state.to_play, 0,
                      OFF_BOARD, OFF_BOARD,
                      MIN_SCORE, MAX_SCORE,
                      state.enpassant);
    return move(state, t[1], t[2]);
}



/* move(s, e, queener)
 * s, e are start and end positions
 *
 * queener is the desired pawn promotion if the move gets a pawn to
  the other end.

 return:
 0 if the move is illegal.
 1 if the move is OK
 2 if the move is OK and it ends the game.
 */

function move(state, s, e){
    var board = state.board;
    var castles = state.castles;
    var colour = state.to_play;
    var E=board[e];
    var S=board[s];
    var check = 0;
    var ret = 1;

    //test if this move is legal
    var t=0;
    if (1){
        prepare(state);
        var p = parse(state, colour, 0);
        for (var z = 0; z < p.length; z++){
            t = t || (s == p[z][1] && e == p[z][2]);
        }
        if (!t) {
            trace('no such move!',p,'\ns e',s,e,'\n',S,E);
            return 0;
        }
        // get best other player's move
        // if it's check, squawk
        t=treeclimber(state, 0, 1 - colour, 0, s, e, MIN_SCORE, MAX_SCORE, state.enpassant);
        if (t[0] > 400){
            trace('in check',t);
            return 0;
        }
    }
    // move the pieces on the board, temporarily
    board[e] = board[s];
    board[s] = 0;
    // then see whether the next move will take the king...
    // (see what happens if you're allowed another move straight away)
    prepare(state);
    t = treeclimber(state, 0, colour, 0, OFF_BOARD, OFF_BOARD, MIN_SCORE, MAX_SCORE, state.enpassant);
    // Then put the pieces back
    board[s] = S;
    board[e] = E;
    if (t[0] > 400){ // ...if you can take the king, it's check
        trace('check!', t);
        check |= 1;
    }
    // now see the best thing the opposition can do.
    t = treeclimber(state, 1, 1 - colour, 0, s, e, MIN_SCORE, MAX_SCORE, state.enpassant);
    if(t[0] < -400){
        check |= 2;
        trace((check == 3) ?'checkmate':'stalemate', t);
        ret = 2;
    }
    if((E & 14) == KING){// king has just been taken; should have been seen earlier!
        trace('checkmate - got thru checks');
        return 2;
    }

    var ep = 0;
    var x = s % 10;
    var gap = e - s;
    var dir = DIRS[colour];
    if ((E & 14) == 2){ // pawns
        if(board[e + dir] > 15)
            board[s] = state.pawn_promotion[colour] + colour;

        if(gap == 2 * dir && ((board[e - 1] & 14) == 2 || (board[e + 1] & 14) == 2))
            ep = s + dir;

        if(!E && gap % 10){
            board[e] = board[e - dir];
            board[e - dir] = 0;
        }
    }
    state.enpassant = ep;
    //wipe castle flags on any move from rook points
    if (s == 21 + colour * 70 || s == 28 + colour * 70)
        castles[colour] &= (x < 5) + 1;
    //or on any move *to* opposition corners
    if(e == 21 + colour * 70 || e == 28 + colour * 70)
        castles[!colour] &= (x < 5) + 1;
    if(a == 6){
        if(gap * gap == 4){  //castling - move rook too
            board[s - 4 + (s < e) * 7] = board[s + gap / 2];
            board[s + gap / 2] = 0;
        }
        castles[colour] = 0;
    }
    board[e] = board[s];
    board[s] = 0;
    prepare(state);   // get stuff ready for next move
    state.moveno++;
    state.to_play = 1 - colour;
    return ret;
}


////////////////////////////////////parse

/* prepare() works out weightings for assessing various moves,
 * favouring centralising moves early, for example. */

function prepare(state){
    var pieces = state.pieces = [[], []];
    var weights = state.weights;
    var wp_weights = state.pweights[0];
    var bp_weights = state.pweights[1];
    var base_weights = BASE_WEIGHTS;
    var base_pawn_weights = BASE_PAWN_WEIGHTS;

    var kweights = state.kweights;
    var moveno = state.moveno;
    var board = state.board;
    // high earliness indicates a low move number
    var earliness = (moveno < 32) ? 4 - (moveno >> 3) : (moveno > 64);

    for(var z = 99;z > 20; z--){
        var a = board[z];
        if(a&14){
            pieces[a&1].push([a,z]);
        }
        weights[z] = base_weights[z] * earliness;

        //king weighted toward edge while moveno <= 40
        kweights[z] = (moveno > 40) || (10 - 2 * base_weights[z]) * earliness;

        //pawns weighted toward centre for first 8 moves, then forwards only.
        //pawn weights are also slightly randomised.
        var w = (z > 40 && moveno < 8) * ((DEBUG ? 0.5 : Math.random()) * weights[z]) * 0.5;
        wp_weights[z] = bp_weights[119 - z] = base_pawn_weights[z] + w;
    }
    if (moveno < 5){
        // go for the king early? XXX
        weights[24] = weights[94] = 14;
    }
}




function parse(state, colour, EP, score) {
    var board = state.board;
    var s, e;    //start and end position
    var h;         //for pawn taking moves
    var E,a;       //E=piece at end place, a= piece moving
    var cx;     // loop for move direction
    var mv;     // list of move direction
    var k=-1;   // length of movelist (mvl)
    var other_colour = 1 - colour;  //not colour (colour is the players colour)
    var dir=DIRS[colour]; //dir= 10 for white, -10 for black
    var mvl=[];        // movelist (built up with found moves
    var m;             // current value in mv[cx]
    var weight;          // initial weighting of piece's position
    var pweight=state.pweights[colour];//=pweights[colour]
    //var pv=pv;            //localised pv
    var kweights = state.kweights;
    var weights = state.weights;
    var weight_lut;       //=weight_lut localised weight
    var castle_flags = state.castles[colour];    // flags whether this side can castle
    //var pv=PV[colour==colourove];
    var z;//loop counter.
    var ak;              //flags piece moving is king.
    var mlen;            //mv length in inner loop
    var pieces = state.pieces[colour];  //array of pieces of correct colour with starting positions eg [1,32] means pawn at square 32
    var pbl = pieces.length;   //marginal time saving
    for (z=0;z<pbl;z++){
        s=pieces[z][1]; // board position
        a=board[s]; //piece number
        if (pieces[z][0]==a){	//the piece can have moved
            a &= 14;
            if(a > 2){    //non-pawns
                ak=a==12;
                weight_lut=ak?kweights:weights; //different weight tables for king/knight
                weight=score-weight_lut[s];
                mv=MOVES[a];
                if(a==6||ak){
                    for(cx=0;cx<8;){     //knights,kings - have precisely 8 possible moves
                        e= s + mv[cx++];
                        E=board[e];
                        if(!E||(E&17)==other_colour){
                            mvl[++k]=[weight+VALUES[E]+weight_lut[e],s,e,0];
                        }
                    }
                    if(ak && castle_flags){
                        if (s > 100){
                            console.log(s);
                        }

                        if((castle_flags & 1) &&
                            (board[s-1] + board[s-2] + board[s-3] == 0) &&
                            check_castling(board, s - 2,other_colour,dir,-1)){//Q side
                                mvl[++k]=[weight+11, s, s-2, 0];     //no analysis, just encouragement
                        }
                        if((castle_flags & 2) && (board[s+1]+board[s+2] == 0)&&
                           check_castling(board, s, other_colour, dir, 1)){//K side
                                mvl[++k]=[weight+12,s,s+2, 0];
                        }
                    }
                }
                else{//rook, bishop, queen
                    mlen=mv.length;
                    for(cx=0;cx<mlen;){     //goeth thru list of moves
                        E=0;
                        m=mv[cx++];
                        e=s;
                        while(!E){   //while on board && no piece
                            e+=m;
                            E=board[e];
                            if(!E||(E&17)==other_colour){
                                mvl[++k]=[weight+VALUES[E]+weight_lut[e],s,e,0];
                            }
                        }
                    }
                }
            }
            else{    //pawns
                weight=score-pweight[s];
                e=s+dir;
                if(!board[e]){
                    mvl[++k]=[weight+pweight[e],s,e];
                    if(! pweight[s] && (!board[e+dir])){  //2 squares at start - start flagged by 0 pweights weighting
                        mvl[++k]=[weight+pweight[e+dir],s,e+dir,e];
                    }
                }
                if(EP&&(EP==e+1||EP==e-1)){
                    mvl[++k]=[weight+pweight[e],s,EP];
                }
                for(h=e-1;h<e+2;h+=2){                        //h=-1,1 --for pawn capturing
                    E=board[h] & 15;
                    if(E && (E&1) != colour){
                        mvl[++k]=[weight+VALUES[E]+pweight[h],s,h,0];
                    }
                }
            }
        }
    }
    return mvl;
}


/* check_castling
 *
 * s - "start" location (either king home square, or king destination)
 *     the checks are done left to right.
 * * dir - direction of travel (White: 10, Black: -10)
 * side: -1 means Q side; 1, K side
 */

function check_castling(board, s, colour, dir, side){
    var e;
    var E;
    var m, p;
    var pawn = colour + 2;
    var rook = colour + 4;
    var knight = colour + 6;
    var bishop = colour + 8;
    var queen = colour + 10;
    var king = colour + 12;

    /* go through 3 positions, checking for check in each
     */
    for(p = s; p < s + 3; p++){
        //bishops, rooks, queens
        for(m = dir - 1; m < dir + 2; m++){
            e = p + m;
            while(1){
                E=board[e];
                if (E){
                    if((E == colour + 4 + (m != dir) * 4) || E == queen)
                        return 0;
                    break;
                }
                e += m;
            }
        }
        //knights
        if (board[p + dir - 2] == knight ||
            board[p + dir + 2] == knight ||
            board[p + 2 * dir + 1] == knight ||
            board[p + 2 * dir + 1] == knight)
            return 0;
    }

    /* a pawn or king in any of 5 positions on row 7 blocks.
     *(though some of those involve impossible king-king contact) */
    for(p = s + dir - 1; p < s + dir + 4; p++){
        E = board[p];
        if(E == pawn || E == king)
            return 0;
    }
    /* scan back row for rooks, queens on the other side.
     * Same side check is impossible, because the castling rook is there
     */
    E=0;
    while (E == 0){   //queen or rook out on other side
        s -= side;
        E=board[s];
        if(E == rook || E == queen)
            return 0;
    }
    return 1;
}
