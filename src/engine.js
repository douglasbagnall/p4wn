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

/* Threshold that indicates a king has been taken. It has to be quite
 * a bit less than the value of a king, in case someone finds a way
 * to, say, sacrifice two queens in order to checkmate.
 */
var P4_KING_VALUE = P4_VALUES[10];
var P4_WIN = P4_KING_VALUE >> 1;

/* every move, a winning score decreases by this much */
var P4_WIN_DECAY = 300;
var P4_WIN_NOW = P4_KING_VALUE - 200;

/* P4_{MAX,MIN}_SCORE should be beyond any possible evaluated score */

var P4_MAX_SCORE = 9999;    // extremes of evaluation range
var P4_MIN_SCORE = -P4_MAX_SCORE;

var P4_CENTRALISING_WEIGHTS;
var P4_BASE_PAWN_WEIGHTS;
var P4_KNIGHT_WEIGHTS;

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

function p4_alphabeta_treeclimber(state, count, colour, score, s, e, alpha, beta,
                                  promotion){
    var move = p4_make_move(state, s, e, promotion);
    var i;
    var ncolour = 1 - colour;
    var movelist = p4_parse(state, colour, move.ep, -score);
    var movecount = movelist.length;
    var mv;
    if(count){
        //branch nodes
        var t;
        for(i = 0; i < movecount; i++){
            mv = movelist[i];
            var mscore = mv[0];
            var ms = mv[1];
            var me = mv[2];
            if (mscore > P4_WIN){ //we won! Don't look further.
                alpha = P4_KING_VALUE;
                break;
            }
            t = -p4_alphabeta_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                          -beta, -alpha);
            if (t > alpha){
                alpha = t;
            }
            if (alpha >= beta){
                break;
            }
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
    p4_unmake_move(state, move);
    return alpha;
}


/* prepare() works out weightings for assessing various moves,
 * favouring centralising moves early, for example.
 *
 * It is called before each tree search, not for each parse(),
 * so it is OK for it to be a little bit slow.
 */

function p4_prepare(state){
    var i, j, x, y;
    var pieces = state.pieces = [[], []];
    /*convert state.moveno half move count to move cycle count */
    var moveno = state.moveno >> 1;
    var board = state.board;

    /* high earliness_weight indicates a low move number. The formula
     * should work above moveno == 50, but this is javascript.
     */
    var earliness_weight = (moveno > 50) ? 0 : parseInt(6 * Math.exp(moveno * -0.07));
    var king_should_hide = moveno < 12;
    var early = moveno < 5;
    var kings = [0, 0];
    var material = [0, 0];
    /* find the pieces, kings, and weigh material*/
    var best_pieces = [0, 0];
    for(i = 20; i  < 100; i++){
        var a = board[i];
        var piece = a & 14;
        var colour = a & 1;
        if(piece){
            pieces[colour].push([a, i]);
            if (piece == P4_KING){
                kings[colour] = i;
            }
            else{
                material[colour] += P4_VALUES[piece];
                best_pieces[colour] = Math.max(best_pieces[colour], P4_VALUES[piece]);
            }
        }
    }

    /* Shuffle the pieces, so tied scores don't systematically favour
       one corner of the board or the other.*/
    if (P4_SHUFFLE_PIECES){
        for (j = 0; j < 2; j++){
            var p = pieces[j];
            for (i = p.length - 1; i > 0; i--){
                var k = p4_random_int(state, i + 1);
                var tmp = p[k];
                p[k] = p[i];
                p[i] = tmp;
            }
        }
    }
    /*does a draw seem likely soon?*/
    var draw_likely = (state.draw_timeout > 90 || state.current_repetitions >= 2);
    if (draw_likely)
        console.log("draw likely", state.current_repetitions, state.draw_timeout);
    state.values = [[], []];
    var qvalue = P4_VALUES[P4_QUEEN]; /*used as ballast in various ratios*/
    var material_sum = material[0] + material[1] + 2 * qvalue;
    var wmul = 2 * (material[1] + qvalue) / material_sum;
    var bmul = 2 * (material[0] + qvalue) / material_sum;
    var emptiness = 4 * P4_QUEEN / material_sum;
    state.stalemate_scores = [parseInt(0.5 + (wmul - 1) * 2 * qvalue),
                              parseInt(0.5 + (bmul - 1) * 2 * qvalue)];
    console.log("scores for stalemate (W, B):", state.stalemate_scores);
    console.log("value adjust multipliers (W, B):", wmul, bmul);
    for (i = 0; i < P4_VALUES.length; i++){
        var v = P4_VALUES[i];
        if (v < P4_WIN){//i.e., not king
            state.values[0][i] = parseInt(v * wmul + 0.5);
            state.values[1][i] = parseInt(v * bmul + 0.5);
        }
        else {
            state.values[0][i] = v;
            state.values[1][i] = v;
        }
    }
    /*used for pruning quiescence search */
    state.best_pieces = [parseInt(best_pieces[0] * wmul + 0.5),
                         parseInt(best_pieces[1] * bmul + 0.5)];
    var wkx = kings[0] % 10;
    var wky  = parseInt(kings[0] / 10);
    var bkx = kings[1] % 10;
    var bky  = parseInt(kings[1] / 10);

    /* find the frontmost pawns in each file */
    var wpawn_cols = [];
    var bpawn_cols = [];
    for (y = 3; y < 9; y++){
        for (x = 1; x < 9; x++){
            i = y * 10 + x;
            var a = board[i];
            if ((a & 14) != P4_PAWN)
                continue;
            if ((a & 1) == 0){
                wpawn_cols[x] = y;
            }
            else if (bpawn_cols[x] === undefined){
                bpawn_cols[x] = y;
            }
        }
    }
    console.log(wpawn_cols, bpawn_cols);
    var target_king = (moveno >= 20 || material_sum < 5 * qvalue);
    var weights = state.weights;
    var wpawn_wt = weights[P4_PAWN];
    var bpawn_wt = weights[P4_PAWN + 1];
    var wrook_wt = weights[P4_ROOK];
    var brook_wt = weights[P4_ROOK + 1];
    var wknight_wt = weights[P4_KNIGHT];
    var bknight_wt = weights[P4_KNIGHT + 1];
    var wbishop_wt = weights[P4_BISHOP];
    var bbishop_wt = weights[P4_BISHOP + 1];
    var wqueen_wt = weights[P4_QUEEN];
    var bqueen_wt = weights[P4_QUEEN + 1];
    var wking_wt = weights[P4_KING];
    var bking_wt = weights[P4_KING + 1];

    for (y = 2; y < 10; y++){
        for (x = 1; x < 9; x++){
            i = y * 10 + x;
            var early_centre = P4_CENTRALISING_WEIGHTS[i] * earliness_weight;
            var plateau = P4_KNIGHT_WEIGHTS[i];
            /* encourage minor pieces off the back row */
            var w_get_out = (early && y == 2) * -4;
            var b_get_out = (early && y == 9) * -4;
            var centre_rooks = (y == 9 || y == 2) * (x == 4 || x == 5) * earliness_weight;

            wknight_wt[i] = parseInt(2 * plateau + early_centre * 0.3) + w_get_out;
            bknight_wt[i] = parseInt(2 * plateau + early_centre * 0.3) + b_get_out;
            wrook_wt[i] =  parseInt(early_centre * 0.3 + centre_rooks);
            brook_wt[i] =  parseInt(early_centre * 0.3 + centre_rooks);
            wbishop_wt[i] = parseInt(early_centre * 0.6 + plateau + w_get_out);
            bbishop_wt[i] = parseInt(early_centre * 0.6 + plateau + b_get_out);
            /*don't encourage the queen to do anything too early, then prefer the centre*/
            var qweight = (early) ? 0 : parseInt(plateau * 0.5 + early_centre * 0.5);
            wqueen_wt[i] = qweight;
            bqueen_wt[i] = qweight;

            /*keep kings back on home row for a while*/
            wking_wt[i] = (king_should_hide && y == 2) * 2 * earliness_weight;
            bking_wt[i] = (king_should_hide && y == 9) * 2 * earliness_weight;

            /* After a while, start going for opposite king. Just
             * attract pieces into the area so they can mill about in
             * the area, waiting for an opportunity.
             *
             * As prepare is only called at the beginning of each tree
             * search, the king could wander out of the targetted area
             * in deep searches. But that's OK. Heuristics are
             * heuristics.
             */
            var wdx = Math.abs(wkx - x);
            var wdy = Math.abs(wky - y);
            var bdx = Math.abs(bkx - x);
            var bdy = Math.abs(bky - y);
            if (target_king){
                var wd = Math.max(Math.sqrt(wdx * wdx + wdy * wdy), 1) + 1;
                var bd = Math.max(Math.sqrt(bdx * bdx + bdy * bdy), 1) + 1;
                /*(wmul < 1) <==> white winning*/
                bknight_wt[i] += 2 * parseInt(8 * wmul / wd);
                wknight_wt[i] += 2 * parseInt(8 * bmul / bd);

                wrook_wt[i] += 3 * ((bdx < 2) + (bdy < 2));
                brook_wt[i] += 3 * ((wdx < 2) + (wdy < 2));

                wbishop_wt[i] += 3 * (Math.abs((bdx - bdy))  < 2);
                bbishop_wt[i] += 3 * (Math.abs((wdx - wdy))  < 2);

                wqueen_wt[i] += 2 * parseInt(8 * bmul / bd) + (bdx * bdy == 0) + (bdx - bdy == 0);
                bqueen_wt[i] += 2 * parseInt(8 * wmul / wd) + (wdx * wdy == 0) + (wdx - wdy == 0);

                /* The losing king wants to stay in the middle, while
                   the winning king goes in for the kill.*/
                var king_centre_wt = 8 * emptiness * P4_CENTRALISING_WEIGHTS[i];
                var wm2 = wmul * wmul * wmul;
                var bm2 = bmul * bmul * bmul;
                bking_wt[i] += parseInt(150 * emptiness * wm2 / wd + bm2 * king_centre_wt);
                wking_wt[i] += parseInt(150 * emptiness * bm2 / bd + wm2 * king_centre_wt);
            }

            /* pawns weighted toward centre at start then forwards only.
             * Early pawn weights are also slightly randomised, so each game is different.
             */
            var wp = 0, bp = 0;
            if (early){
                if (y >= 4 && y <= 7){
                    var boost = 1 + 3 * (y == 5 || y == 6);
                    wp += parseInt((boost + p4_random_int(state, 4)) * 0.1 * early_centre);
                    bp += parseInt((boost + p4_random_int(state, 4)) * 0.1 * early_centre);
                }
                else if (x == 4 || x == 5){
                    bp -= (y == 8) * 2;
                    wp -= (y == 3) * 2;
                }
            }
            /*pawn promotion row is weighted as a queen minus a pawn.*/
            if (y == 9)
                wp += state.values[0][P4_QUEEN] - state.values[0][P4_PAWN];
            if (y == 2)
                bp += state.values[1][P4_QUEEN] - state.values[1][P4_PAWN];
            /*pawns in front of a castled king should stay there*/
            wp += 4 * (y == 3 && wky == 2 && wdx * wdx <= 1 && x != 4 && x != 5);
            bp += 4 * (y == 8 && bky == 9 && bdx * bdx <= 1 && x != 4 && x != 5);
            /*passed pawns (having no opposing pawn in front) are encouraged. */
            if (bpawn_cols[x] === undefined || bpawn_cols[x] < y){
                wp += 2;
            }
            if (wpawn_cols[x] === undefined || wpawn_cols[x] > y){
                bp += 2;
            }
            var get_on_with_it = Math.max(emptiness * 2, 1);
            wpawn_wt[i] = get_on_with_it * P4_BASE_PAWN_WEIGHTS[i] + wp;
            bpawn_wt[i] = get_on_with_it * P4_BASE_PAWN_WEIGHTS[119 - i] + bp;

            if (draw_likely){
                /*The winning side wants to avoid draw, so adds jitter to its weights.*/
                for (j = 2 + (bmul < 1); j < 14; j+= 2){
                    weights[j][i] += p4_random_int(state, 4);
                }
            }
        }
    }
    if (moveno > 10 && moveno < 30){
        /* not early; pry those rooks out of their corners */
        brook_wt[91] -= 7;
        brook_wt[98] -= 7;
        wrook_wt[21] -= 7;
        wrook_wt[28] -= 7;
    }
}



function p4_parse(state, colour, ep, score) {
    var board = state.board;
    var s, e;    //start and end position
    var E=0, a;       //E=piece at end place, a= piece moving
    var i, j;
    var other_colour = 1 - colour;
    var dir = (10 - 20 * colour); //dir= 10 for white, -10 for black
    var k=-1;
    var k2=-1;
    var movelist=[];
    var captures=[];
    var weight;
    var pieces = state.pieces[colour];
    var plen = pieces.length;
    var castle_flags = (state.castles >> (colour * 2)) & 3;
    var values = state.values[other_colour];
    var all_weights = state.weights;
    for (j = 0; j < plen; j++){
        s=pieces[j][1]; // board position
        a=board[s]; //piece number
        /* the pieces list is only a convenient short cut.
         * pieces that have moved/been taken will still be listed at their
         * old place. So check.
         */
        if (pieces[j][0]==a){
            var weight_lut = all_weights[a];
            weight = score - weight_lut[s];
            a &= 14;
            if(a > 2){    //non-pawns
                var moves = P4_MOVES[a];
                if(a & 2){
                    for(i = 0; i < 8; i++){
                        e = s + moves[i];
                        E = board[e];
                        if(!E){
                            movelist[++k]=[weight + values[E] + weight_lut[e], s, e];
                        }
                        else if((E&17)==other_colour){
                            captures[++k2]=[weight + values[E] + weight_lut[e] + all_weights[E][e], s, e];
                        }
                    }
                    if(a == P4_KING && castle_flags){
                        if((castle_flags & 1) &&
                            (board[s-1] + board[s-2] + board[s-3] == 0) &&
                            p4_check_castling(board, s - 2,other_colour,dir,-1)){//Q side
                            movelist[++k]=[weight + 11, s, s - 2];     //no analysis, just encouragement
                        }
                        if((castle_flags & 2) && (board[s+1]+board[s+2] == 0)&&
                            p4_check_castling(board, s, other_colour, dir, 1)){//K side
                            movelist[++k]=[weight + 12, s, s + 2];
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
                            if(!E){
                                movelist[++k]=[weight + values[E] + weight_lut[e], s, e];
                            }
                            else if((E&17)==other_colour){
                                captures[++k2]=[weight + values[E] + weight_lut[e] + all_weights[E][e], s, e];
                            }
                        }while(!E);
                    }
                }
            }
            else{    //pawns
                e=s+dir;
                if(!board[e]){
                    movelist[++k] = [weight + weight_lut[e], s, e];
                    /* s * (120 - s) < 3200 true for outer two rows on either side.*/
                    var e2 = e + dir;
                    if(s * (120 - s) < 3200 && (!board[e2])){
                        movelist[++k] = [weight + weight_lut[e2], s, e2];
                    }
                }
                /* +/-1 for pawn capturing */
                E = board[--e];
                if(E && (E & 17) == other_colour){
                    captures[++k2]=[weight + values[E] + weight_lut[e] + all_weights[E][e], s, e];
                }
                e += 2;
                E = board[e];
                if(E && (E & 17) == other_colour){
                    captures[++k2]=[weight + values[E] + weight_lut[e] + all_weights[E][e], s, e];
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
            taken = values[P4_PAWN] + all_weights[P4_PAWN | other_colour][ep - dir];
            captures[++k2] = [score - weight_lut[s] + weight_lut[ep] + taken, s, ep];
        }
        s += 2;
        if (board[s] == pawn){
            taken = values[P4_PAWN] + all_weights[P4_PAWN | other_colour][ep - dir];
            captures[++k2] = [score - weight_lut[s] + weight_lut[ep] + taken, s, ep];
        }
    }
    return captures.concat(movelist);
}

/*Explaining the bit tricks used in check_castling and check_check:
 *
 * in binary:    16 8 4 2 1
 *   empty
 *   pawn               1 c
 *   rook             1   c
 *   knight           1 1 c
 *   bishop         1     c
 *   king           1   1 c
 *   queen          1 1   c
 *   wall         1
 *
 * so:
 *
 * piece & (16 | 4 | 2 | 1) is:
 *  2 + c  for kings and pawns
 *  4 + c  for rooks and queens
 *  6 + c  for knights
 *  0 + c  for bishops
 * 16      for walls
 *
 * thus:
 * ((piece & 23) == 4 | colour) separates the rooks and queens out
 * from the rest.
 * ((piece & 27) == 8 | colour) does the same for queens and bishops.
 */

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
    var knight = colour + P4_KNIGHT;
    var diag_slider = P4_BISHOP | colour;
    var diag_mask = 27;
    var grid_slider = P4_ROOK | colour;
    var king_pawn = 2 | colour;
    var grid_mask = 23;

    /* go through 3 positions, checking for check in each
     */
    for(p = s; p < s + 3; p++){
        //bishops, rooks, queens
        e = p;
        do{
            e += dir;
            E=board[e];
        } while (! E);
        if((E & grid_mask) == grid_slider)
            return 0;
        e = p;
        var delta = dir - 1;
        do{
            e += delta;
            E=board[e];
        } while (! E);
        if((E & diag_mask) == diag_slider)
            return 0;
        e = p;
        delta += 2;
        do{
            e += delta;
            E=board[e];
        } while (! E);
        if((E & diag_mask) == diag_slider)
            return 0;
        /*knights on row 7. (row 6 is handled below)*/
        if (board[p + dir - 2] == knight ||
            board[p + dir + 2] == knight)
            return 0;
    }

    /* a pawn or king in any of 5 positions on row 7.
     * or a knight on row 6. */
    for(p = s + dir - 1; p < s + dir + 4; p++){
        E = board[p] & grid_mask;
        if(E == king_pawn || board[p + dir] == knight)
            return 0;
    }
    /* scan back row for rooks, queens on the other side.
     * Same side check is impossible, because the castling rook is there
     */
    e = (side < 0) ? s + 2 : s;
    do {
        e -= side;
        E=board[e];
    } while (! E);
    if((E & grid_mask) == grid_slider)
        return 0;

    return 1;
}

function old_check_check(state, colour){
    var a = p4_findmove(state, 0, 1 - colour, 0)[2];
    return (a > P4_WIN_NOW);
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
        if (board[s + knight_moves[i]] == knight ||
            board[s + king_moves[i]] == king)
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
        } while (!E);
        if((E & diag_mask) == diag_slider)
            return true;

        m = grid_moves[i];
        e = s;
        do {
            e += m;
            E = board[e];
        } while (!E);
        if((E & grid_mask) == grid_slider)
            return true;
    }
    return false;
}

function p4_findmove(state, level, colour, ep){
    state.quiesce_counts = [0, 0];
    p4_prepare(state);
    var board = state.board;
    if (arguments.length == 2){
        colour = state.to_play;
        ep = state.enpassant;
    }
    var movelist = p4_parse(state, colour, ep, 0);
    var alpha = P4_MIN_SCORE;
    var mv, t, i;
    var bs = 0;
    var be = 0;
    for(i = 0; i < movelist.length; i++){
        mv = movelist[i];
        var mscore = mv[0];
        var ms = mv[1];
        var me = mv[2];
        if (mscore > P4_WIN){
            console.log("XXX taking king! it should never come to this");
            alpha = P4_KING_VALUE;
            bs = ms;
            be = me;
            break;
        }
        t = -state.treeclimber(state, level - 1, 1 - colour, mscore, ms, me,
                               P4_MIN_SCORE, -alpha);
        if (t > alpha){
            alpha = t;
            bs = ms;
            be = me;
        }
    }
    if (alpha < -P4_WIN_NOW && ! p4_check_check(state, colour)){
        alpha = state.stalemate_scores[colour];
    }
    console.log('quiesce counts', state.quiesce_counts);
    return [bs, be, alpha];
}

/*p4_make_move changes the state and returns an object containing
 * everything necesary to undo the change.
 *
 * p4_unmake_move uses the p4_make_move return value to restore the
 * previous state.
 *
 * These are incorporated inline in p4_treeclimber, for speed and
 * historical reasons.  The alternate treeclimbers in parse-test.js
 * use these functions, as does p4_move() below.
 */

function p4_make_move(state, s, e, promotion){
    var board = state.board;
    var S = board[s];
    var E = board[e];
    board[e] = S;
    board[s] = 0;
    var piece = S & 14;
    var moved_colour = S & 1;
    var piece_locations = state.pieces[moved_colour];
    var end_piece = S; /* can differ from S in queening*/

    //now some stuff to handle queening, castling
    var rs = 0, re, rook;
    var ep_taken = 0, ep_position;
    var ep = 0;
    if(piece == P4_PAWN){
        if((60 - e) * (60 - e) > 900){
            /*got to end; replace the pawn on board and in pieces cache.
             *
             * The only time promotion is *not* undefined is the top level when
             * a human is making a move. */
            if (promotion === undefined)
                promotion = P4_QUEEN;
            promotion |= moved_colour;
            board[e] = promotion;
            end_piece = promotion;
        }
        else if (((s ^ e) & 1) && E == 0){
            /*this is a diagonal move, but the end spot is empty, so we surmise enpassant */
            ep_position = e - 10 + 20 * moved_colour;
            ep_taken = board[ep_position];
            board[ep_position] = 0;
        }
        else if ((s - e) * (s - e) == 400){
            /*delta is 20 --> two row jump at start*/
            ep = (s + e) >> 1;
        }
    }
    else if (piece == P4_KING && ((s - e) * (s - e) == 4)){  //castling - move rook too
        rs = s - 4 + (s < e) * 7;
        re = (s + e) >> 1; //avg of s,e=rook's spot
        rook = moved_colour + P4_ROOK;
        board[rs] = 0;
        board[re] = rook;
        piece_locations.push([rook, re]);
    }

    var old_castle_state = state.castles;
    if (old_castle_state)
        state.castles &= p4_get_castles_mask(s, e, moved_colour);

    if (piece)
        piece_locations.push([end_piece, e]);

    return {
        /*some of these (e.g. rook) could be recalculated during
         * unmake, possibly more cheaply. */
        piece_locations: piece_locations,
        s: s,
        e: e,
        S: S,
        E: E,
        ep: ep,
        castles: old_castle_state,
        rs: rs,
        re: re,
        rook: rook,
        ep_position: ep_position,
        ep_taken: ep_taken
    };
}

function p4_unmake_move(state, move){
    var board = state.board;
    if(move.rs){
        board[move.rs] = move.rook;
        board[move.re] = 0;
        move.piece_locations.length--;
    }
    if (move.ep_position){
        board[move.ep_position] = move.ep_taken;
    }
    board[move.s] = move.S;
    board[move.e] = move.E;
    if (move.S & 15)
        move.piece_locations.length--;
    state.castles = move.castles;
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
var P4_MOVE_FLAG_DRAW = 64;

var P4_MOVE_ILLEGAL = 0;
var P4_MOVE_MISSED_MATE = P4_MOVE_FLAG_CHECK | P4_MOVE_FLAG_MATE;
var P4_MOVE_CHECKMATE = P4_MOVE_FLAG_OK | P4_MOVE_FLAG_CHECK | P4_MOVE_FLAG_MATE;
var P4_MOVE_STALEMATE = P4_MOVE_FLAG_OK | P4_MOVE_FLAG_MATE;

function p4_move(state, s, e, promotion){
    var board = state.board;
    var colour = state.to_play;
    var other_colour = 1 - colour;
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
        return {flags: P4_MOVE_MISSED_MATE, ok: false, string: "checkmate"};
    }

    /*See if this move is even slightly legal, disregarding check.
     *
     * At the same time, gather information to determine whether this
     * move needs qualifying information in the PGN representation.
     * i.e., does 'Nc3' suffice, or is 'Nbc3', 'N1c3', or even 'Nb1c3'
     * necessary?
     */
    var i;
    var legal = false;
    p4_prepare(state);
    var moves = p4_parse(state, colour, state.enpassant, 0);
    for (i = 0; i < moves.length; i++){
        if (e == moves[i][2] && s == moves[i][1]){
            legal = true;
            break;
        }
    }
    if (! legal) {
        return {flags: P4_MOVE_ILLEGAL, ok: false};
    }

    /*Try the move, and see what the response is.*/
    var changes = p4_make_move(state, s, e, promotion);

    /*is it check? */
    if (p4_check_check(state, colour)){
        p4_unmake_move(state, changes);
        console.log('in check', changes);
        return {flags: P4_MOVE_ILLEGAL, ok: false, string: "in check!"};
    }
    /*The move is known to be legal. We won't be undoing it.*/

    var flags = P4_MOVE_FLAG_OK;

    state.enpassant = changes.ep;
    state.history.push([s, e, promotion]);

    /*draw timeout: 50 moves without pawn move or capture is a draw */
    if (changes.E || changes.ep_position){
        state.draw_timeout = 0;
        flags |= P4_MOVE_FLAG_CAPTURE;
    }
    else if (S & 14 == P4_PAWN){
        state.draw_timeout = 0;
    }
    else{
        state.draw_timeout++;
    }
    if (changes.rs){
        flags |= (s > e) ? P4_MOVE_FLAG_CASTLE_QUEEN : P4_MOVE_FLAG_CASTLE_KING;
    }
    var shortfen = p4_state2fen(state, true);
    var repetitions = (state.position_counts[shortfen] || 0) + 1;
    state.position_counts[shortfen] = repetitions;
    state.current_repetitions = repetitions;
    if (state.draw_timeout > 100 || repetitions == 3){
        //XXX also if material drops too low?
        flags |= P4_MOVE_FLAG_DRAW;
    }
    state.moveno++;
    state.to_play = other_colour;

    if (p4_check_check(state, other_colour)){
        flags |= P4_MOVE_FLAG_CHECK;
    }
    /* check for (state|check)mate, by seeing if there is a move for
     * the other side that doesn't result in check. (In other words,
     * reduce the pseudo-legal-move list down to a legal-move list,
     * and check it isn't empty).
     *
     * We don't need to p4_prepare because other colour pieces can't
     * have moved (just disappeared) since previous call. Also,
     * setting the promotion piece is unnecessary, because all
     * promotions block check equally well.
    */
    var is_mate = true;
    var replies = p4_parse(state, other_colour, changes.ep, 0);
    for (i = 0; i < replies.length; i++){
        var m = replies[i];
        var change2 = p4_make_move(state, m[1], m[2]);
        var check = p4_check_check(state, other_colour);
        p4_unmake_move(state, change2);
        if (!check){
            is_mate = false;
            break;
        }
    }
    if (is_mate)
        flags |= P4_MOVE_FLAG_MATE;

    var movestring = p4_move2string(state, s, e, S, promotion, flags, moves);
    console.log(s, e, movestring);
    return {
        flags: flags,
        string: movestring,
        ok: true
    };
}


function p4_move2string(state, s, e, S, promotion, flags, moves){
    var piece = S & 14;
    var FEN_LUT = '  PpRrNnBbKkQq';
    var src, dest;
    var mv, i;
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
    else if (piece == P4_KING && (s-e) * (s-e) == 4) {
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

        /* find any other pseudo-legal moves that would put the same
         * piece in the same place, for which we'd need
         * disambiguation. */
        var co_landers = [];
        for (i = 0; i < moves.length; i++){
            var m = moves[i];
            if (e == m[2] && s != m[1] && state.board[m[1]] == S){
                co_landers.push(m[1]);
            }
        }
        if (co_landers.length){
            for (i = 0; i < co_landers.length; i++){
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
    var y = 90;
    var x = 1;
    var i;
    for (var j = 0; j < fen_board.length; j++){
        var c = fen_board.charAt(j);
        if (c == '/'){
            x = 1;
            y -= 10;
            if (y < 20)
                break;
            continue;
        }
        var piece = P4_PIECE_LUT[c];
        if (piece && x < 9){
            board[y + x] = piece;
            x++;
        }
        else {
            var end = Math.min(x + parseInt(c), 9);
            for (; x < end; x++){
                board[y + x] = 0;
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
    state.position_counts = {};
    return state;
}


var P4__ZEROS = [];
function p4_zero_array(){
    if (P4_USE_TYPED_ARRAYS)
        return new Int32Array(120);
    if (P4_ZEROS.length == 0){
        for(var i = 0; i < 120; i++){
            P4_ZEROS[i] = 0;
        }
    }
    return P4_ZEROS.slice();
}

/* p4_initialise_state() creates the board and initialises weight
 * arrays etc.  Some of this is really only needs to be once.
 */

function p4_initialise_state(){
    var board = p4_zero_array();
    P4_CENTRALISING_WEIGHTS = p4_zero_array();
    P4_BASE_PAWN_WEIGHTS = p4_zero_array();
    P4_KNIGHT_WEIGHTS = p4_zero_array();
    for(var i = 0; i < 120; i++){
        var y = parseInt(i / 10);
        var x = i % 10;
        var dx = Math.abs(x - 4.5);
        var dy = Math.abs(y - 5.5);
        P4_CENTRALISING_WEIGHTS[i] = parseInt(6 - Math.pow((dx * dx + dy * dy) * 1.5, 0.6));
         //knights have a flat topped centre (bishops too, but less so).
        P4_KNIGHT_WEIGHTS[i] = parseInt(((dx < 2) + (dy < 2) * 1.5)
                                        + (dx < 3) + (dy < 3)) - 2;
        P4_BASE_PAWN_WEIGHTS[i] = parseInt('000012347000'.charAt(y));
        if (y > 9 || y < 2 || x < 1 || x > 8)
            board[i] = 16;
    }
    var weights = [];
    for (i = 0; i < 14; i++){
        weights[i] = p4_zero_array();
    }
    var state = {
        board: board,
        weights: weights,
        history: [],
        quiesce_counts: [0, 0],
        treeclimber: p4_alphabeta_treeclimber
    };
    p4_random_seed(state, P4_DEBUG ? 1 : Date.now());
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
    else if (/^[RNBQK]/.test(src)){
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
        var c = str.charAt(i);
        if (/[a-h]/.test(c)){
            column = str.charCodeAt(i) - 96;
        }
        else if (/[1-8]/.test(c)){
            /*row goes 2 - 9 */
            row = 1 + parseInt(c);
        }
    }
    var possibilities = [];
    p4_prepare(state);
    var p = p4_parse(state, colour,
                     state.enpassant, 0);
    for (i = 0; i < p.length; i++){
        var mv = p[i];
        if (e == mv[2]){
            s = mv[1];
            if (state.board[s] == piece &&
                (column === undefined || column == s % 10) &&
                (row === undefined || row == parseInt(s / 10))
               ){
                   var change = p4_make_move(state, mv[1], mv[2]);
                   if (! p4_check_check(state, colour))
                       possibilities.push(s);
                   p4_unmake_move(state, change);
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


/*random number generator based on
 * http://burtleburtle.net/bob/rand/smallprng.html
 */
function p4_random_seed(state, seed){
    seed &= 0xffffffff;
    state.rng = (P4_USE_TYPED_ARRAYS) ? new Uint32Array(4) : [];
    state.rng[0] = 0xf1ea5eed;
    state.rng[1] = seed;
    state.rng[2] = seed;
    state.rng[3] = seed;
    for (var i = 0; i < 20; i++)
        p4_random31(state);
}

function p4_random31(state){
    var rng = state.rng;
    var b = rng[1];
    var c = rng[2];
    /* These shifts amount to rotates.
     * Note the three-fold right shift '>>>', meaning an unsigned shift.
     * The 0xffffffff masks are needed to keep javascript to 32bit. (supposing
     * untyped arrays).
     */
    var e = rng[0] - ((b << 27) | (b >>> 5));
    rng[0] = b ^ ((c << 17) | (c >>> 15));
    rng[1] = (c + rng[3]) & 0xffffffff;
    rng[2] = (rng[3] + e) & 0xffffffff;
    rng[3] = (e + rng[0]) & 0xffffffff;
    return rng[3] & 0x7fffffff;
}

function p4_random_int(state, top){
    /* uniform integer in range [0 < n < top), supposing top < 2 ** 31
     *
     * This method is slightly (probably pointlessly) more accurate
     * than converting to 0-1 float, multiplying and truncating, and
     * considerably more accurate than a simple modulus.
     * Obviously it is a bit slower.
     */
    /* mask becomes one less than the next highest power of 2 */
    var mask = top;
    mask--;
    mask |= mask >>> 1;
    mask |= mask >>> 2;
    mask |= mask >>> 4;
    mask |= mask >>> 8;
    mask |= mask >>> 16;
    var r;
    do{
        r = p4_random31(state) & mask;
    } while (r >= top);
    return r;
}
