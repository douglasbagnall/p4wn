/* p4wn, AKA 5k chess - by Douglas Bagnall <douglas@halo.gen.nz>
 *
 * This code is in the public domain, or as close to it as various
 * laws allow. No warranty; no restrictions.
 *
 * lives at http://p4wn.sf.net/
 */

/*Compatibility tricks for seed or gjs command-line javascript.*/
var p4_log;
if (this.imports !== undefined &&
    this.printerr !== undefined){//seed or gjs
    let _printerr = this.printerr;
    p4_log = function(){
        var args = Array.prototype.slice.call(arguments);
        _printerr(args.join(', '));
    };
}
else {
    p4_log = console.log.bind(console);
}

let _debug;

if (1) {
    _debug = console.log.bind(console);
} else {
    _debug = function(){};
}

/* The pieces are stored as numbers between 2 and 13, inclusive.
 * Empty squares are stored as 0, and off-board squares as 16.
 * There is some bitwise logic to it:
 *  piece & 1 -> colour (white: 0, black: 1)
 *  piece & 2 -> single move piece (including pawn)
 *  if (piece & 2) == 0:
 *     piece & 4  -> row and column moves
 *     piece & 8  -> diagonal moves
 */
const P4_PAWN = 2, P4_ROOK = 4, P4_KNIGHT = 6, P4_BISHOP = 8, P4_QUEEN = 12, P4_KING = 10;
const P4_EDGE = 16;

/* in order, even indices: <nothing>, pawn, rook, knight, bishop, king, queen. Only the
 * even indices are used.*/
const P4_MOVES = [
    [], [],
    [], [],
    [1,10,-1,-10], [],
    [21,19,12,8,-21,-19,-12,-8], [],
    [11,9,-11,-9], [],
    [1,10,11,9,-1,-10,-11,-9], [],
    [1,10,11,9,-1,-10,-11,-9], []
];

/*P4_VALUES defines the relative value of various pieces.
 *
 * It follows the 1,3,3,5,9 pattern you learn as a kid, multiplied by
 * 20 to give sub-pawn resolution to other factors, with bishops given
 * a wee boost over knights.
 */
var P4_VALUES=[
    0, 0,      //Piece values
    20, 20,    //pawns
    100, 100,  //rooks
    60, 60,    //knights
    61, 61,    //bishops
    8000, 8000,//kings
    180, 180,  //queens
    0];

/* A score greater than P4_WIN indicates a king has been taken. It is
 * less than the value of a king, in case someone finds a way to, say,
 * sacrifice two queens in order to checkmate.
 */
const P4_KING_VALUE = P4_VALUES[10];
const P4_WIN = P4_KING_VALUE >> 1;

/* every move, a winning score decreases by this much */
const P4_WIN_DECAY = 300;
const P4_WIN_NOW = P4_KING_VALUE - 250;

/* P4_{MAX,MIN}_SCORE should be beyond any possible evaluated score */

const P4_MAX_SCORE = 9999;    // extremes of evaluation range
const P4_MIN_SCORE = -P4_MAX_SCORE;

/*initialised in p4_initialise_state */
var P4_CENTRALISING_WEIGHTS;
var P4_BASE_PAWN_WEIGHTS;
var P4_KNIGHT_WEIGHTS;

/*P4_DEBUG turns on debugging features */
var P4_DEBUG = 0;
const P4_INITIAL_BOARD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1";

const P4_PIECE_LUT = { /*for FEN, PGN interpretation */
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

let P4_ENCODE_LUT = '  PPRRNNBBKKQQ';

const P4_PIECE_DBG = [
    0, 0,
    '♙', '♟',
    '♖', '♜',
    '♘', '♞',
    '♗', '♝',
    '♕', '♛',
    '♔', '♚'
];

function p4_alphabeta_treeclimber(state, count, colour, score, s, e, alpha, beta){
    const move = p4_make_move_fast(state, s, e, P4_QUEEN);
    const ncolour = 1 - colour;
    const movelist = state.movelists[count];
    let movecount = p4_parse(state, colour, state.enpassant, -score, movelist);
    if (count) {
        //branch nodes
        for(let i = 0; i < movecount; i++) {
            let mv = movelist[i];
            let ms = mv & 127;
            let me = (mv >>> 7) & 127;
            let mscore = mv >> 14;
            if (mscore > P4_WIN) { //we won! Don't look further.
                alpha = P4_KING_VALUE;
                break;
            }
            let t = -p4_alphabeta_treeclimber(state, count - 1,
                                              ncolour, mscore,
                                              ms, me,
                                              -beta, -alpha);
            if (t > alpha){
                alpha = t;
            }
            if (alpha >= beta) {
                break;
            }
        }
        if (alpha < -P4_WIN_NOW && ! p4_check_check(state, colour)){
            /* Whatever we do, we lose the king.
             * But if it is not check then this is stalemate, and the
             * score doesn't apply.
             */
            alpha = state.stalemate_scores[colour];
        }
        if (alpha < -P4_WIN){
            /*make distant checkmate seem less bad */
            alpha += P4_WIN_DECAY;
        }
    }
    else{
        //leaf nodes
        while(beta > alpha && --movecount != -1){
            if(movelist[movecount] >> 14 > alpha) {
                alpha = movelist[movecount] >> 14;
            }
        }
    }
    p4_unmake_move_fast(state, move);
    return alpha;
}


/* p4_prepare() works out weightings for assessing various moves,
 * favouring centralising moves early, for example.
 *
 * It is called before each tree search, not for each parse(), so it
 * is OK for it to be a little bit slow. But that also means it drifts
 * out of sync with the real board state, especially on deep searches.
 */

function p4_prepare(state) {
    let pieces = state.pieces;
    /*convert state.moveno half move count to move cycle count */
    const moveno = state.moveno >> 1;
    let board = state.board;

    /* high earliness_weight indicates a low move number. The formula
     * should work above moveno == 50, but this is javascript.
     */
    const earliness_weight = (moveno > 50) ? 0 : parseInt(6 * Math.exp(moveno * -0.07));
    const king_should_hide = moveno < 12;
    const early = moveno < 5;
    /* find the pieces, kings, and weigh material*/
    let kings = [0, 0];
    let material = [0, 0];
    let n_pieces = [0, 0];
    for(let i = 20; i  < 100; i++){
        const a = board[i];
        const piece = a & 14;
        const colour = a & 1;
        if(piece){
            let j = n_pieces[colour];
            n_pieces[colour]++;
            pieces[colour][j] = i;
            if (piece == P4_KING) {
                kings[colour] = i;
            }
            else{
                material[colour] += P4_VALUES[piece];
            }
        }
    }
    pieces[0][n_pieces[0]] = 0;
    pieces[1][n_pieces[1]] = 0;

    /*does a draw seem likely soon?*/
    const draw_likely = (state.draw_timeout > 90 || state.current_repetitions >= 2);
    if (draw_likely) {
        p4_log("draw likely", state.current_repetitions, state.draw_timeout);
    }
    state.values = [[], []];
    const qvalue = P4_VALUES[P4_QUEEN]; /*used as ballast in various ratios*/
    const material_sum = material[0] + material[1] + 2 * qvalue;
    const wmul = 2 * (material[1] + qvalue) / material_sum;
    const bmul = 2 * (material[0] + qvalue) / material_sum;
    const multipliers = [wmul, bmul];
    const emptiness = 4 * P4_QUEEN / material_sum;
    state.stalemate_scores = [parseInt(0.5 + (wmul - 1) * 2 * qvalue),
                              parseInt(0.5 + (bmul - 1) * 2 * qvalue)];
    for (let i = 0; i < P4_VALUES.length; i++){
        const v = P4_VALUES[i];
        if (v < P4_WIN){//i.e., not king
            state.values[0][i] = parseInt(v * wmul + 0.5);
            state.values[1][i] = parseInt(v * bmul + 0.5);
        }
        else {
            state.values[0][i] = v;
            state.values[1][i] = v;
        }
    }

    const kx = [kings[0] % 10, kings[1] % 10];
    const ky = [parseInt(kings[0] / 10), parseInt(kings[1] / 10)];

    /* find the frontmost pawns in each file */
    let pawn_cols = [[], []];
    for (let y = 3; y < 9; y++){
        for (let x = 1; x < 9; x++) {
            let i = y * 10 + x;
            let a = board[i];
            if ((a & 14) != P4_PAWN) {
                continue;
            }
            if ((a & 1) == 0) {
                pawn_cols[0][x] = y;
            }
            else if (pawn_cols[1][x] === undefined) {
                pawn_cols[1][x] = y;
            }
        }
    }
    const target_king = (moveno >= 20 || material_sum < 5 * qvalue);
    const weights = state.weights;

    for (let y = 2; y < 10; y++){
        for (let x = 1; x < 9; x++){
            let i = y * 10 + x;
            const early_centre = P4_CENTRALISING_WEIGHTS[i] * earliness_weight;
            const plateau = P4_KNIGHT_WEIGHTS[i];
            for (let c = 0; c < 2; c++) {
                let dx = Math.abs(kx[1 - c] - x);
                let dy = Math.abs(ky[1 - c] - y);
                let our_dx = Math.abs(kx[c] - x);

                let d = Math.max(Math.sqrt(dx * dx + dy * dy), 1) + 1;
                let mul = multipliers[c]; /*(mul < 1) <==> we're winning*/
                let mul3 = mul * mul * mul;
                let at_home = y == 2 + c * 7;
                let pawn_home = y == 3 + c * 5;
                let row4 = y == 5 + c;
                let promotion_row = y == 9 - c * 7;
                let get_out = (early && at_home) * -5;

                let knight = parseInt(early_centre * 0.3) + 2 * plateau + get_out;
                let rook = parseInt(early_centre * 0.3);
                let bishop = parseInt(early_centre * 0.6) + plateau + get_out;
                if (at_home){
                    rook += (x == 4 || x == 5) * (earliness_weight + ! target_king);
                    rook += (x == 1 || x == 8) * (moveno > 10 && moveno < 20) * -3;
                    rook += (x == 2 || x == 7) * (moveno > 10 && moveno < 20) * -1;
                }

                /*Queen wants to stay home early, then jump right in*/
                /*keep kings back on home row for a while*/
                let queen = parseInt(plateau * 0.5 + early_centre * (0.5 - early));
                let king = (king_should_hide && at_home) * 2 * earliness_weight;

                /*empty board means pawn advancement is more urgent*/
                let get_on_with_it = Math.max(emptiness * 2, 1);
                let pawn = get_on_with_it * P4_BASE_PAWN_WEIGHTS[c ? 119 - i : i];
                if (early){
                    /* Early pawn weights are slightly randomised, so each game is different.
                     */
                    if (y >= 4 && y <= 7){
                        let boost = 1 + 3 * (y == 5 || y == 6);
                        pawn += parseInt((boost + p4_random_int(state, 4)) * 0.1 *
                                         early_centre);
                    }
                    if (x == 4 || x == 5){
                        //discourage middle pawns from waiting at home
                        pawn -= 3 * pawn_home;
                        pawn += 3 * row4;
                    }
                }
                /*pawn promotion row is weighted as a queen minus a pawn.*/
                if (promotion_row) {
                    pawn += state.values[c][P4_QUEEN] - state.values[c][P4_PAWN];
                }
                /*pawns in front of a castled king should stay there*/
                pawn += 4 * (y == 3 && ky[c] == 2 && Math.abs(our_dx) < 2 &&
                             kx[c] != 5 && x != 4 && x != 5);
                /*passed pawns (having no opposing pawn in front) are encouraged. */
                let cols = pawn_cols[1 - c];
                if (cols[x] == undefined ||
                    (c == 0 && cols[x] < y) ||
                    (c == 1 && cols[x] > y))
                    pawn += 2;

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
                    knight += 2 * parseInt(8 * mul / d);
                    rook += 2 * ((dx < 2) + (dy < 2));
                    bishop += 3 * (Math.abs((dx - dy))  < 2);
                    queen += 2 * parseInt(8 / d) + (dx * dy == 0) + (dx - dy == 0);
                    /* The losing king wants to stay in the middle, while
                     the winning king goes in for the kill.*/
                    let king_centre_wt = 8 * emptiness * P4_CENTRALISING_WEIGHTS[i];
                    king += parseInt(150 * emptiness / (mul3 * d) + king_centre_wt * mul3);
                }
                weights[P4_PAWN + c][i] = pawn;
                weights[P4_KNIGHT + c][i] = knight;
                weights[P4_ROOK + c][i] = rook;
                weights[P4_BISHOP + c][i] = bishop;
                weights[P4_QUEEN + c][i] = queen;
                weights[P4_KING + c][i] = king;

                if (draw_likely && mul < 1){
                    /*The winning side wants to avoid draw, so adds jitter to its weights.*/
                    let range = 3 / mul3;
                    for (let j = 2 + c; j < 14; j += 2){
                        weights[j][i] += p4_random_int(state, range);
                    }
                }
            }
        }
    }
    state.prepared = true;
}

function p4_maybe_prepare(state){
    if (! state.prepared)
        p4_prepare(state);
}

function p4_move_pack(s, e, score) {
    let mv = s | (e << 7) | (score << 14);
    return mv;
}
function p4_move_unpack(mv) {
    let s = mv & 127;
    let e = (mv >>> 7) & 127;
    let score = mv >> 14;
    return [score, s, e];
}


/*
   get a fresh list of moves (non-performance-critical).
*/
function p4_movelist(state, colour, ep, score) {
    let moves = new Int32Array(220);
    colour = colour || state.to_play;
    ep = ep || state.enpassant;
    score = score || 0;
    if (colour === undefined) {
        colour = state.to_play;
        ep = state.enpassant;
    }
    let n_moves = p4_parse(state, colour, ep, -score, moves);
    let movelist = [];
    for (let i = 0; i < n_moves; i++){
        movelist.push(p4_move_unpack(moves[i]));
    }
    return movelist;
}


function p4_parse(state, colour, ep, score, movelist) {
    let board = state.board;
    let s, e;    //start and end position
    let E, a;       //E=piece at end place, a= piece moving
    const other_colour = 1 - colour;
    const dir = (10 - 20 * colour); //dir= 10 for white, -10 for black
    let mi = 0;
    let ci = 0;
    let pieces = state.pieces[colour];
    const castle_flags = (state.castles >> (colour * 2)) & 3;
    let values = state.values[other_colour];
    let all_weights = state.weights;
    //console.log(pieces);
    for (let j = 0; pieces[j]; j++) {
        s = pieces[j]; // board position
        if (s == 1) {
            /* the piece is gone */
            continue;
        }
        a = board[s]; //piece number
        //console.log(j, s, a);
        const weight_lut = all_weights[a];
        const weight = score - weight_lut[s];
        a &= 14;
        if(a > 2) {    //non-pawns
            const moves = P4_MOVES[a];
            if(a & 2) { /* knight, king; one-steppers */
                for(let i = 0; i < 8; i++){
                    e = s + moves[i];
                    E = board[e];
                    if(!E) {
                        let mvscore = weight + weight_lut[e];
                        movelist[mi] = (s | (e << 7) | (mvscore << 14));
                        mi++;
                    }
                    else if((E&17)==other_colour) {
                        let mvscore = weight + values[E] + weight_lut[e] + all_weights[E][e];
                        movelist[mi] = movelist[ci];
                        movelist[ci] = (s | (e << 7) | (mvscore << 14));
                        mi++;
                        ci++;
                    }
                }
                if (a == P4_KING && castle_flags){
                    if((castle_flags & 1) &&
                        (board[s - 1] + board[s - 2] + board[s - 3] == 0) &&
                       p4_check_castling(board, s - 2, other_colour, dir, -1)){//Q side
                        let mvscore = weight + 12;     //no analysis, just encouragement
                        let e = s - 2;
                        movelist[mi] = (s | (e << 7) | (mvscore << 14));
                        mi++;
                    }
                    if((castle_flags & 2) && (board[s + 1] + board[s + 2] == 0) &&
                        p4_check_castling(board, s, other_colour, dir, 1)){//K side
                        let mvscore = weight + 13;     //no analysis, just encouragement
                        let e = s + 2;
                        movelist[mi] = (s | (e << 7) | (mvscore << 14));
                        mi++;
                    }
                }
            }
            else{//rook, bishop, queen
                const mlen = moves.length;
                for(let i = 0; i < mlen; i++){     //goeth thru list of moves
                    const m = moves[i];
                    e = s;
                    do {
                        e += m;
                        E=board[e];
                        if(!E){
                            let mvscore = weight + weight_lut[e];
                            movelist[mi] = (s | (e << 7) | (mvscore << 14));
                            mi++;
                        }
                        else if((E&17)==other_colour){
                            let mvscore = weight + values[E] + weight_lut[e] + all_weights[E][e];
                            movelist[mi] = movelist[ci];
                            movelist[ci] = (s | (e << 7) | (mvscore << 14));
                            mi++;
                            ci++;
                        }
                    }while(!E);
                }
            }
        }
        else {    //pawns
            e = s + dir;
            if (!board[e]){
                movelist[mi] = (s | (e << 7) | ((weight + weight_lut[e]) << 14));
                mi++;
                /* s * (120 - s) < 3200 true for outer two rows on either side.*/
                const e2 = e + dir;
                if(s * (120 - s) < 3200 && (!board[e2])) {
                    let mvscore = weight + weight_lut[e2];
                    movelist[mi] = (s | (e2 << 7) | (mvscore << 14));
                    mi++;
                }
            }
            /* +/-1 for pawn capturing */
            E = board[--e];
            if (E && (E & 17) == other_colour) {
                let mvscore = weight + values[E] + weight_lut[e] + all_weights[E][e];
                movelist[mi] = movelist[ci];
                movelist[ci] = (s | (e << 7) | (mvscore << 14));
                mi++;
                ci++;
            }
            e += 2;
            E = board[e];
            if(E && (E & 17) == other_colour){
                let mvscore = weight + values[E] + weight_lut[e] + all_weights[E][e];
                movelist[mi] = movelist[ci];
                movelist[ci] = (s | (e << 7) | (mvscore << 14));
                mi++;
                ci++;
            }
        }
    }
    if (ep){
        const pawn = P4_PAWN | colour;
        const weight_lut = all_weights[pawn];
        /* ep is just the column number (1-8), so we add the relevant row. */
        ep += 70 - 30 * colour;
        /* Some repetitive calculation here could be hoisted out, but that would
           probably slow things: the common case is no pawns waiting to capture
           enpassant, not 2.
        */
        s = ep - dir - 1;
        if (board[s] == pawn){
            let taken = values[P4_PAWN] + all_weights[P4_PAWN | other_colour][ep - dir];
            let mvscore = score - weight_lut[s] + weight_lut[ep] + taken;
            movelist[mi] = movelist[ci];
            movelist[ci] = (s | (ep << 7) | (mvscore << 14));
            mi++;
            ci++;
        }
        s += 2;
        if (board[s] == pawn){
            let taken = values[P4_PAWN] + all_weights[P4_PAWN | other_colour][ep - dir];
            let mvscore = score - weight_lut[s] + weight_lut[ep] + taken;
            movelist[mi] = movelist[ci];
            movelist[ci] = (s | (ep << 7) | (mvscore << 14));
            mi++;
            ci++;
        }
    }
    return mi;
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
    let e, E, p;
    const knight = colour + P4_KNIGHT;
    const diag_slider = P4_BISHOP | colour;
    const diag_mask = 27;
    const grid_slider = P4_ROOK | colour;
    const king_pawn = 2 | colour;
    const grid_mask = 23;

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
        let delta = dir - 1;
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
    for (p = s + dir - 1; p < s + dir + 4; p++){
        E = board[p] & grid_mask;
        if (E == king_pawn || board[p + dir] == knight) {
            return 0;
        }
    }
    /* scan back row for rooks, queens on the other side.
     * Same side check is impossible, because the castling rook is there
     */
    e = (side < 0) ? s + 2 : s;
    do {
        e -= side;
        E=board[e];
    } while (! E);
    if((E & grid_mask) == grid_slider) {
        return 0;
    }
    return 1;
}

function p4_check_check(state, colour){
    const board = state.board;
    /* find the king. */
    const pieces = state.pieces[colour];
    let i;
    for (i = 0; board[pieces[i]] != (P4_KING | colour); i++);
    const s = pieces[i];
    const other_colour = 1 - colour;
    const dir = 10 - 20 * colour;
    if (board[s + dir - 1] == (P4_PAWN | other_colour) ||
        board[s + dir + 1] == (P4_PAWN | other_colour))
        return true;
    const knight_moves = P4_MOVES[P4_KNIGHT];
    const king_moves = P4_MOVES[P4_KING];
    const knight = P4_KNIGHT | other_colour;
    const king = P4_KING | other_colour;
    for (i = 0; i < 8; i++) {
        if (board[s + knight_moves[i]] == knight ||
            board[s + king_moves[i]] == king)
            return true;
    }
    const diagonal_moves = P4_MOVES[P4_BISHOP];
    const grid_moves = P4_MOVES[P4_ROOK];

    /* diag_mask ignores rook moves of queens,
     * grid_mask ignores the bishop moves*/
    const diag_slider = P4_BISHOP | other_colour;
    const diag_mask = 27;
    const grid_slider = P4_ROOK | other_colour;
    const grid_mask = 23;
    for (i = 0; i < 4; i++){
        let m = diagonal_moves[i];
        let e = s;
        let E;
        do {
            e += m;
            E = board[e];
        } while (!E);
        if((E & diag_mask) == diag_slider) {
            return true;
        }
        m = grid_moves[i];
        e = s;
        do {
            e += m;
            E = board[e];
        } while (!E);
        if((E & grid_mask) == grid_slider) {
            return true;
        }
    }
    return false;
}

function p4_optimise_piece_list(state){
    const movelists = [
        new Int32Array(250),
        new Int32Array(250)
    ];
    const movecounts = [
        p4_parse(state, 0, 0, 0, movelists[0]),
        p4_parse(state, 1, 0, 0, movelists[1])
    ];
    const board = state.board;
    for (let colour = 0; colour < 2; colour++){
        const our_values = state.values[colour];
        let pieces = state.pieces[colour];
        const movelist = movelists[colour];
        const threats = movelists[1 - colour];
        const n_moves = movecounts[colour];
        const n_threats = movecounts[1 - colour];
        /* sparse array to index by score. */
        let scores = [];
        for (let i = 0; i < pieces.length; i++) {
            let p = pieces[i];
            scores[p[1]] = {
                score: 0,
                piece: p[0],
                pos: p[1],
                threatened: 0
            };
        }
        /* Find the best score for each piece by pure static weights,
         * ignoring captures, which have their own path to the top. */
        for(let i = n_moves - 1; i >= 0; i--) {
            let mv = movelist[i];
            let e = (mv >>> 7) & 127;
            if(! board[e]) {
                let s = mv & 127;
                let score = mv >> 14;
                let x = scores[s];
                //console.log(x, s, score, i, movelist.length, movelist);
                x.score = Math.max(x.score, score);
            }
        }
        /* moving out of a threat is worth considering, especially
         * if it is a pawn and you are not.*/
        for (let i = n_threats - 1; i >= 0; i--) {
            let mv = threats[i];
            let score = mv >> 14;
            let e = (mv >>> 7) & 127;
            let s = mv & 127;
            let x = scores[e];
            if (x !== undefined) {
                let S = board[s];
                let r = (1 + x.piece > 3 + S < 4) * 0.01;
                if (x.threatened < r) {
                    x.threatened = r;
                }
            }
        }
        let pieces2 = [];
        for (let i = 20; i < 100; i++) {
            let p = scores[i];
            if (p !== undefined) {
                p.score += p.threatened * our_values[p.piece];
                pieces2.push(p);
            }
        }
        pieces2.sort(function(a, b){return a.score - b.score;});
        for (let i = 0; i < pieces2.length; i++){
            let p = pieces2[i];
            pieces[i] = [p.piece, p.pos];
        }
    }
}

function p4_findmove(state, level){
    p4_prepare(state);
    //p4_optimise_piece_list(state);
    let board = state.board;
    let colour = state.to_play;
    let moves = p4_movelist(state);
    let alpha = P4_MIN_SCORE;
    let bs = 0;
    let be = 0;

    if (level <= 0) {
        for (let i = 0; i < moves.length; i++) {
            let mv = moves[i];
            if (mv[0] > alpha) {
                alpha = mv[0];
                bs = mv[1];
                be = mv[2];
            }
        }
        return [bs, be, alpha];
    }

    for (let i = 0; i < moves.length; i++) {
        let mv = moves[i];
        let mscore = mv[0];
        let ms = mv[1];
        let me = mv[2];
        if (mscore > P4_WIN) {
            p4_log("XXX taking king! it should never come to this");
            alpha = P4_KING_VALUE;
            bs = ms;
            be = me;
            break;
        }
        let t = -state.treeclimber(state, level - 1, 1 - colour, mscore, ms, me,
                                   P4_MIN_SCORE, -alpha);
        if (t > alpha) {
            alpha = t;
            bs = ms;
            be = me;
        }
    }
    if (alpha < -P4_WIN_NOW && ! p4_check_check(state, colour)){
        alpha = state.stalemate_scores[colour];
    }
    return [bs, be, alpha];
}

/*p4_make_move_fast changes the state and returns an integer
 * representing everything necessary to parse the new state and undo
 * the change.
 *
 * p4_unmake_move_fast uses the p4_make_move_fast return value to
 * *almost* restore the previous state. It doesn't need to be exact,
 * because by this point we have already decided which moves are
 * possible, so the en passant status doesn't need to be restored.
 *
 * XXX why do we even change the global state? the chnages only need
 * to be propagated forwards.
 */
    /* changes format
       to be encoded
        * start          7 bits
        * end            7
        * taken piece    4 (3 is sufficient, dropping colour)
        * en passant     4
        * old en passant 4
        * queening       1
        *
        * castle         4 -- both sides

      Castling is implicit in the Kings move.

         4   |  4   |   4   | 1 | 1 |    4  |    7  |   7   |
    taken idx|castle| taken | q |ep | old ep| end   | start |
       28-31 | 24-27| 20-23 |19 |18 | 14-17 | 7-13  |  0-6  |
    */

/* new ep: en-passant is available in the given column */
const P4_MM_SHIFT_OLD_EP = 14;
/* old ep: the pawn move was en-passant, undo restores the taken pawn */
const P4_MM_UNDO_FLAG_EP = 1 << 18;
/* UNDO_FLAG_Q: the move was a queening move; undo turn the piece into a pawn */
const P4_MM_UNDO_FLAG_Q = 1 << 19;
/* undo taken: the piece that was captured */
const P4_MM_UNDO_SHIFT_TAKEN = 20;
/* castle state changes */
const P4_MM_UNDO_SHIFT_CASTLE = 24;
/* where to find the taken piece in piecelist */
const P4_MM_UNDO_SHIFT_TAKEN_IDX = 28;


function p4_make_move_fast(state, s, e, promotion) {
    let board = state.board;
    const S = board[s];
    const E = board[e];
    board[e] = S;
    board[s] = 0;
    const piece = S & 14;
    const moved_colour = S & 1;
    //now some stuff to handle queening, castling
    let i;
    let rs = 0, re, rook;
    let ep_taken = 0, ep_position;
    let our_pieces = state.pieces[moved_colour];
    let change = s | (e << 7) | (state.enpassant << P4_MM_SHIFT_OLD_EP);
    state.enpassant = 0;

    for (i = 0; our_pieces[i]; i++) {
        if (our_pieces[i] === s) {
            /* this piece has moved! */
            our_pieces[i] = e;
            break;
        }
    }

    if(piece === P4_PAWN) {
        if((60 - e) * (60 - e) > 900) {
            /* Got to end; replace the pawn on board and in pieces cache. */
            promotion |= moved_colour;
            board[e] = promotion;
            change |= P4_MM_UNDO_FLAG_Q;
        }
        else if (((s ^ e) & 1) && E === 0) {
            /* This is a diagonal move, but the end spot is empty, so
             * we surmise enpassant. We only need one bit for the
             * undo, because the captured piece must be a pawn in the
             * particular spot. */
            ep_position = e - 10 + 20 * moved_colour;
            ep_taken = board[ep_position];
            board[ep_position] = 0;
            change |= P4_MM_UNDO_FLAG_EP;
        }
        else if ((s - e) * (s - e) === 400) {
            /* delta is 20 --> two row jump at start. We need to
             * record that en-passant is available, which needs 4
             * bits. */
            let side = 40 + (s > e) * 30;
            state.enpassant = ((s + e) >> 1) - side;
        }
    }
    else if (piece === P4_KING && ((s - e) * (s - e) === 4)){
        /* Castling. the rook needs to move too, but we don't need to
         * flag the change for undo because it is implicit in the size
         * of the move. */
        rs = s - 4 + (s < e) * 7;
        re = (s + e) >> 1; //avg of s,e=rook's spot
        rook = moved_colour + P4_ROOK;
        board[rs] = 0;
        board[re] = rook;
        for (let i = 0; our_pieces[i]; i++){
            if (our_pieces[i] === rs) {
                /* this piece has moved! */
                our_pieces[i] = re;
                break;
            }
        }
    }

    if (state.castles !== 0) {
        let mask = 0;
        let shift = moved_colour * 2;
        let side = moved_colour * 70;
        let s2 = s - side;
        let e2 = e + side;
        //wipe both our sides if king moves
        if (s2 === 25)
            mask |= 3 << shift;
        //wipe one side on any move from rook points
        else if (s2 === 21)
            mask |= 1 << shift;
        else if (s2 === 28)
            mask |= 2 << shift;
        //or on any move *to* opposition corners
        if (e2 === 91)
            mask |= 4 >> shift;
        else if (e2 === 98)
            mask |= 8 >> shift;
        change |= state.castles << P4_MM_UNDO_SHIFT_CASTLE;
        state.castles &= ~mask;
    }

    if (E || ep_taken) {
        let their_pieces = state.pieces[1 - moved_colour];
        let gone = ep_taken ? ep_position : e;
        /* this is ignored in ep case */
        change |= E << P4_MM_UNDO_SHIFT_TAKEN;
        for (i = 0; their_pieces[i]; i++) {
            if (their_pieces[i] === gone) {
                their_pieces[i] = 1; /* an off the board placeholder value */
                change |= (i > 15 ? 15 : i) << P4_MM_UNDO_SHIFT_TAKEN_IDX;
                break;
            }
        }
    }

    return change;
}

function p4_unmake_move_fast(state, move) {
    let board = state.board;
    let s = move & 127;
    let e = (move >> 7) & 127;
    let E = board[e];
    const piece = E & 14;
    const moved_colour = E & 1;
    let our_pieces = state.pieces[moved_colour];

    let ep_used = move & P4_MM_UNDO_FLAG_EP;
    let unqueening = move & P4_MM_UNDO_FLAG_Q;
    let taken = (move >> P4_MM_UNDO_SHIFT_TAKEN) & 15;
    let taken_pos;

    if (ep_used) {
        let ep_position = e - 10 + 20 * moved_colour;
        taken = P4_PAWN | (1 - moved_colour);
        board[ep_position] = taken;
        board[e] = 0;
        taken_pos = ep_position;
    }
    else {
        board[e] = taken;
        taken_pos = e;
    }
    if (taken) {
        let their_pieces = state.pieces[1 - moved_colour];
        /* in a real game, <i> will immediately point to the taken
         * pieces spot, but in an overcrowded game we need to scan. */
        let i = (move >>> P4_MM_UNDO_SHIFT_TAKEN_IDX & 15);
        for (; their_pieces[i]; i++) {
            if (their_pieces[i] === 1) {
                their_pieces[i] = taken_pos;
                break;
            }
        }
    }

    if (piece === P4_KING && ((s - e) * (s - e) === 4)) {
        let rs = s - 4 + (s < e) * 7;
        let re = (s + e) >> 1;
        board[rs] = board[re];
        board[re] = 0;
        for (let i = 0; our_pieces[i]; i++) {
            if (our_pieces[i] === re) {
                our_pieces[i] = rs;
                break;
            }
        }
    }

    if (unqueening) {
        board[s] = P4_PAWN | moved_colour;
    }
    else {
        board[s] = E;
    }
    state.castles = (move >>> P4_MM_UNDO_SHIFT_CASTLE) & 15;
    state.enpassant = (move >>> P4_MM_SHIFT_OLD_EP) & 15;

    for (let i = 0; our_pieces[i]; i++){
        if (our_pieces[i] === e) {
            our_pieces[i] = s;
            break;
        }
    }
}

/* p4_make_move wraps p4_make_move_fast for callers who need easy
 * access to state change information more than they need super fast
 * operations. That is, for everything but search. */

function p4_make_move(state, s, e, promotion) {
    var board = state.board;
    let S = board[s];
    let E = board[e];
    let move = p4_make_move_fast(state, s, e, promotion);
    let piece = S & 14;
    let castled = (piece === P4_KING && ((s - e) * (s - e) === 4));
    let ep_used = (move & P4_MM_UNDO_FLAG_EP);
    let taken = (move >> P4_MM_UNDO_SHIFT_TAKEN) & 15;
    return {
        packed: move,
        s: s,
        e: e,
        S: S,
        E: E,
        castled: castled,
        capture: taken || ep_used
    };
}


function p4_unmake_move(state, move) {
    p4_unmake_move_fast(state, move.packed);
}


function p4_insufficient_material(state){
    let knights = false;
    let bishops = undefined;
    let board = state.board;
    for(let i = 20; i  < 100; i++){
        const piece = board[i] & 14;
        if(piece == 0 || piece == P4_KING){
            continue;
        }
        if (piece == P4_KNIGHT){
            /* only allow one knight of either colour, never with a bishop */
            if (knights || bishops !== undefined){
                return false;
            }
            knights = true;
        }
        else if (piece == P4_BISHOP){
            /*any number of bishops, but on only one colour square */
            const x = i & 1;
            const y = parseInt(i / 10) & 1;
            const parity = x ^ y;
            if (knights){
                return false;
            }
            else if (bishops === undefined){
                bishops = parity;
            }
            else if (bishops != parity){
                return false;
            }
        }
        else {
             return false;
        }
    }
    return true;
}

/* p4_move(state, s, e, promotion)
 * s, e are start and end positions
 *
 * promotion is the desired pawn promotion if the move gets a pawn to the other
 * end.
 *
 * return value contains bitwise flags
*/

const P4_MOVE_FLAG_OK = 1;
const P4_MOVE_FLAG_CHECK = 2;
const P4_MOVE_FLAG_MATE = 4;
const P4_MOVE_FLAG_CAPTURE = 8;
const P4_MOVE_FLAG_CASTLE_KING = 16;
const P4_MOVE_FLAG_CASTLE_QUEEN = 32;
const P4_MOVE_FLAG_DRAW = 64;

const P4_MOVE_ILLEGAL = 0;
const P4_MOVE_MISSED_MATE = P4_MOVE_FLAG_CHECK | P4_MOVE_FLAG_MATE;
const P4_MOVE_CHECKMATE = P4_MOVE_FLAG_OK | P4_MOVE_FLAG_CHECK | P4_MOVE_FLAG_MATE;
const P4_MOVE_STALEMATE = P4_MOVE_FLAG_OK | P4_MOVE_FLAG_MATE;

function p4_move(state, s, e, promotion){
    let board = state.board;
    const colour = state.to_play;
    const other_colour = 1 - colour;
    if (s != parseInt(s)) {
        if (e === undefined) {
            [s, e, promotion] = p4_interpret_movestring(state, s);
            if (s == 0) {
                return {flags: P4_MOVE_ILLEGAL, ok: false};
            }
        }
        else {/*assume two point strings: 'e2', 'e4'*/
            s = p4_destringify_point(s);
            e = p4_destringify_point(e);
        }
    }
    if (promotion === undefined) {
        promotion = P4_QUEEN;
    }
    const S = board[s];

    /*See if this move is even slightly legal, disregarding check.
     */
    let legal = false;
    p4_maybe_prepare(state);
    let movelist = p4_movelist(state, colour, state.enpassant);
    for (let i = 0; i < movelist.length; i++) {
        let cs = movelist[i][1];
        let ce = movelist[i][2];
        if (e == ce && s == cs) {
            legal = true;
            break;
        }
    }
    if (! legal) {
        return {flags: P4_MOVE_ILLEGAL, ok: false};
    }

    /*Try the move, and see what the response is.*/
    let changes = p4_make_move(state, s, e, promotion);

    /*is it check? */
    if (p4_check_check(state, colour)){
        p4_unmake_move(state, changes);
        p4_log('in check', changes);
        return {flags: P4_MOVE_ILLEGAL, ok: false, string: "in check!"};
    }
    /*The move is known to be legal. We won't be undoing it.*/

    let flags = P4_MOVE_FLAG_OK;

    state.history.push([s, e, promotion]);

    /*draw timeout: 50 moves without pawn move or capture is a draw */
    if (changes.capture) {
        state.draw_timeout = 0;
        flags |= P4_MOVE_FLAG_CAPTURE;
    }
    else if ((S & 14) == P4_PAWN){
        state.draw_timeout = 0;
    }
    else{
        state.draw_timeout++;
    }
    if (changes.castled){
        flags |= (s > e) ? P4_MOVE_FLAG_CASTLE_QUEEN : P4_MOVE_FLAG_CASTLE_KING;
    }
    const shortfen = p4_state2fen(state, true);
    const repetitions = (state.position_counts[shortfen] || 0) + 1;
    state.position_counts[shortfen] = repetitions;
    state.current_repetitions = repetitions;
    if (state.draw_timeout > 100 || repetitions >= 3 ||
        p4_insufficient_material(state)){
        flags |= P4_MOVE_FLAG_DRAW;
    }
    state.moveno++;
    state.to_play = other_colour;

    if (p4_check_check(state, other_colour)){
        flags |= P4_MOVE_FLAG_CHECK;
    }
    /* check for (stale|check)mate, by seeing if there is a move for
     * the other side that doesn't result in check. (In other words,
     * reduce the pseudo-legal-move list down to a legal-move list,
     * and check it isn't empty).
     *
     * We don't need to p4_prepare because other colour pieces can't
     * have moved (just disappeared) since previous call. Also,
     * setting the promotion piece is unnecessary, because all
     * promotions block check equally well.
    */
    let is_mate = true;
    let replies = p4_movelist(state, other_colour);
    for (let i = 0; i < replies.length; i++){
        let m = replies[i];
        let change2 = p4_make_move(state, m[1], m[2], P4_QUEEN);
        let check = p4_check_check(state, other_colour);
        p4_unmake_move(state, change2);
        if (!check){
            is_mate = false;
            break;
        }
    }
    if (is_mate) {
        flags |= P4_MOVE_FLAG_MATE;
    }
    const movestring = p4_move2string(state, s, e, S, promotion, flags,
                                      movelist);
    p4_log("successful move", s, e, movestring, flags);
    state.prepared = false;
    return {
        flags: flags,
        string: movestring,
        ok: true
    };
}


function p4_move2string(state, s, e, S, promotion, flags, movelist){
    const piece = S & 14;
    let src, dest;
    let mv;
    const capture = flags & P4_MOVE_FLAG_CAPTURE;

    src = p4_stringify_point(s);
    dest = p4_stringify_point(e);
    if (piece == P4_PAWN) {
        if (capture) {
            mv = src.charAt(0) + 'x' + dest;
        }
        else {
            mv = dest;
        }
        if (e > 90 || e < 30){  //end row, queening
            if (promotion === undefined)
                promotion = P4_QUEEN;
            mv += '=' + P4_ENCODE_LUT.charAt(promotion);
        }
    }
    else if (piece == P4_KING && (s-e) * (s-e) == 4) {
        if (e < s)
            mv = 'O-O-O';
        else
            mv = 'O-O';
    }
    else {
        let row_qualifier = '';
        let col_qualifier = '';
        let pstr = P4_ENCODE_LUT.charAt(S);
        const sx = s % 10;
        const sy = parseInt(s / 10);

        /* find any other pseudo-legal moves that would put the same
         * piece in the same place, for which we'd need
         * disambiguation. */
        let co_landers = [];
        for (let i = 0; i < movelist.length; i++){
            let m = movelist[i];
            if (e == m[2] && s != m[1] && state.board[m[1]] == S){
                co_landers.push(m[1]);
            }
        }
        if (co_landers.length){
            for (let i = 0; i < co_landers.length; i++){
                let c = co_landers[i];
                let cx = c % 10;
                let cy = parseInt(c / 10);
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
    p4_log('jumping to move', moveno);
    if (moveno === undefined || moveno > state.moveno)
        moveno = state.moveno;
    else if (moveno < 0){
        moveno = state.moveno + moveno;
    }
    let state2 = p4_fen2state(state.beginning);
    let i = 0;
    while (state2.moveno < moveno){
        let [s, e, promotion] = state.history[i++];
        p4_move(state2, s, e, promotion);
    }
    /* copy the replayed state across, not all that deeply, but
     * enough to cover, eg, held references to board. */
    let attr, dest;
    for (attr in state2){
        let src = state2[attr];
        if (attr instanceof Array){
            dest = state[attr];
            dest.length = 0;
            for (let i = 0; i < src.length; i++){
                dest[i] = src[i];
            }
        }
        else {
            state[attr] = src;
        }
    }
    state.prepared = false;
}


/* write a standard FEN notation
 * http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
 * */
function p4_state2fen(state, reduced){
    const piece_lut = '  PpRrNnBbKkQq';
    let board = state.board;
    let fen = '';
    //fen does Y axis backwards, X axis forwards */
    for (let y = 9; y > 1; y--){
        let count = 0;
        for (let x = 1; x < 9; x++){
            let piece = board[y * 10 + x];
            if (piece == 0) {
                count++;
            }
            else{
                if (count) {
                    fen += count.toString();
                }
                fen += piece_lut.charAt(piece);
                count = 0;
            }
        }
        if (count) {
            fen += count.toString();
        }
        if (y > 2) {
            fen += '/';
        }
    }
    /*white or black */
    fen += ' ' + 'wb'.charAt(state.to_play) + ' ';
    /*castling */
    if (state.castles){
        const lut = [2, 'K', 1, 'Q', 8, 'k', 4, 'q'];
        for (let i = 0; i < 8; i += 2){
            if (state.castles & lut[i]) {
                fen += lut[i + 1];
            }
        }
    }
    else {
        fen += '-';
    }
    /*enpassant */
    if (state.enpassant !== 0) {
        let ep = state.enpassant + 70 - state.to_play * 30;
        fen += ' ' + p4_stringify_point(ep);
    }
    else
        fen += ' -';
    if (reduced){
        /*if the 'reduced' flag is set, the move number and draw
         *timeout are not added. This form is used to detect draws by
         *3-fold repetition.*/
        return fen;
    }
    fen += ' ' + state.draw_timeout + ' ';
    fen += (state.moveno >> 1) + 1;
    return fen;
}

function p4_stringify_point(p){
    const letters = " abcdefgh";
    const x = p % 10;
    const y = (p - x) / 10 - 1;
    return letters.charAt(x) + y;
}

function p4_destringify_point(p){
    const x = parseInt(p.charAt(0), 19) - 9; //a-h <-> 10-18, base 19
    const y = parseInt(p.charAt(1)) + 1;
    if (y >= 2 && y < 10 && x >= 1 && x < 9) {
        return y * 10 + x;
    }
    return undefined;
}

/* read a standard FEN notation
 * http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
 * */
function p4_fen2state(fen, state){
    if (state === undefined) {
        state = p4_initialise_state();
    }
    let board = state.board;
    let [fen_board,
         fen_toplay,
         fen_castles,
         fen_enpassant,
         fen_timeout,
         fen_moveno] = fen.split(' ');

    if (fen_timeout === undefined) {
        fen_timeout = 0;
    }
    //fen does Y axis backwards, X axis forwards */
    let y = 90;
    let x = 1;
    for (let j = 0; j < fen_board.length; j++){
        let c = fen_board.charAt(j);
        if (c == '/'){
            x = 1;
            y -= 10;
            if (y < 20)
                break;
            continue;
        }
        let piece = P4_PIECE_LUT[c];
        if (piece && x < 9){
            board[y + x] = piece;
            x++;
        }
        else {
            let end = Math.min(x + parseInt(c), 9);
            for (; x < end; x++) {
                board[y + x] = 0;
            }
        }
    }
    state.to_play = (fen_toplay.toLowerCase() == 'b') ? 1 : 0;
    state.castles = 0;
    /* Sometimes we meet bad FEN that says it can castle when it can't. */
    const wk = board[25] == P4_KING;
    const bk = board[95] == P4_KING + 1;
    const castle_lut = {
        k: 8 * (bk && board[98] == P4_ROOK + 1),
        q: 4 * (bk && board[91] == P4_ROOK + 1),
        K: 2 * (wk && board[28] == P4_ROOK),
        Q: 1 * (wk && board[21] == P4_ROOK)
    };
    for (let i = 0; i < fen_castles.length; i++){
        let c = fen_castles.charAt(i);
        let castle = castle_lut[c];
        if (castle !== undefined){
            state.castles |= castle;
            if (castle == 0){
                console.log("FEN claims castle state " + fen_castles +
                            " but pieces are not in place for " + c);
            }
        }
    }

    let ep = (fen_enpassant != '-') ? p4_destringify_point(fen_enpassant) : 0;
    state.enpassant = ep % 10;
    state.draw_timeout = parseInt(fen_timeout);
    if (fen_moveno === undefined){
        /*have a guess based on entropy and pieces remaining*/
        let n_pieces = 0;
        let mix = 0;
        for (y = 20; y < 100; y+=10) {
            for (x = 1; x < 9; x++) {
                let p = board[y + x] & 15;
                n_pieces += (!!p);
                if (x < 8){
                    let q = board[y + x + 1];
                    mix += (!q) != (!p);
                }
                if (y < 90){
                    let q = board[y + x + 10];
                    mix += (!q) != (!p);
                }
            }
        }
        fen_moveno = Math.max(1, parseInt((32 - n_pieces) * 1.3 +
                                          (4 - fen_castles.length) * 1.5 +
                                          ((mix - 16) / 5)));
    }
    state.moveno = 2 * (parseInt(fen_moveno) - 1) + state.to_play;
    state.history = [];
    state.beginning = fen;
    state.prepared = false;
    state.position_counts = {};
    /* Wrap external functions as methods. */
    state.move = function(s, e, promotion){
        return p4_move(this, s, e, promotion);
    };
    state.findmove = function(level){
        return p4_findmove(this, level);
    };
    state.jump_to_moveno = function(moveno){
        return p4_jump_to_moveno(this, moveno);
    };

    /* Make the pieces lists just as big as they need to be */
    let counts = [0, 0];
    for (let i = 20; i < 100; i++) {
        if (state.board[i] & 15) {
            counts[state.board[i] & 1]++;
        }
    }
    state.pieces = [
            new Int32Array(counts[0] + 1),
            new Int32Array(counts[1] + 1)
    ];

    return state;
}

/*
Weights would all fit within an Int8Array *except* for the last row
for pawns, which is close to the queen value (180, max is 127).

Int8Array seems slightly quicker in Chromium 18, no different in
Firefox 12.

Int16Array is no faster, perhaps slower than Int32Array.

Int32Array is marginally slower than plain arrays with Firefox 12, but
significantly quicker with Chromium.
 */

function p4_zero_array(){
    return new Int32Array(120);
}


/* p4_initialise_state() creates the board and initialises weight
 * arrays etc.  Some of this is really only needs to be done once.
 */

function p4_initialise_state(){
    let board = p4_zero_array();
    P4_CENTRALISING_WEIGHTS = p4_zero_array();
    P4_BASE_PAWN_WEIGHTS = p4_zero_array();
    P4_KNIGHT_WEIGHTS = p4_zero_array();
    for(let i = 0; i < 120; i++){
        const y = parseInt(i / 10);
        const x = i % 10;
        const dx = Math.abs(x - 4.5);
        const dy = Math.abs(y - 5.5);
        P4_CENTRALISING_WEIGHTS[i] = parseInt(6 - Math.pow((dx * dx + dy * dy) * 1.5, 0.6));
         //knights have a flat topped centre (bishops too, but less so).
        P4_KNIGHT_WEIGHTS[i] = parseInt(((dx < 2) + (dy < 2) * 1.5)
                                        + (dx < 3) + (dy < 3)) - 2;
        P4_BASE_PAWN_WEIGHTS[i] = [0,0,0,0, 1, 2, 3, 4, 7, 0,0,0][y];
        if (y > 9 || y < 2 || x < 1 || x > 8)
            board[i] = 16;
    }
    let weights = [];
    for (let i = 0; i < 14; i++){
        weights[i] = p4_zero_array();
    }
    let state = {
        board: board,
        weights: weights,
        history: [],
        treeclimber: p4_alphabeta_treeclimber,
        pieces: [
            new Int32Array(17),
            new Int32Array(17)
        ],
        score_lut: p4_zero_array()
    };
    p4_random_seed(state, P4_DEBUG ? 1 : Date.now());
    state.movelists = [];
    for (let i = 0; i < 26; i++) {
        state.movelists.push(new Int32Array(250));
    }
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
    const FAIL = [0, 0];
    const algebraic_re = /^\s*([RNBQK]?[a-h]?[1-8]?)[ :x-]*([a-h][1-8]?)(=[RNBQ])?[!?+#e.p]*\s*$/;
    const castle_re = /^\s*([O0o]-[O0o](-[O0o])?)\s*$/;
    const position_re = /^[a-h][1-8]$/;

    let s = 0, e, q;
    let m = algebraic_re.exec(str);
    if (m == null){
        /*check for castling notation (O-O, O-O-O) */
        m = castle_re.exec(str);
        if (m) {
            s = 25 + state.to_play * 70;
            if (m[2]) {/*queenside*/
                e = s - 2;
            }
            else {
                e = s + 2;
            }
        }
        else {
            return FAIL;
        }
    }
    let src = m[1];
    let dest = m[2];
    let queen = m[3];
    if (s == 0 && (src == '' || src === undefined)){
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
    if (s == 0) {
        return FAIL;
    }
    if (queen){
        /* the chosen queen piece */
        q = P4_PIECE_LUT[queen.charAt(1)];
    }
    return [s, e, q];
}


function p4_find_source_point(state, e, str){
    const colour = state.to_play;
    const piece = P4_PIECE_LUT[str.charAt(0)] | colour;
    let s;

    let row, column;
    /* can be specified as Na, Na3, N3, and who knows, N3a? */
    for (let i = 1; i < str.length; i++){
        let c = str.charAt(i);
        if (/[a-h]/.test(c)){
            column = str.charCodeAt(i) - 96;
        }
        else if (/[1-8]/.test(c)){
            /*row goes 2 - 9 */
            row = 1 + parseInt(c);
        }
    }
    let possibilities = [];
    p4_prepare(state);
    let moves = p4_movelist(state);
    for (let i = 0; i < moves.length; i++) {
        let mv = moves[i];
        if (e == mv[2]){
            s = mv[1];
            if (state.board[s] == piece &&
                (column === undefined || column == s % 10) &&
                (row === undefined || row == parseInt(s / 10))
               ){
                   let change = p4_make_move(state, s, e, P4_QUEEN);
                   if (! p4_check_check(state, colour))
                       possibilities.push(s);
                   p4_unmake_move(state, change);
            }
        }
    }
    p4_log("finding", str, "that goes to", e, "got", possibilities);

    if (possibilities.length == 0){
        return 0;
    }
    else if (possibilities.length > 1){
        p4_log("p4_find_source_point seems to have failed",
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
    state.rng = new Uint32Array(4);
    state.rng[0] = 0xf1ea5eed;
    state.rng[1] = seed;
    state.rng[2] = seed;
    state.rng[3] = seed;
    for (let i = 0; i < 20; i++)
        p4_random32(state);
}

function p4_random32(state){
    let rng = state.rng;
    let b = rng[1];
    let c = rng[2];
    /* These shifts amount to rotates.
     * Note the three-fold right shift '>>>', meaning an unsigned shift.
     * rng is a UInt32Array, so everything wraps at 2 ** 32.
     */
    let e = rng[0] - ((b << 27) | (b >>> 5));
    rng[0] = b ^ ((c << 17) | (c >>> 15));
    rng[1] = (c + rng[3]);
    rng[2] = (rng[3] + e);
    rng[3] = (e + rng[0]);
    return rng[3];
}

function p4_random_int(state, top){
    /* uniform integer in range [0 <= n < top), supposing top <= 2 ** 32
     *
     * This method is slightly (probably pointlessly) more accurate
     * than converting to 0-1 float, multiplying and truncating, and
     * considerably more accurate than a simple modulus.
     * Obviously it is a bit slower.
     */
    /* mask becomes one less than the next highest power of 2 */
    let mask = top;
    mask--;
    mask |= mask >>> 1;
    mask |= mask >>> 2;
    mask |= mask >>> 4;
    mask |= mask >>> 8;
    mask |= mask >>> 16;
    let r;
    do{
        r = p4_random32(state) & mask;
    } while (r >= top);
    return r;
}
