/*Simple negamax search to test parsing against known move counts

Assumes engine.js function

p4_parse(state, colour, ep, score)
*/

function p4_make_move(state, s, e, promotion){
    var board = state.board;
    var S = board[s];
    var E = board[e];
    board[e]=S;
    board[s]=0;
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
            ep = (s + e) >> 1;
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
    board = state.board;
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

function p4_negamax_treeclimber(state, count, colour, score, s, e, alpha, beta, promotion){
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
            t = -p4_negamax_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                        -beta, -alpha);
            if (t > alpha){
                alpha = t;
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
    return alpha;
}

function p4_nullmove_alphabeta_treeclimber(state, count, colour, score, s, e, alpha, beta, promotion){
    var move = p4_make_move(state, s, e, promotion);
    var ncolour = 1 - colour;
    var i, mv;
    var board = state.board;
    if(count){
        //branch nodes
        var t;
        /* first try a null move. This sets a decent value for beta in
           almost every situation (I think. seems to work).
        */
        if (count >= 2){
            t = p4_treeclimber(state, count - 2, colour, score, 0, 0,
                               alpha, beta);
            //console.log('count, t, alpha, beta', count, t, alpha, beta);
            if (t > beta){
                move.undo();
                return beta;
            }
        }
        var movelist = p4_parse(state, colour, move.ep, -score);
        var movecount = movelist.length;
        for(i = 0; i < movecount; i++){
            mv = movelist[i];
            var mscore = mv[0];
            var ms = mv[1];
            var me = mv[2];
            if (mscore > P4_WIN){ //we won! Don't look further.
                alpha = P4_KING_VALUE;
                break;
            }
            t = -p4_treeclimber(state, count - 1, ncolour, mscore, ms, me,
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
    else if (P4_QUIESCE){
        var movelist = p4_parse(state, colour, move.ep, -score);
        var movecount = movelist.length;
        var threshold = alpha - state.best_pieces[colour];
        while(--movecount >= 0){
            mv = movelist[movecount];
            var mscore = mv[0];
            var ms = mv[1];
            var me = mv[2];
            if (mscore > threshold && board[me]){
                    //console.log("quiescing", score, mscore, alpha, beta);
                    /*a capture*/
                mscore = -p4_quiesce(state, 1, ncolour, ms, me, -beta, -mscore);
            }
            if (mscore > alpha)
                alpha = mscore;
        }
    }
    else{
        //leaf nodes
        var movelist = p4_parse(state, colour, move.ep, -score);
        var movecount = movelist.length;
        while(beta > alpha && --movecount >= 0){
            if(movelist[movecount][0] > alpha){
                alpha = movelist[movecount][0];
            }
        }
    }
    move.undo();
    return alpha;
}

function p4_quiesce(state, count, colour, s, e, alpha, beta,
                    promotion){
    if (alpha > beta)
        return alpha;
    var move = p4_make_move(state, s, e, promotion);
    var i;
    var ncolour = 1 - colour;
    var movelist = p4_parse(state, colour, move.ep, -alpha);
    var movecount = movelist.length;
    var mv;
    state.quiesce_counts[count]++;
    if(count){
        //branch nodes
        var t;
        var board = state.board;
        for(i = 0; i < movecount; i++){
            mv = movelist[i];
            var mscore = mv[0];
            var ms = mv[1];
            var me = mv[2];
            if (board[me] == 0){
                /*captures are sorted first, so we can break rather than continue*/
                break;
            }
            if (mscore > P4_WIN){
                alpha = P4_KING_VALUE;
                break;
            }
            t = -p4_quiesce(state, count - 1, ncolour, ms, me, -beta, -mscore);
            if (t > alpha){
                alpha = t;
            }
            if (alpha >= beta){
                break;
            }
        }
        if (alpha < -P4_WIN_NOW && ! p4_check_check(state, colour)){
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
            if(movelist[movecount][0] > alpha){
                alpha = movelist[movecount][0];
            }
        }
    }
    move.undo();
    return alpha;
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
            t = -p4_treeclimber(state, count - 1, ncolour, mscore, ms, me,
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
    //move.undo();
    p4_unmake_move(state, move);
    return alpha;
}

/****treeclimber */
function p4_negascout_treeclimber(state, count, colour, score, s, e, alpha, beta,
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
        var b = beta;
        for(i = 0; i < movecount; i++){
            mv = movelist[i];
            var mscore = mv[0];
            var ms = mv[1];
            var me = mv[2];
            if (mscore > P4_WIN){ //we won! Don't look further.
                alpha = P4_KING_VALUE;
                break;
            }
            t = -p4_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                -b, -alpha);
            if (t > alpha && t < beta && i != 0){
                t = -p4_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                    -beta, -alpha);
            }
            if (t > alpha){
                alpha = t;
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
    return alpha;
}



function add_extra_searches(p4d){
    var TREE_CLIMBERS = [
        'default', p4_treeclimber,
        'negamax', p4_negamax_treeclimber,
        'nullmove', p4_nullmove_alphabeta_treeclimber,
        'alphabeta', p4_alphabeta_treeclimber,
        'negascout', p4_negascout_treeclimber
    ];

    var TREE_CLIMBER_INDEX = 0;

    p4d.write_controls_html([
        {
            onclick_wrap: function(p4d){
                return function(e){
                    var x = (TREE_CLIMBER_INDEX + 2) % TREE_CLIMBERS.length;
                    TREE_CLIMBER_INDEX = x;
                    p4_treeclimber = TREE_CLIMBERS[x + 1];
                    e.currentTarget.innerHTML = 'search function: <b>' + TREE_CLIMBERS[TREE_CLIMBER_INDEX] + '</b>';
                    p4d.log("using " + TREE_CLIMBERS[TREE_CLIMBER_INDEX]);
                };
            },
            refresh: function(el){
                el.innerHTML = 'search function: <b>' + TREE_CLIMBERS[TREE_CLIMBER_INDEX] + '</b>';
            }
        }
    ]);
    console.log('added searches');
}
