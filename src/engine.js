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

var P4_PIECE_LUT = {
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


function p4_get_castles_mask(s, e, colour){
    var mask = 0;
    var shift = colour * 2;
    var side = colour * 70;
    var s2 = s - side;
    var e2 = e + side;
    //wipe both our sides if king moves
    if (s2 == 25)
        mask |= 3 << shift;
    //wipe one side on any move from rook points
    else if (s2 == 21)
        mask |= 1 << shift;
    else if (s2 == 28)
        mask |= 2 << shift;

    //or on any move *to* opposition corners
    if (e2 == 91)
        mask |= 4 >> shift;
    else if (e2 == 98)
        mask |= 8 >> shift;
    return 15 ^ mask;
}


/****treeclimber */
function p4_treeclimber(state, count, colour, score, s, e, alpha, beta, ep,
                        castle_state, promotion){
    var board = state.board;
    var i;
    var ncolour = 1 - colour;
    score = -score;
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
        if(board[e + (10 - 20 * moved_colour)] == P4_EDGE){
            /*got to end; replace the pawn on board and in pieces cache.
             *
             * The only time promotion is *not* undefined is the top level when
             * a human is making a move. */
            if (promotion === undefined)
                promotion = P4_QUEEN;
            promotion |= moved_colour;
            board[e] = promotion;
            piece_locations[piece_locations.length - 1][0] = promotion;
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
        rook = moved_colour + P4_ROOK;
        board[rs]=0;
        board[re]=rook;
        piece_locations.push([rook, re]);
    }
    if (castle_state)
        castle_state &= p4_get_castles_mask(s, e, moved_colour);

    var movelist = p4_parse(state, colour, ep, castle_state, score);
    var movecount = movelist.length;
    var mv, bs, be;
    if(count){
        //branch nodes
        var t;
        bs = 0;
        be = 0;
        var b = beta;
        for(i = 0; i < movecount; i++){
            mv = movelist[i];
            var mscore = mv[0];
            var ms = mv[1];
            var me = mv[2];
            var mep = mv[3];

            if (mscore > P4_WIN){ //we won! Don't look further.
                alpha = P4_KING_VALUE;
                bs = ms;
                be = me;
                break;
            }
            t = -p4_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                -b, -alpha, mep, castle_state)[0];
            if (t > alpha && t < beta && i != 0){
                t = -p4_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                    -beta, -alpha, mep, castle_state)[0];
            }
            if (t > alpha){
                alpha = t;
                bs = ms;
                be = me;
            }
            if (alpha >= beta){
                break;
            }
            b = alpha + 1;
        }

        if (alpha < -P4_WIN_NOW){
            /* Whatever we do, we lose the king.
             *
             * But is it check?
             * If not, this is stalemate, and the score doesn't apply.
             */
            if (! p4_check_check(state, colour)){
                alpha = state.stalemate_scores[colour];
            }
        }
        if (alpha < -P4_WIN){
            /*make distant checkmate seem less bad */
            alpha += P4_WIN_DECAY;
        }
    }
    else{
        //leaf nodes
        while(beta > alpha && --movecount != -1){
            if(movelist[movecount][0] > alpha){
                alpha = movelist[movecount][0];
            }
        }
    }
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
    return [alpha, bs, be];
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
    var ws = material[0] - material[1];
    state.values = [[], []];
    var material_sum = material[0] + material[1] + 2 * P4_VALUES[P4_QUEEN];
    var wmul = 2 * (material[1] + P4_VALUES[P4_QUEEN]) / material_sum;
    var bmul = 2 * (material[0] + P4_VALUES[P4_QUEEN]) / material_sum;
    state.stalemate_scores = [parseInt(0.5 + (wmul - 1) * 2 * P4_VALUES[P4_QUEEN]),
                              parseInt(0.5 + (bmul - 1) * 2 * P4_VALUES[P4_QUEEN])];
    console.log(state.stalemate_scores);
    for (i = 0; i < P4_VALUES.length; i++){
        var v = P4_VALUES[i];
        if (v < P4_WIN){
            state.values[0][i] = parseInt(v * wmul + 0.5);
            state.values[1][i] = parseInt(v * bmul + 0.5);
        }
        else {
            state.values[0][i] = v;
            state.values[1][i] = v;
        }
    }
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
                var wdx = wkx - x;
                var wdy = wky - y;
                var bdx = bkx - x;
                var bdy = bky - y;
                var wd2 = wdx * wdx + wdy * wdy + 1;
                var bd2 = bdx * bdx + bdy * bdy + 1;

                b_weights[i] += parseInt(25 * wmul / wd2);
                bk_weights[i] += parseInt(18 * wmul / wd2);
                w_weights[i] += parseInt(25 * bmul / bd2);
                wk_weights[i] += parseInt(18 * bmul / bd2);
                if (wmul < 1){//white winning
                    bk_weights[i] += parseInt(bmul * P4_BASE_WEIGHTS[i] / wmul);
                }
                else if (bmul < 1){//black winning
                    wk_weights[i] += parseInt(wmul * P4_BASE_WEIGHTS[i] / bmul);
                }


            }
            /* pawns weighted toward centre at start then forwards only.
             * pawn weights are also slightly randomised, so each game is different.
             */
            var wp = 0, bp = 0;
            if (early){
                if (y >= 4)
                    wp += parseInt((((P4_DEBUG ? 0.5 : Math.random()) + 0.2)
                                    * w_weights[i]));
                if (y <= 7)
                    bp += parseInt((((P4_DEBUG ? 0.5 : Math.random()) + 0.2)
                                    * b_weights[i]));
            }
            if (y == 9)
                wp += state.values[0][P4_QUEEN] - state.values[0][P4_PAWN];
            if (y == 2)
                bp += state.values[1][P4_QUEEN] - state.values[1][P4_PAWN];

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
    var i, j;
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
    var values = state.values[other_colour];
    for (j = 0; j < plen; j++){
        s=pieces[j][1]; // board position
        a=board[s]; //piece number
        /* the pieces list is only a convenient short cut.
         * pieces that have moved/been taken will still be listed at their
         * old place. So check.
         */
        if (pieces[j][0]==a){
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
                            movelist[++k]=[weight + values[E] + weight_lut[e], s, e, 0];
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
                                movelist[++k]=[weight + values[E] + weight_lut[e], s, e, 0];
                            }
                        }while(!E);
                    }
                }
            }
            else{    //pawns
                weight=score-pweight[s];
                e=s+dir;
                if(!board[e]){
                    movelist[++k] = [weight + pweight[e], s, e, 0];
                    /*2 square moves at start are flagged by 0 pweights weighting*/
                    var e2 = e + dir;
                    if(! pweight[s] && (!board[e2])){
                        movelist[++k] = [weight + pweight[e2], s, e2, e];
                    }
                }
                /* +/-1 for pawn capturing */
                E = board[--e];
                if(E && (E & 17) == other_colour){
                    movelist[++k]=[weight + values[E] + pweight[e], s, e, 0];
                }
                e += 2;
                E = board[e];
                if(E && (E & 17) == other_colour){
                    movelist[++k]=[weight + values[E] + pweight[e], s, e, 0];
                }
            }
        }
    }
    if(ep){
        var pawn = P4_PAWN | colour;
        var taken;
        /* Some repetitive calculation here could be hoisted out, but that would
            probably slow things: the common case is no pawns waiting to capture
            enpassant, not 2.
         */
        s = ep - dir - 1;
        if (board[s] == pawn){
            taken = values[board[ep - dir]];
            movelist[++k] = [score - pweight[s] + pweight[ep] + taken, s, ep, 0];
        }
        s += 2;
        if (board[s] == pawn){
            taken = values[board[ep - dir]];
            movelist[++k] = [score - pweight[s] + pweight[ep] + taken, s, ep, 0];
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
            e = p;
            do{
                e += m;
                E=board[e];
            } while (! E);
            if (E == queen ||
                (E == rook && m == dir) ||
                (E == bishop && m != dir))
                return 0;
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
    if (side == -1)
        s += 2;
    while (E == 0){   //queen or rook out on other side
        s -= side;
        E=board[s];
        if(E == rook || E == queen)
            return 0;
    }
    return 1;
}

function p4_check_check(state, colour){
    var board = state.board;
    /*find the king.  The pieces list updates from the end,
     * so the last-most king is correctly placed.*/
    var pieces = state.pieces[colour];
    var p;
    var i = pieces.length;
    do {
        p = pieces[--i];
    } while (p[0] != (P4_KING | colour));
    var s = p[1];
    var other_colour = 1 - colour;
    var dir = 10 - 20 * colour;
    if (board[s + dir - 1] == (P4_PAWN | other_colour) ||
        board[s + dir + 1] == (P4_PAWN | other_colour))
        return true;
    var knight_moves = P4_MOVES[P4_KNIGHT];
    var king_moves = P4_MOVES[P4_KING];
    var knight = P4_KNIGHT | other_colour;
    var king = P4_KING | other_colour;
    for (i = 0; i < 8; i++){
        if (board[knight_moves[i]] == knight ||
            board[king_moves[i]] == king)
            return true;
    }
    var diagonal_moves = P4_MOVES[P4_BISHOP];
    var grid_moves = P4_MOVES[P4_ROOK];

    /* diag_mask ignores rook moves of queens,
     * grid_mask ignores the bishop moves*/
    var diag_slider = P4_BISHOP | other_colour;
    var diag_mask = 27;
    var grid_slider = P4_ROOK | other_colour;
    var grid_mask = 23;
    for (i = 0; i < 4; i++){
        var m = diagonal_moves[i];
        var e = s;
        var E;
        do {
            e += m;
            E = board[e];
            if((E & diag_mask) == diag_slider)
                return true;
        } while (!E);

        m = grid_moves[i];
        e = s;
        do {
            e += m;
            E = board[e];
            if((E & grid_mask) == grid_slider)
                return true;
        } while (!E);
    }
    return false;
}




function p4_dump_board(_board, name){
    if (name !== undefined)
        console.log(name);
    var board = [];
    for (var i = 0; i < 120; i++){
        board[i] = _board[i];
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
    var t = p4_treeclimber(state, level, state.to_play, 0,
                           P4_OFF_BOARD, P4_OFF_BOARD,
                           P4_MIN_SCORE, P4_MAX_SCORE,
                           state.enpassant, state.castles);
    return [t[1], t[2]];
}



/* p4_move(s, e, promotion)
 * s, e are start and end positions
 *
 * promotion is the desired pawn promotion if the move gets a pawn to the other
 * end.
 *
 * return value contains bitwise flags
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

function p4_move(state, s, e, promotion){
    var board = state.board;
    var colour = state.to_play;
    if (s != parseInt(s)){
        if (e === undefined){
            var mv = p4_interpret_movestring(state, s);
            s = mv[0];
            e = mv[1];
            if (s == 0)
                return {flags: P4_MOVE_ILLEGAL, ok: false};
            promotion = mv[2];
        }
        else {/*assume two point strings: 'e2', 'e4'*/
            s = p4_destringify_point(s);
            e = p4_destringify_point(e);
        }
    }
    var E=board[e];
    var S=board[s];

    /* If the king has just been taken, a checkmate or stalemate has
     * previously been missed, so signal the end now.
     *
     * If the computer suggests (s == 0 && e == 0), treeclimber found no
     * pieces to move, which is an extreme case of stalemate.
     */
    if((E&14) == P4_KING || (s == 0 && e == 0)){
        console.log('checkmate - got thru checks', s, e, E);
        return {flags: P4_MOVE_MISSED_MATE, ok: false};
    }

    /*See if this move is even slightly legal, disregarding check.
     *
     * At the same time, gather information to determine whether this
     * move needs qualifying information in the PGN representation.
     * i.e., does 'Nc3' suffice, or is 'Nbc3', 'N1c3', or even 'Nb1c3'
     * necessary?
     */
    var co_landers = [];
    var legal = false;
    p4_prepare(state);
    var p = p4_parse(state, colour, state.enpassant, state.castles, 0);
    console.log(p);
    for (var i = 0; i < p.length; i++){
        if (e == p[i][2]){
            if (s == p[i][1])
                legal = true;
            else if (board[p[i][1]] == S){
                co_landers.push(p[i][1]);
            }
        }
    }
    if (! legal) {
        return {flags: P4_MOVE_ILLEGAL, ok: false};
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
                           state.enpassant, state.castles, promotion);
    var in_check = t[0] > P4_WIN;
    var is_mate = t[0] < -P4_WIN;

    if (in_check) {
        console.log('in check', t);
        return {flags: P4_MOVE_ILLEGAL, ok: false};
    }
    /* see if it is check already -- that is, if we have another move now,
     * can we get the king?
     *
     * NB: state.enpassant is irrelevant because it is for wrong colour
     */
    t = p4_treeclimber(state, 0, colour, 0, s, e, P4_MIN_SCORE, P4_MAX_SCORE,
                       0, state.castles);
    var is_check = t[0] > P4_WIN;

    var flags = p4_modify_state_for_move(state, s, e, promotion);

    if (is_check && is_mate){
        flags |= P4_MOVE_CHECKMATE;
    }
    else if (is_check){
        flags |= P4_MOVE_FLAG_CHECK;
    }
    else if (is_mate){
        flags |= P4_MOVE_STALEMATE;
    }
    var movestring = p4_move2string(s, e, S & 14, promotion, flags, co_landers);
    console.log(s, e, movestring);

    return {
        flags: flags, 
        string: movestring,
        ok: true
    };
}

function p4_move2string(s, e, piece, promotion, flags, co_landers){
    piece &= 14;
    var FEN_LUT = '  PpRrNnBbKkQq';
    var src, dest;
    var mv;
    var capture = flags & P4_MOVE_FLAG_CAPTURE;
    src = p4_stringify_point(s);
    dest = p4_stringify_point(e);
    if (piece == P4_PAWN){
        if (capture){
            mv = src.charAt(0) + 'x' + dest;
        }
        else
            mv = dest;
        if (e > 90 || e < 30){  //end row, queening
            if (promotion === undefined)
                promotion = P4_QUEEN;
            mv += '=' + FEN_LUT[promotion];
        }
    }
    else if (piece == P4_KING &&
             (s-e) * (s-e) == 4) {
        if (e < s)
            mv = 'O-O-O';
        else
            mv = 'O-O';
    }
    else {
        var row_qualifier = '';
        var col_qualifier = '';
        var pstr = FEN_LUT[piece];
        var sx = s % 10;
        var sy = parseInt(s / 10);
        if (co_landers.length){
            for (var i = 0; i < co_landers.length; i++){
                var c = co_landers[i];
                var cx = c % 10;
                var cy = parseInt(c / 10);
                if (cx == sx)/*same column, so qualify by row*/
                    row_qualifier = src.charAt(1);
                if (cy == sy)
                    col_qualifier = src.charAt(0);
            }
            if (row_qualifier == '' && col_qualifier == ''){
                /*no co-landers on the same rank or file, so one or the other will do.
                 * By convention, use the column (a-h) */
                col_qualifier = src.charAt(0);
            }
        }
        mv = pstr + col_qualifier + row_qualifier + (capture ? 'x' : '') + dest;
        console.log(mv, piece, co_landers);
    }
    if (flags & P4_MOVE_FLAG_CHECK){
        if (flags & P4_MOVE_FLAG_MATE)
            mv += '#';
        else
            mv += '+';
    }
    else if (flags & P4_MOVE_FLAG_MATE)
        mv += ' stalemate';

    return mv;
}

function p4_modify_state_for_move(state, s, e, promotion){
    var board = state.board;
    var colour = state.to_play;
    state.history.push([s, e, promotion]);
    var gap = e - s;
    var piece = board[s] & 14;
    var dir = (10 - 20 * colour);
    var flags = P4_MOVE_FLAG_OK;
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
        if(board[e + dir] == P4_EDGE){
            if (promotion === undefined)
                promotion = P4_QUEEN;
            board[s] = promotion | colour;
        }
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
    if (moveno === undefined || moveno > state.moveno)
        moveno = state.moveno;
    else if (moveno < 0){
        moveno = state.moveno - moveno - 1;
    }
    var state2 = p4_fen2state(state.beginning);
    var i = 0;
    while (state2.moveno < moveno){
        var m = state.history[i++];
        p4_move(state2, m[0], m[1], m[2]);
    }
    /* copy the replayed state across, not all that deeply, but
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
        var lut = [2, 'K', 1, 'Q', 8, 'k', 4, 'q'];
        for (var i = 0; i < 8; i += 2){
            if (state.castles & lut[i]){
                fen += lut[i + 1];
            }
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
    var board = state.board;
    var fenbits = fen.split(' ');
    var fen_board = fenbits[0];
    var fen_toplay = fenbits[1];
    var fen_castles = fenbits[2];
    var fen_enpassant = fenbits[3];
    var fen_timeout = fenbits[4];
    var fen_moveno = fenbits[5];
    if (fen_timeout === undefined)
        fen_timeout = 0;
    if (fen_moveno === undefined)
        fen_moveno = 1;
    //fen does Y axis backwards, X axis forwards */
    /* fragile!*/
    var i = 91;
    for (var j = 0; j < fen_board.length; j++){
        var c = fen_board.charAt(j);
        if (c == '/'){
            i -= 18;
            continue;
        }
        var piece = P4_PIECE_LUT[c];
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
        var bit = {k: 8, q: 4, K: 2, Q: 1}[fen_castles.charAt(i)];
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
        /*base weights happen to equal
         * Math.max(0, parseInt(5.75 - Math.pow((x - 4.5) * (x - 4.5) + 1.4 * (y - 5.5) * (y - 5.5), 0.61)));
         */
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

/*convert an arbitrary movestring into a pair of integers offsets into
 * the board. The string might be in any of these forms:
 *
 *  "d2-d4" "d2d4" "d4" -- moving a pawn
 *
 *  "b1-c3" "b1c3" "Nc3" "N1c3" "Nbc3" "Nb1c3" -- moving a knight
 *
 *  "b1xc3" "b1xc3" "Nxc3" -- moving a knight, also happens to capture.
 *
 *  "O-O" "O-O-O" -- special cases for castling ("e1-c1", etc, also work)
 *
 *  Note that for the "Nc3" (pgn) format, some knowledge of the board
 *  is necessary, so the state parameter is required. If it is
 *  undefined, the other forms will still work.
 */

function p4_interpret_movestring(state, str){
    /* Ignore any irrelevant characters, then tokenise.
     *
     */
    var FAIL = [0, 0];
    var algebraic_re = /^\s*([RNBQK]?[a-h]?[1-8]?)[ :x-]*([a-h][1-8]?)(=[RNBQ])?[!?+#e.p]*\s*$/;
    var castle_re = /^\s*(O-O(-O)?)\s*$/;
    var position_re = /^[a-h][1-8]$/;

    var m = algebraic_re.exec(str);
    if (m == null){
        /*check for castling notation (O-O, O-O-O) */
        m = castle_re.exec(str);
        if (m){
            s = 25 + state.to_play * 70;
            if (m[2])/*queenside*/
                e = s - 2;
            else
                e = s + 2;
            console.log(m, s, e);
        }
        else
            return FAIL;
    }
    console.log(m);
    var src = m[1];
    var dest = m[2];
    var queen = m[3];
    var s, e, q;
    var moves, i;
    if (src == '' || src == undefined){
        /* a single coordinate pawn move */
        e = p4_destringify_point(dest);
        s = p4_find_source_point(state, e, 'P' + dest.charAt(0));
    }
    else if ('RNBQK'.indexOf(src.charAt(0)) != -1){
        /*pgn format*/
        e = p4_destringify_point(dest);
        s = p4_find_source_point(state, e, src);
    }
    else if (position_re.test(src) && position_re.test(dest)){
        s = p4_destringify_point(src);
        e = p4_destringify_point(dest);
    }
    else if (/^[a-h]$/.test(src)){
        e = p4_destringify_point(dest);
        s = p4_find_source_point(state, e, 'P' + src);
    }
    if (s == 0)
        return FAIL;

    if (queen){
        /* the chosen queen piece */
        q = P4_PIECE_LUT[queen.charAt(1)];
    }
    return [s, e, q];
}


function p4_find_source_point(state, e, str){
    var colour = state.to_play;
    var piece = P4_PIECE_LUT[str.charAt(0)];
    piece |= colour;
    var s, i;

    var row, column;
    /* can be specified as Na, Na3, N3, and who knows, N3a? */
    for (i = 1; i < str.length; i++){
        if (/[a-h]/.test(str.charAt(i))){
            column = str.charCodeAt(i) - 96;
        }
        else if (/[1-8]/.test(str.charAt(i))){
            /*row goes 2 - 9 */
            row = 1 + parseInt(str.charAt(i));
        }
    }
    var possibilities = [];
    p4_prepare(state);
    var p = p4_parse(state, colour,
                     state.enpassant, state.castles, 0);
    for (i = 0; i < p.length; i++){
        var mv = p[i];
        if (e == mv[2]){
            s = mv[1];
            if (state.board[s] == piece &&
                (column === undefined || column == s % 10) &&
                (row === undefined || row == parseInt(s / 10))
               ){
               var t = p4_treeclimber(state, 1, 1 - colour, 0, s, e,
                                      P4_MIN_SCORE, P4_MAX_SCORE,
                                      state.enpassant, state.castles);
               if (t[0] < P4_WIN)
                   possibilities.push(s);
            }
        }
    }
    console.log("finding", str, "that goes to", e, "got", possibilities);

    if (possibilities.length == 0){
        return 0;
    }
    else if (possibilities.length > 1){
        console.log("p4_find_source_point seems to have failed",
                    state, e, str,
                    possibilities);
    }
    return possibilities[0];
}
