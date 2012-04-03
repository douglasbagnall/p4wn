/* p4wn, AKA 5k chess - by Douglas Bagnall <douglas@paradise.net.nz>
 *
 * This code is in the public domain, or as close to it as various
 * laws allow. No warranty; no restrictions.
 *
 * lives at http://p4wn.sf.net/
 */
/* in order, even indices: <nothing>, pawn, rook, knight, bishop, king, queen */
var P4_MOVES = [[], [],
                [], [],
                [1,10,-1,-10], [],
                [21,19,12,8,-21,-19,-12,-8], [],
                [11,9,-11,-9], [],
                [1,10,11,9,-1,-10,-11,-9], [],
                [1,10,11,9,-1,-10,-11,-9], []
               ];

var P4_OFF_BOARD = 120;

var P4_BASE_WEIGHTS;    //base weights  central weighting for ordinary pieces.
var P4_BASE_PAWN_WEIGHTS;

/*piece codes:
 *  piece & 2  -> single move piece (including pawn)
 *  if (piece & 2) == 0:
 *     piece & 4  -> row and column moves
 *     piece & 8  -> diagonal moves
 */
var P4_PAWN = 2, P4_ROOK = 4, P4_KNIGHT = 6, P4_BISHOP = 8, P4_QUEEN = 12, P4_KING = 10;
var P4_EDGE = 16;


function p4_get_castles_mask(s, e, colour){
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


/****treeclimber */
function p4_treeclimber(state, count, colour, score, s, e, alpha, beta, ep,
                     castle_state){
    var board = state.board;
    var z = -1;
    var ncolour = 1 - colour;
    score = -score;
    if (score <-400) return [score, s, e];  //if king taken, no deepening.
    var b = P4_MIN_SCORE;     //best move starts at -infinity
    var S = board[s];
    var E = board[e];
    board[e]=S;
    board[s]=0;
    var piece = S & 14;
    var moved_colour = S & 1;
    var piece_locations = state.pieces[moved_colour];
    if (S){
        piece_locations.push([S, e]);
    }

    //now some stuff to handle queening, castling
    var rs = 0, re, rook;
    var ep_taken = 0, ep_position;
    if(piece == P4_PAWN){
        if(board[e + (10 - 20 * moved_colour)] == P4_EDGE){ //got to end
            board[e] = state.pawn_promotion[moved_colour] + moved_colour;
            //update the saved piece locations list
            piece_locations[piece_locations.length - 1][0] = board[e];
        }
        else if (((s ^ e) & 1) && E == 0){
            /*this is a diagonal move, but the end spot is empty, so we surmise enpassant */
            ep_position = e - 10 + 20 * moved_colour;
            ep_taken = board[ep_position];
            board[ep_position] = 0;
        }
    }
    else if (piece == P4_KING && ((s-e)*(s-e)==4)){  //castling - move rook too
        rs = s - 4 + (s < e) * 7;
        re = (s + e) >> 1; //avg of s,e=rook's spot
        rook = moved_colour + 4;
        board[rs]=0;
        board[re]=rook;
        if (s != 25 + moved_colour * 70){
            var _conditional_break_point = s;
        }
        piece_locations.push([rook, re]);
    }
    if (castle_state)
        castle_state &= p4_get_castles_mask(s, e, moved_colour);

    var movelist = p4_parse(state, colour, ep, castle_state, score);
    var movecount = movelist.length;
    var mv, bs, be;

    if (movecount) {
        if(count){
            //BRANCH NODES
            var t;
            movelist.sort(function (a, b){
                              return b[0] - a[0];
                          }); //descending order
            count--;
            var best = movelist[0];
            var bscore = best[0];
            bs = best[1];
            be = best[2];
            var bep = best[3];
            if (bscore < 400){
                b=-p4_treeclimber(state, count, ncolour, bscore, bs, be,
                                  -beta, -alpha, bep, castle_state)[0];
                for(z = 1; z < movecount; z++){
                    if (b>alpha)alpha=b;  //b is best
                    mv = movelist[z];
                    t = -p4_treeclimber(state, count, ncolour, mv[0], mv[1], mv[2],
                                        -alpha-1, -alpha, mv[3], castle_state)[0];
                    if ((t > alpha) && (t < beta)){
                        t = -p4_treeclimber(state, count, ncolour,
                                            mv[0],mv[1],mv[2],-beta,-t, mv[3], castle_state)[0];
                    }
                    if (t>b){
                        b=t;
                        bs=mv[1];
                        be=mv[2];
                        if(t>alpha)alpha=t;
                        if (b > beta){
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
            //LEAF NODES
            b = P4_MIN_SCORE;
            while(beta > b && --movecount != -1){
                if(movelist[movecount][0] > b){
                    b = movelist[movecount][0];
                }
            }
        }
    }
    else{
        /*XXX signal stalemate or something? */
        bs = 0;
        be = 0;
    };
    if(rs){
        board[rs]=rook;
        board[re]=0;
        piece_locations.length--;
    }
    if (ep_position){
        board[ep_position] = ep_taken;
    }

    board[s]=S;
    board[e]=E;
    if (S){
        piece_locations.length--;
    }
    if (b < -1500){
        /* make distant checkmates seem less bad than immediate ones.
         * This makes recognising real checkmate easier.
         */
        b += 200;
    }
    return [b, bs, be];
}



////////////////////////////////////parse

/* prepare() works out weightings for assessing various moves,
 * favouring centralising moves early, for example.
 *
 * It is called before each tree search, not for each parse(),
 * so it is OK for it to be a little bit slow.
 */

function p4_prepare(state){
    var i;
    var pieces = state.pieces = [[], []];
    var w_weights = state.weights[0];
    var b_weights = state.weights[1];
    var wp_weights = state.pweights[0];
    var bp_weights = state.pweights[1];
    var wk_weights = state.kweights[0];
    var bk_weights = state.kweights[1];

    /*covert state.moveno half move count to move cycle count */
    var moveno = state.moveno >> 1;
    var board = state.board;

    // high earliness_weight indicates a low move number
    var earliness_weight = (moveno < P4_EARLINESS_WEIGHTING.length) ? P4_EARLINESS_WEIGHTING[moveno] : 0;
    var king_should_hide = moveno < 12;
    var early = moveno < 5;
    var target_king = moveno > 15;
    var kings = [0, 0];
    var material = [0, 0];
    /* find the pieces first, so the king positions are known */
    for(i = 20; i  < 100; i++){
        var a = board[i];
        var piece = a & 14;
        var colour = a & 1;
        if(piece){
            pieces[colour].push([a, i]);
            if (piece == P4_KING)
                kings[colour] = i;
            else
                material[colour] += P4_VALUES[piece];
        }
    }
    var white_surplus = material[0] - material[1];
    var white_winning = white_surplus > P4_VALUES[P4_PAWN];
    var black_winning = white_surplus < -P4_VALUES[P4_PAWN];
    var big_margin = parseInt(Math.abs(white_surplus) / (3 * P4_VALUES[P4_PAWN]));

    var wkx = kings[0] % 10;
    var wky  = parseInt(kings[0] / 10);
    var bkx = kings[1] % 10;
    var bky  = parseInt(kings[1] / 10);

    for (var y = 2; y < 10; y++){
        for (var x = 1; x < 9; x++){
            i = y * 10 + x;
            b_weights[i] = P4_BASE_WEIGHTS[i] * earliness_weight;
            w_weights[i] = P4_BASE_WEIGHTS[i] * earliness_weight;

            /* encourage them off the back row */
            if (early){
                if (y == 2){
                    w_weights[i] -= 5;
                }
                if (y == 9){
                    b_weights[i] -= 5;
                }
            }
            if (king_should_hide){
                /*keep kings back on home row*/
                if (y == 2)
                    wk_weights[i] = 2 * earliness_weight;
                else if (y == 9)
                    bk_weights[i] = 2 * earliness_weight;
            }
            else {
                wk_weights[i] = bk_weights[i] = 0;
            }

            /* After a while, start going for opposite king. Just
             * attract pieces into the area so they can mill about in
             * the area, waiting for an opportunity.
             *
             * As prepare is only called at the beginning of each tree
             * search, the king could wander out of the targetted area
             * in deep searches. But that's OK. Heuristics are
             * heuristics.
             */
            if (target_king){
                var wdx = Math.abs(wkx - x);
                var wdy = Math.abs(wky - y);
                var bdx = Math.abs(bkx - x);
                var bdy = Math.abs(bky - y);
                if (wdx <= 3 && wdy <= 3){
                    b_weights[i] += 5 + 3 * black_winning * big_margin;
                    if (black_winning){
                        bk_weights[i] += 5 + 3 * big_margin;
                    }
                }

                if (bdx <= 3 && bdy <= 3){
                    w_weights[i] += 5 + 3 * white_winning * big_margin;
                    if (white_winning){
                        wk_weights[i] += 5 + 3 * big_margin;
                    }
                }
            }
            /* pawns weighted toward centre at start then forwards only.
             * pawn weights are also slightly randomised, so each game is different.
             */
            var wp = parseInt((y >= 4 && early) * (((P4_DEBUG ? 0.5 : Math.random()) + 0.2)
                                                   * w_weights[i]));
            var bp = parseInt((y <= 7 && early) * (((P4_DEBUG ? 0.5 : Math.random()) + 0.2)
                                                   * b_weights[i]));
            wp_weights[i] = P4_BASE_PAWN_WEIGHTS[i] + wp;
            bp_weights[i] = P4_BASE_PAWN_WEIGHTS[119 - i] + bp;
        }
    }
    if (moveno > 10 && moveno < 30){
        /* not early; pry those rooks out of their corners */
        b_weights[91] -= 9;
        b_weights[98] -= 9;
        w_weights[21] -= 9;
        w_weights[28] -= 9;
    }
}



function p4_parse(state, colour, ep, castle_state, score) {
    var board = state.board;
    var s, e;    //start and end position
    var E=0, a;       //E=piece at end place, a= piece moving
    var i, z;
    var other_colour = 1 - colour;
    var dir = (10 - 20 * colour); //dir= 10 for white, -10 for black
    var k=-1;
    var movelist=[];
    var weight;
    var pweight = state.pweights[colour];
    var kweights = state.kweights[colour];
    var weights = state.weights[colour];
    var pieces = state.pieces[colour];
    var plen = pieces.length;

    var castle_flags = (castle_state >> (colour * 2)) & 3;
    for (z = 0; z < plen; z++){
        s=pieces[z][1]; // board position
        a=board[s]; //piece number
        /* the pieces list is only a convenient short cut.
         * pieces that have moved/been taken will still be listed at their
         * old place. So check.
         */
        if (pieces[z][0]==a){
            a &= 14;
            if(a > 2){    //non-pawns
                var is_king = a == P4_KING;
                var weight_lut = is_king ? kweights : weights;
                weight = score - weight_lut[s];
                var moves = P4_MOVES[a];
                if(a & 2){
                    for(i = 0; i < 8; i++){
                        e = s + moves[i];
                        E = board[e];
                        if(!E || (E&17)==other_colour){
                            movelist[++k]=[weight + P4_VALUES[E] + weight_lut[e], s, e, 0];
                        }
                    }
                    if(is_king && castle_flags){
                        if((castle_flags & 1) &&
                            (board[s-1] + board[s-2] + board[s-3] == 0) &&
                            p4_check_castling(board, s - 2,other_colour,dir,-1)){//Q side
                            movelist[++k]=[weight+11, s, s-2, 0];     //no analysis, just encouragement
                        }
                        if((castle_flags & 2) && (board[s+1]+board[s+2] == 0)&&
                            p4_check_castling(board, s, other_colour, dir, 1)){//K side
                            movelist[++k]=[weight+12,s,s+2, 0];
                        }
                    }
                }
                else{//rook, bishop, queen
                    var mlen = moves.length;
                    for(i=0;i<mlen;){     //goeth thru list of moves
                        var m = moves[i++];
                        e=s;
                        do {
                            e+=m;
                            E=board[e];
                            if(!E||(E&17)==other_colour){
                                movelist[++k]=[weight+P4_VALUES[E]+weight_lut[e],s,e,0];
                            }
                        }while(!E);
                    }
                }
            }
            else{    //pawns
                weight=score-pweight[s];
                e=s+dir;
                if(!board[e]){
                    movelist[++k]=[weight+pweight[e],s,e];
                    /*2 square moves at start are flagged by 0 pweights weighting*/
                    var e2 = e + dir;
                    if(! pweight[s] && (!board[e2])){
                        movelist[++k] = [weight + pweight[e2], s, e2, e];
                    }
                }
                if(ep&&(ep==e+1||ep==e-1)){
                    movelist[++k]=[weight+pweight[e],s,ep];
                }
                /* +/-1 for pawn capturing */
                E = board[--e];
                if(E && (E & 17) == other_colour){
                    movelist[++k]=[weight + P4_VALUES[E] + pweight[e], s, e, 0];
                }
                e += 2;
                E = board[e];
                if(E && (E & 17) == other_colour){
                    movelist[++k]=[weight + P4_VALUES[E] + pweight[e], s, e, 0];
                }
            }
        }
    }
    return movelist;
}


/* check_castling
 *
 * s - "start" location (either king home square, or king destination)
 *     the checks are done left to right.
 * * dir - direction of travel (White: 10, Black: -10)
 * side: -1 means Q side; 1, K side
 */

function p4_check_castling(board, s, colour, dir, side){
    var e;
    var E;
    var m, p;
    var pawn = colour + 2;
    var rook = colour + 4;
    var knight = colour + 6;
    var bishop = colour + 8;
    var queen = colour + P4_QUEEN;
    var king = colour + P4_KING;

    /* go through 3 positions, checking for check in each
     */
    for(p = s; p < s + 3; p++){
        //bishops, rooks, queens
        for(m = dir - 1; m < dir + 2; m++){
            e = p + m;
            var end = (m == dir) ? 4: 8;
            while(1){
                E=board[e];
                if (E){
                    if((E & end) && ((E & 1) == colour))
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
            board[p + 2 * dir - 1] == knight)
            return 0;
    }

    /* a pawn or king in any of 5 positions on row 7.
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



function p4_dump_board(_board, name){
    if (name !== undefined)
        console.log(name);
    var board = [];
    for (var i = 0; i < 120; i++){
        board[i] = _board[i] == 16 ? '' : _board[i];
    }
    for (var y = 2; y < 10; y++){
        var s = y * 10;
        console.log(board.slice(s + 1, s + 9));
    }
}

function p4_dump_state(state){
    p4_dump_board(state.weights[0], 'w weights');
    p4_dump_board(state.weights[1], 'b weights');
    p4_dump_board(state.pweights[0], 'w p weights');
    p4_dump_board(state.pweights[1], 'b p weights');
    p4_dump_board(state.kweights[0], 'w king weights');
    p4_dump_board(state.kweights[1], 'b king weights');
    p4_dump_board(state.board, 'board');
    var attr;
    for (attr in state){
        if (! /weights|board$/.test(attr))
            console.log(attr, state[attr]);
        else
            console.log(attr, "board array", state[attr].length);
    }
}

//************************************* findmove();

function p4_findmove(state, level){
    p4_prepare(state);
    var t=p4_treeclimber(state, level, state.to_play, 0,
                      P4_OFF_BOARD, P4_OFF_BOARD,
                      P4_MIN_SCORE, P4_MAX_SCORE,
                      state.enpassant, state.castles);
    return [t[1], t[2]];
}



/* move(s, e, queener)
 * s, e are start and end positions
 *
 * queener is the desired pawn promotion if the move gets a pawn to
  the other end.

 return value contains bitwise flags

*/

var P4_MOVE_FLAG_OK = 1;
var P4_MOVE_FLAG_CHECK = 2;
var P4_MOVE_FLAG_MATE = 4;
var P4_MOVE_FLAG_CAPTURE = 8;
var P4_MOVE_FLAG_CASTLE_KING = 16;
var P4_MOVE_FLAG_CASTLE_QUEEN = 32;

var P4_MOVE_ILLEGAL = 0;
var P4_MOVE_MISSED_MATE = P4_MOVE_FLAG_CHECK | P4_MOVE_FLAG_MATE;
var P4_MOVE_CHECKMATE = P4_MOVE_FLAG_OK | P4_MOVE_FLAG_CHECK | P4_MOVE_FLAG_MATE;
var P4_MOVE_STALEMATE = P4_MOVE_FLAG_OK | P4_MOVE_FLAG_MATE;

function p4_move(state, s, e){
    var board = state.board;
    var colour = state.to_play;
    var E=board[e];
    var S=board[s];

    /* If the king has just been taken, a checkmate or stalemate has
     * previously been missed, so signal the end now.
     *
     * If the computer suggests (s == 0 && e == 0), treeclimber found no
     * pieces to move, which is an extreme case of stalemate.
     */
    if((E&14) == P4_KING || (s == 0 && e == 0)){
        console.log('checkmate - got thru checks');
        return P4_MOVE_MISSED_MATE;
    }

    /*see if this move is even slightly legal, disregarding check.*/
    var legal = false;
    p4_prepare(state);
    var p = p4_parse(state, colour, state.enpassant, state.castles, 0);
    for (var z = 0; z < p.length; z++){
        if (s == p[z][1] && e == p[z][2]){
            legal = true;
            break;
        }
    }
    if (! legal) {
        console.log('no such move!', p,
                    ' s,e', s, e,' S,E', S, E);
        return P4_MOVE_ILLEGAL;
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
    var t = p4_treeclimber(state, 1, 1 - colour, 0, s, e, P4_MIN_SCORE, P4_MAX_SCORE,
                           state.enpassant, state.castles);
    var in_check = t[0] > 400;
    var is_mate = t[0] < -400;

    if (in_check) {
        console.log('in check', t);
        return P4_MOVE_ILLEGAL;
    }
    /* see if it is check already -- that is, if we have another move now,
     * can we get the king?
     *
     * NB: state.enpassant is irrelevant because it is for wrong colour
     */
    t = p4_treeclimber(state, 0, colour, 0, s, e, P4_MIN_SCORE, P4_MAX_SCORE,
                       0, state.castles);
    var is_check = t[0] > 400;

    var flags = p4_modify_state_for_move(state, s, e);

    if (is_check && is_mate){
        return flags | P4_MOVE_CHECKMATE;
    }
    if (is_check){
        return flags | P4_MOVE_FLAG_OK | P4_MOVE_FLAG_CHECK;
    }
    if (is_mate){
        return flags | P4_MOVE_STALEMATE;
    }
    return flags | P4_MOVE_FLAG_OK;
}

function p4_modify_state_for_move(state, s, e){
    var board = state.board;
    var colour = state.to_play;
    state.history.push([s, e]);
    var gap = e - s;
    var piece = board[s] & 14;
    var dir = (10 - 20 * colour);
    var flags = 0;
    state.enpassant = 0;
    /*draw timeout: 50 moves without pawn move or capture is a draw */
    if (board[e]){
        state.draw_timeout = 0;
        flags |= P4_MOVE_FLAG_CAPTURE;
    }
    else{
        state.draw_timeout++;
    }
    if (piece == P4_PAWN){
        state.draw_timeout = 0;
        /*queening*/
        if(board[e + dir] == P4_EDGE)
            board[s] = state.pawn_promotion[colour] + colour;

        /* setting en passant flag*/
        if(gap == 2 * dir && ((board[e - 1] & 14) == 2 ||
                              (board[e + 1] & 14) == 2))
            state.enpassant = s + dir;

        /*taking en passant*/
        if(!board[e] && gap % 10){
            board[e] = board[e - dir];
            board[e - dir] = 0;
            flags |= P4_MOVE_FLAG_CAPTURE;
        }
    }
    else if(piece == P4_KING && gap * gap == 4){  //castling - move rook too
        var rs = s - 4 + (s < e) * 7;
        var re = (s + e) >> 1;
        board[re] = board[rs];
        board[rs] = 0;
        console.log("castling", s, e, gap, s + gap / 2, re);
        flags |= (s > e) ? P4_MOVE_FLAG_CASTLE_QUEEN : P4_MOVE_FLAG_CASTLE_KING;
    }

    if (state.castles){
        state.castles &= p4_get_castles_mask(s, e, colour);
        console.debug("castle state", state.castles);
    }
    board[e] = board[s];
    board[s] = 0;
    state.moveno++;
    state.to_play = 1 - colour;
    return flags;
}


function p4_jump_to_moveno(state, moveno){
    console.log('jumping to move', moveno);
    var i;
    if (moveno === undefined || moveno > state.moveno)
        moveno = state.moveno;
    else if (moveno < 0){
        moveno = state.moveno - moveno - 1;
    }
    var state2 = p4_fen2state(state.beginning);
    for (i = 0; i < moveno - state2.moveno; i++){
        var m = state.history[i];
        p4_move(state2, m[0], m[1]);
    }
    /* copy the replayed state accross, not all that deeply, but
     * enough to cover, eg, held references to board. */

    var attr, dest;
    for (attr in state2){
        var src = state2[attr];
        if (attr instanceof Array){
            dest = state[attr];
            dest.length = 0;
            for (i = 0; i < src.length; i++){
                dest[i] = src[i];
            }
        }
        else {
            state[attr] = src;
        }
    }
}

/* setting the promotion to undefined lets the computer choose.
 * (thus far, it always chooses queen).
 */
function p4_set_pawn_promotion(state, colour, name){
    var piece;
    if (name === undefined)
        piece = P4_QUEEN;
    else {
        piece = {
            rook: P4_ROOK,
            knight: P4_KNIGHT,
            bishop: P4_BISHOP,
            queen: P4_QUEEN
        }[name.toLowerCase()] || P4_QUEEN;
    }
    state.pawn_promotion[colour] = piece;
}

/* write a standard FEN notation
 * http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
 * */
function p4_state2fen(state, reduced){
    var FEN_LUT = '  PpRrNnBbKkQq';
    var board = state.board;
    var fen = '';
    //fen does Y axis backwards, X axis forwards */
    for (var y = 9; y > 1; y--){
        var count = 0;
        for (var x = 1; x < 9; x++){
            var piece = board[y * 10 + x];
            if (piece == 0)
                count++;
            else{
                if (count)
                    fen += count.toString();
                fen += FEN_LUT.charAt(piece);
                count = 0;
            }
        }
        if (count)
            fen += count;
        if (y > 2)
            fen += '/';
    }
    /*white or black */
    fen += ' ' + 'wb'.charAt(state.to_play) + ' ';
    /*castling */
    if (state.castles){
        for (var i = 0; i < 4; i++){
            if ((state.castles >> i) & 1)
                fen += 'KQkq'.charAt(i);
        }
    }
    else
        fen += '-';
    /*enpassant */
    if (state.enpassant !== 0){
        fen += ' ' + p4_stringify_point(state.enpassant);
    }
    else
        fen += ' -';
    if (reduced){
        /*if the 'reduced flag is set, the move number and draw
         *timeout are not added. This form is used to detect draws by
         *3-fold repetition.*/
        return fen;
    }
    fen += ' ' + state.draw_timeout + ' ';
    fen += (state.moveno >> 1) + 1;
    return fen;
}

function p4_stringify_point(p){
    var letters = " abcdefgh";
    var x = p % 10;
    var y = (p - x) / 10 - 1;
    return letters.charAt(x) + y;
}

function p4_destringify_point(p){
    var x = parseInt(p.charAt(0), 19) - 9; //a-h <-> 10-18, base 19
    var y = parseInt(p.charAt(1)) + 1;
    console.log(p, y, x);
    if (y >= 2 && y < 10 && x >= 1 && x < 9)
        return y * 10 + x;
    return undefined;
}

/* read a standard FEN notation
 * http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
 * */
function p4_fen2state(fen, state){
    if (state === undefined)
        state = p4_initialise_state();
    var BOARD_LUT = {
        P: 2,
        p: 3,
        R: 4,
        r: 5,
        N: 6,
        n: 7,
        B: 8,
        b: 9,
        K: 10,
        k: 11,
        Q: 12,
        q: 13
    };
    var board = state.board;
    var fenbits = fen.split(' ');
    var fen_board = fenbits[0];
    var fen_toplay = fenbits[1];
    var fen_castles = fenbits[2];
    var fen_enpassant = fenbits[3];
    var fen_timeout = fenbits[4];
    var fen_moveno = fenbits[5];

    //fen does Y axis backwards, X axis forwards */
    /* fragile!*/
    var i = 91;
    for (var j = 0; j < fen_board.length; j++){
        var c = fen_board.charAt(j);
        if (c == '/'){
            i -= 18;
            continue;
        }
        var piece = BOARD_LUT[c];
        if (piece !== undefined){
            board[i] = piece;
            i++;
        }
        else {
            var end = i + parseInt(c);
            for (; i < end; i++){
                board[i] = 0;
            }
        }
    }
    state.to_play = (fen_toplay.toLowerCase() == 'b') ? 1 : 0;
    state.castles = 0;
    for (i = 0; i < fen_castles.length; i++){
        var bit = {q: 8, k: 4, Q: 2, K: 1}[fen_castles.charAt(i)];
        state.castles |= (bit || 0);
    }
    state.enpassant = (fen_enpassant != '-') ? p4_destringify_point(fen_enpassant) : 0;
    state.draw_timeout = parseInt(fen_timeout);
    state.moveno = 2 * (parseInt(fen_moveno) - 1) + state.to_play;
    state.history = [];
    state.beginning = fen;
    return state;
}

/* p4_initialise_state() creates the board and initialises weight
 * arrays etc.
 */

function p4_initialise_state(){
    var board;
    if (P4_USE_TYPED_ARRAYS){
        board = new Int32Array(121);
        P4_BASE_WEIGHTS = new Int32Array(120);
        P4_BASE_PAWN_WEIGHTS = new Int32Array(120);

    }
    else {
        board = [];
        P4_BASE_WEIGHTS = [];
        P4_BASE_PAWN_WEIGHTS = [];
    }
    var zeros = [];
    for(var i = 0; i < 120; i++){
        var y = parseInt(i / 10);
        P4_BASE_PAWN_WEIGHTS[i] = parseInt(P4_PAWN_WEIGHTS.charAt(y), 35);
        P4_BASE_WEIGHTS[i] = parseInt(P4_WEIGHT_STRING.charAt((i < 60) ? i : 119 - i),
                                      35) & 15;
        board[i] = 16;
        zeros[i] = 0;
    }
    function _weights(){
        if (P4_USE_TYPED_ARRAYS)
            return new Int32Array(120);
        return zeros.slice();
    }

    board[P4_OFF_BOARD] = 0;
    var state = {
        board: board,
        pawn_promotion: [P4_QUEEN, P4_QUEEN],
        pweights: [_weights(), _weights()],
        kweights: [_weights(), _weights()],
        weights: [_weights(), _weights()],
        history: []
    };
    return state;
}

function p4_new_game(){
    return p4_fen2state(P4_INITIAL_BOARD);
}
