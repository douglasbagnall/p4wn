/*This file contains alternate versions of treeclimber, including a
 * simple negamax search to test parsing against known move counts.

It assumes various engine.js functions are available.
*/


function p4_negamax_treeclimber(state, count, colour, score, s, e){
    var move;
    if (s)
        move = p4_make_move(state, s, e, P4_QUEEN);
    var ep = s ? move.ep: 0;
    var ncolour = 1 - colour;
    var movelist = p4_parse(state, colour, ep, -score);
    var movecount = movelist.length;
    state.node_count += movecount;
    var best = P4_MIN_SCORE;
    if(count){
        //branch nodes
        var t;
        for(var i = 0; i < movecount; i++){
            var mv = movelist[i];
            var mscore = mv[0];
            if (mscore > P4_WIN){
                best = P4_KING_VALUE;
                break;
            }
            t = -p4_negamax_treeclimber(state, count - 1, ncolour, mscore, mv[1], mv[2]);
            if (t > best){
                best = t;
            }
        }

        if (best < -P4_WIN_NOW && ! p4_check_check(state, colour)){
            best = state.stalemate_scores[colour];
        }
        if (best < -P4_WIN){
            best += P4_WIN_DECAY;
        }
    }
    else{
        //leaf nodes
        while(--movecount != -1){
            if(movelist[movecount][0] > best){
                best = movelist[movecount][0];
            }
        }
    }
    if (s)
        p4_unmake_move(state, move);
    return best;
}

function p4_counting_treeclimber(state, count, colour, score, s, e){
    var move, i, ep;
    var promotions = [P4_QUEEN, P4_ROOK, P4_BISHOP, P4_KNIGHT];
    var pi = 0;
    var ncolour = 1 - colour;
    var subnodes = 0;
    do {
        if (s){
            move = p4_make_move(state, s, e, promotions[pi]);
            ep = move.ep;
        }
        else {
            ep = 0;
        }
        var pseudo_movelist = p4_parse(state, colour, ep, 0);
        var movelist = [];
        var promotion_count = 0;
        /* Pseudo_movelist contains moves into check, so drop those.
         */
        for (i = 0; i < pseudo_movelist.length; i++){
            var mv2 = pseudo_movelist[i];
            var s2 = mv2[1], e2 = mv2[2];
            var move2 = p4_make_move(state, s2, e2, P4_QUEEN);
            if (! p4_check_check(state, colour)){
                movelist.push(mv2);
            }
            if ((move2.S & 14) == 2 && (e2 < 30 || e2 > 90)){
                /*this is a promotion*/
                promotion_count++;
            }
            p4_unmake_move(state, move2);
        }
        var movecount = movelist.length;
        if(count){
            for(i = 0; i < movecount; i++){
                var mv = movelist[i];
                subnodes += p4_counting_treeclimber(state, count - 1, ncolour, 0, mv[1], mv[2]);
            }
        }
        else{
            subnodes += movecount;
            subnodes += promotion_count * 3; //3 extras on top of queen
        }
        if (s)
            p4_unmake_move(state, move);

        //if (pi && move.S < 4 && ((60 - e) * (60 - e) > 900))
        //    console.log(s, move.S, promotions[pi]);
        pi++;
    } while(s &&
            pi < promotions.length &&
            move.S < 4 &&
            ((60 - e) * (60 - e) > 900));

    return subnodes;
}




function p4_nullmove_alphabeta_treeclimber(state, count, colour, score, s, e, alpha, beta){
    var move;
    if (s)
        move = p4_make_move(state, s, e, P4_QUEEN);
    var ep = s ? move.ep: 0;
    var ncolour = 1 - colour;
    var board = state.board;
    if(count){
        //branch nodes
        var t;
        /* first try a null move. This sets a decent value for beta in
           almost every situation (I think. seems to work).
        */
        if (count >= 2){
            t = p4_nullmove_alphabeta_treeclimber(state, count - 2, colour, score, 0, 0,
                                                  alpha, beta);
            //console.log('count, t, alpha, beta', count, t, alpha, beta);
            if (t > beta){
                if (s)
                    p4_unmake_move(state, move);
                return beta;
            }
        }
        var movelist = p4_parse(state, colour, ep, -score);
        var movecount = movelist.length;
        for(var i = 0; i < movecount; i++){
            var mv = movelist[i];
            var mscore = mv[0];
            var ms = mv[1];
            var me = mv[2];
            if (mscore > P4_WIN){ //we won! Don't look further.
                alpha = P4_KING_VALUE;
                break;
            }
            t = -p4_nullmove_alphabeta_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                                   -beta, -alpha);
            if (t > alpha)
                alpha = t;
            if (alpha >= beta)
                break;
        }
        if (alpha < -P4_WIN_NOW && ! p4_check_check(state, colour)){
            alpha = state.stalemate_scores[colour];
        }
        if (alpha < -P4_WIN){
            alpha += P4_WIN_DECAY;
        }
    }
    else{
        //leaf nodes
        var movelist = p4_parse(state, colour, ep, -score);
        var movecount = movelist.length;
        while(beta > alpha && --movecount >= 0){
            if(movelist[movecount][0] > alpha){
                alpha = movelist[movecount][0];
            }
        }
    }
    if (s)
        p4_unmake_move(state, move);
    return alpha;
}

function p4_nullmove_alphabeta_quiescing_treeclimber(state, count, colour, score, s, e,
                                                     alpha, beta){
    if (s)
        var move = p4_make_move(state, s, e, P4_QUEEN);
    var ep = s ? move.ep: 0;
    var ncolour = 1 - colour;
    var i, mv;
    var board = state.board;
    if(count){
        var t;
        /* first try a null move. This sets a decent value for beta in
           almost every situation (I think. seems to work).
        */
        if (count >= 2){
            t = p4_nullmove_alphabeta_quiescing_treeclimber(state, count - 2, colour, score, 0, 0,
                                                            alpha, beta);
            if (t > beta){
                if(s)
                    p4_unmake_move(state, move);
                return beta;
            }
        }
        var movelist = p4_parse(state, colour, ep, -score);
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
            t = -p4_nullmove_alphabeta_quiescing_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                                             -beta, -alpha);
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
        var movelist = p4_parse(state, colour, ep, -score);
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
    if(s)
        p4_unmake_move(state, move);
    return alpha;
}

function p4_quiesce(state, count, colour, s, e, alpha, beta){
    if (alpha > beta)
        return alpha;
    var move = p4_make_move(state, s, e, P4_QUEEN);
    var i;
    var ncolour = 1 - colour;
    var movelist = p4_parse(state, colour, move.ep, -alpha);
    var movecount = movelist.length;
    var mv;
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



function p4_negascout_treeclimber(state, count, colour, score, s, e, alpha, beta){
    var move = p4_make_move(state, s, e, P4_QUEEN);
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
            t = -p4_negascout_treeclimber(state, count - 1, ncolour, mscore, ms, me,
                                          -b, -alpha);
            if (t > alpha && t < beta && i != 0){
                t = -p4_negascout_treeclimber(state, count - 1, ncolour, mscore, ms, me,
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

        if (alpha < -P4_WIN_NOW && ! p4_check_check(state, colour)){
            alpha = state.stalemate_scores[colour];
        }
        if (alpha < -P4_WIN){
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



function add_extra_searches(p4d){
    var tree_climbers = [
        'alphabeta (default)', p4_alphabeta_treeclimber,
        'nullmove', p4_nullmove_alphabeta_treeclimber,
        'nullmove/quiesce', p4_nullmove_alphabeta_quiescing_treeclimber,
        'negascout', p4_negascout_treeclimber,
        'negamax (slow!)', p4_negamax_treeclimber
    ];
    var index = 0;

    p4d.write_controls_html([
        {
            onclick_wrap: function(p4d){
                return function(e){
                    index = (index + 2) % tree_climbers.length;
                    p4d.board_state.treeclimber = tree_climbers[index + 1];
                    _event_target(e).innerHTML = 'search function: <b>' + tree_climbers[index] + '</b>';
                    p4d.log("using " + tree_climbers[index]);
                };
            },
            refresh: function(el){
                el.innerHTML = 'search function: <b>' + tree_climbers[index] + '</b>';
            }
        }
    ]);
    console.log('added searches');
}
