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
 * clarify variable names
 * generalise player state, (perhaps tick boxes for b and w computer control)
 * sensibly rearrange piece numbers [allowing bitwise parsing]
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
var EDGE = 16;

// fills the board and initialises some look up tables
function new_game(){
    var board = [];
    BASE_WEIGHTS = [];
    BASE_PAWN_WEIGHTS = [];
    /* Encoding is base-35
     * g is 16, meaning off board
     * pieces are valued 2, 4, 6, etc,  + 0/1 for white/black
     */
    var board_string= ('gggggggggg' + 'gggggggggg' +
                       'g468ac864g' +
                       'g22222222g' +
                       'g00000000g' + 'g00000000g' + 'g00000000g' + 'g00000000g' +
                       "g33333333g" +
                       "g579bd975g" +
                       'gggggggggg' + 'gggggggggg');
    var weight_string = "000000000000000000000000000000000111100000123321000123553210";
    console.debug(weight_string.length, board_string.length);
    var pawn_weights='000012346900';  //per row - reward advancement.
    var pweights = [[], []];
    var kweights = [];
    var weights = [];
    var x, y;
    for(y=0;y<12;y++){
        var pawn_weight = parseInt(pawn_weights.charAt(y), 35);
        for(x=0;x<10;x++){
            var i = (y * 10) + x;
            BASE_PAWN_WEIGHTS[i] = pawn_weight;
            BASE_WEIGHTS[i] = parseInt(weight_string.charAt((i < 60) ? i : 119 - i),
                                       35) & 15;
            board[i]=parseInt(board_string.charAt(i), 35);
            pweights[0][i] = 0;
            pweights[1][i] = 0;
            kweights[i] = 0;
            weights[i] = 0;
        }
    }
    board[OFF_BOARD] = 0;
    return {
        board: board,
        enpassant: 0,//en passant state (points to square behind takable pawn, ie, where the taking pawn ends up.
        castles: 15,
        pawn_promotion: [10, 10],
        to_play: 0, //0: white, 1: black
        taken_piece: 0,
        pweights: pweights,
        kweights: kweights,
        weights: weights,
        pieces: [],
        moveno: 0
    };
}


function get_castles_mask(s, e, colour){
    var mask = 0;
    var shift = colour * 2;
    var side = colour * 70;

    //wipe both our sides if king moves
    if (s == 25 + side)
        mask |= 3 << shift;
    //wipe one side on any move from rook points
    else if (s == 21 + side)
        mask |= 1 << shift;
    else if (s == 28 + side)
        mask |= 2 << shift;

    //or on any move *to* opposition corners
    if (e == 91 - side)
        mask |= 4 >> shift;
    else if (e == 98 - side)
        mask |= 8 >> shift;
    return 15 ^ mask;
}

///////////////////////////treeclimb begins

var comp=new Function('a','b','return b[0]-a[0]'); //comparison function for treeclimb integer sort (descending)


/****treeclimber */
function treeclimber(state, count, colour, sc, s, e, alpha, beta, ep,
                     castle_state){
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
    var piece = S & 14;
    var moved_colour = S & 1;

    if(S) {
        pieces[moved_colour].push([S,e]);
        removeLater=true;
    }

    //now some stuff to handle queening, castling
    var rs = 0, re, rook;
    if(piece == PAWN && board[e + DIRS[moved_colour]] == EDGE){
        board[e] = state.pawn_promotion[moved_colour] + moved_colour;
    }
    else if (piece == KING && ((s-e)*(s-e)==4)){  //castling - move rook too
        rs = s - 4 + (s < e) * 7;
        re = (s + e) >> 1; //avg of s,e=rook's spot
        rook = moved_colour + 4;
        board[rs]=0;
        board[re]=rook;
        if (s != 25 + moved_colour * 70){
            var _conditional_break_point = s;
        }
    }
    if (castle_state)
        castle_state &= get_castles_mask(s, e, moved_colour);

    var movelist = parse(state, colour, ep, castle_state, sc);
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
            if (bscore < 400){
                b=-treeclimber(state, count, ncolour, bscore, bs, be,
                               -beta, -alpha, bep, castle_state)[0];
                for(z=1;z<movecount;z++){
                    if (b>alpha)alpha=b;  //b is best
                    mv = movelist[z];
                    t = -treeclimber(state, count, ncolour, mv[0], mv[1], mv[2],
                                     -alpha-1, -alpha, mv[3], castle_state)[0];
                    if ((t > alpha) && (t < beta)){
                        t = -treeclimber(state, count, ncolour,
                                         mv[0],mv[1],mv[2],-beta,-t, mv[3], castle_state)[0];
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
            else {
                /* score suggest king taken.
                 Don't search further.*/
                b = bscore;
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
    }
    else{
        /*XXX signal stalemate or something? */
        console.log('no movelist');
    };
    if(rs){
        board[rs]=rook;
        board[re]=0;
    }
    board[s]=S;
    board[e]=E;
    if (removeLater) {
        pieces[ncolour].length--;
    }

    return [b, bs, be];
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
        var w = parseInt((z > 40 && moveno < 8) * ((DEBUG ? 0.5 : Math.random())
                                                   * weights[z]) * 0.5);
        wp_weights[z] = bp_weights[119 - z] = base_pawn_weights[z] + w;
    }
    if (moveno < 5){
        // go for the king early? XXX
        weights[24] = weights[94] = 14;
    }
}


function parse(state, colour, EP, castle_state, score) {
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
    var z;//loop counter.
    var ak;              //flags piece moving is king.
    var mlen;            //mv length in inner loop
    var pieces = state.pieces[colour];  //array of pieces of correct colour with starting positions eg [1,32] means pawn at square 32
    var pbl = pieces.length;   //marginal time saving

    var castle_flags = (castle_state >> (colour * 2)) & 3;
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



//************************************* findmove();

function findmove(state, level){
    prepare(state);
    var t=treeclimber(state, level, state.to_play, 0,
                      OFF_BOARD, OFF_BOARD,
                      MIN_SCORE, MAX_SCORE,
                      state.enpassant, state.castles);
    return [t[1], t[2]];
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
    var colour = state.to_play;
    var E=board[e];
    var S=board[s];

    // king has just been taken; should have been seen earlier!
    if((E&14) == KING){
        console.log('checkmate - got thru checks');
        return 2;
    }

    /*see if this move is even slightly legal, disregarding check.*/
    var legal = false;
    prepare(state);
    var p = parse(state, colour, state.enpassant, state.castles, 0);
    for (var z = 0; z < p.length; z++){
        if (s == p[z][1] && e == p[z][2]){
            legal = true;
            break;
        }
    }
    if (! legal) {
        console.log('no such move!', p,
                    ' s,e', s, e,' S,E', S, E);
        return 0;
    }
    /*now try the move, and see what the response is.
     * If the king gets taken, it is check.
     *
     * 1. Make the move, play full turn as other colour
     * 2. If other colour can take king, this move is in check
     *
     * 3. If other colour loses king in all moves, then this is mate
     *    (but maybe stalemate).
     *
    */
    var t = treeclimber(state, 1, 1 - colour, 0, s, e, MIN_SCORE, MAX_SCORE,
                        state.enpassant, state.castles);
    var in_check = t[0] > 400;
    var is_mate = t[0] < -400;

    if (in_check) {
        console.log('in check', t);
        return 0;
    }
    /* see if it is check already -- that is, if we have another move now,
     * can we get the king?
     *
     * NB: state.enpassant is irrelevant
     */
    t = treeclimber(state, 0, colour, 0, s, e, MIN_SCORE, MAX_SCORE,
                    0, state.castles);
    var is_check = t[0] > 400;

    modify_state_for_move(state, s, e);
    if (is_check && is_mate){
        console.log('checkmate');
        return 2;
    }
    else if (is_check){
        console.log('check');
        return 1;
    }
    else if (is_mate){
        console.log('stalemate');
        return 2;
    }
    return 1;
}

function modify_state_for_move(state, s, e){
    var board = state.board;
    var colour = state.to_play;
    var gap = e - s;
    var piece = board[s] & 14;
    console.log('gap', gap, 'piece', piece);
    var dir = DIRS[colour];
    if (piece == PAWN){
        /*queening*/
        if(board[e + dir] == EDGE)
            board[s] = state.pawn_promotion[colour] + colour;

        /* setting en passant flag*/
        if(gap == 2 * dir && ((board[e - 1] & 14) == 2 ||
                              (board[e + 1] & 14) == 2))
            state.enpassant = s + dir;

        /*taking en passant*/
        if(!board[e] && gap % 10){
            board[e] = board[e - dir];
            board[e - dir] = 0;
        }
    }
    else if(piece == KING && gap * gap == 4){  //castling - move rook too
        var rs = s - 4 + (s < e) * 7;
        var re = (s + e) >> 1;
        board[re] = board[rs];
        board[rs] = 0;
        console.log("castling", s, e, gap, s + gap / 2, re);
    }

    if (state.castles){
        state.castles &= get_castles_mask(s, e, colour);
        console.debug("castle state", state.castles);
    }
    board[e] = board[s];
    board[s] = 0;
    state.moveno++;
    state.to_play = 1 - colour;
}
