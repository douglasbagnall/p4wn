/*Simple negamax search to test parsing against known move counts

Assumes engine.js function

p4_parse(state, colour, ep, castle_state, score)
*/

function p4_make_move(state, s, e, castle_state, promotion){
    var board = state.board;
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

    return {
        castle_state: castle_state,
        undo: function(){
            if(rs){
                board[rs]=rook;
                board[re]=0;
                piece_locations.length--;
            }
            if (ep_position){
                board[ep_position] = ep_taken;
            }
            board[s] = S;
            board[e] = E;
            if (S){
                piece_locations.length--;
            }
        }
    };
}

function p4_negamax_treeclimber(state, count, colour, score, s, e, alpha, beta, ep,
                                castle_state, promotion){
    var move = p4_make_move(state, s, e, castle_state, promotion);
    var i;
    var ncolour = 1 - colour;
    var movelist = p4_parse(state, colour, ep, move.castle_state, -score);
    var movecount = movelist.length;
    var mv, bs, be;
    if(count){
        //branch nodes
        var t;
        bs = 0;
        be = 0;
        for(i = 0; i < movecount; i++){
            mv = movelist[i];
            var mscore = mv[0];
            var ms = mv[1];
            var me = mv[2];
            var mep = mv[3];
            if (mscore > P4_WIN){ //we won! Don't look further.
                alpha = P4_KING_VALUE + 200 * count;
                bs = ms;
                be = me;
                break;
            }
            t = -p4_negamax_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                        -beta, -alpha, mep, castle_state)[0];
            if (t > alpha){
                alpha = t;
                bs = ms;
                be = me;
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
        while(--movecount != -1){
            if(movelist[movecount][0] > alpha){
                alpha = movelist[movecount][0];
            }
        }
    }
    move.undo();
    return [alpha, bs, be];
}

/****treeclimber */
function p4_alphabeta_treeclimber(state, count, colour, score, s, e, alpha, beta, ep,
                        castle_state, promotion){
    var move = p4_make_move(state, s, e, castle_state, promotion);
    var i;
    var ncolour = 1 - colour;
    var movelist = p4_parse(state, colour, ep, move.castle_state, -score);
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
                alpha = P4_KING_VALUE + 200 * count;
                bs = ms;
                be = me;
                break;
            }
            t = -p4_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                -beta, -alpha, mep, castle_state)[0];
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
    move.undo();
    return [alpha, bs, be];
}

/****treeclimber */
function p4_negascout_treeclimber(state, count, colour, score, s, e, alpha, beta, ep,
                        castle_state, promotion){
    var move = p4_make_move(state, s, e, castle_state, promotion);
    var i;
    var ncolour = 1 - colour;
    var movelist = p4_parse(state, colour, ep, move.castle_state, -score);
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
                alpha = P4_KING_VALUE + 200 * count;
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
    move.undo();
    return [alpha, bs, be];
}

var TREE_CLIMBERS = [
    'original', p4_treeclimber,
    'negamax', p4_negamax_treeclimber,
    'alphabeta', p4_alphabeta_treeclimber,
    'negascout', p4_negascout_treeclimber
];

var TREE_CLIMBER_INDEX = 0;

write_controls_html([
    {
        //label: 'search function: <b>' + TREE_CLIMBERS[TREE_CLIMBER_INDEX] + '</b>',
        onclick: function(e){
            var x = (TREE_CLIMBER_INDEX + 2) % TREE_CLIMBERS.length;
            TREE_CLIMBER_INDEX = x;
            p4_treeclimber = TREE_CLIMBERS[x + 1];
            console.log(x);
            e.currentTarget.innerHTML = 'search function: <b>' + TREE_CLIMBERS[TREE_CLIMBER_INDEX] + '</b>';
        },
        refresh: function(el){
            el.innerHTML = 'search function: <b>' + TREE_CLIMBERS[TREE_CLIMBER_INDEX] + '</b>';
        }
    }
]);
