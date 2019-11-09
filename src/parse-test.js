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
    var movelist = p4_movelist(state, colour, ep, -score);
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

function p4_counting_treeclimber(state, count, colour, score, s, e) {
    /* This one returns a count of the reachable nodes. It is intended
     * to test the parsing routines against known positions ("perft"
     * testing).
     */
    var move, i, ep;
    var promotions = [P4_QUEEN, P4_ROOK, P4_BISHOP, P4_KNIGHT];
    var pi = 0;
    var ncolour = 1 - colour;
    var subnodes = 0;
    do {
        if (s) {
            move = p4_make_move(state, s, e, promotions[pi]);
            ep = move.ep;
        }
        else {
            ep = 0;
        }
        const movelist = state.movelists[count];
        let pseudo_movecount = p4_parse(state, colour, ep, 0, movelist);
        var promotion_count = 0;
        /* movelist contains moves into check, so drop those.
         */
        let j = 0;
        for (i = 0; i < pseudo_movecount; i++) {
            let mv = movelist[i];
            let s2 = mv & 127;
            let e2 = (mv >>> 7) & 127;
            var move2 = p4_make_move(state, s2, e2, P4_QUEEN);
            if (! p4_check_check(state, colour)) {
                movelist[j] = mv;
                j++;
                if ((move2.S & 14) == 2 && (e2 < 30 || e2 > 90)){
                    /* this is a promotion, so we will need to add
                     * to the count for non-queen promotions. */
                    promotion_count++;
                }
            }
            p4_unmake_move(state, move2);
        }
        var movecount = j;
        if(count){
            for(i = 0; i < movecount; i++){
                let mv = movelist[i];
                let ms = mv & 127;
                let me = (mv >>> 7) & 127;
                subnodes += p4_counting_treeclimber(state, count - 1, ncolour, 0, ms, me);
            }
        }
        else{
            subnodes += movecount;
            subnodes += promotion_count * 3; //3 extras on top of queen
        }
        if (s) {
            p4_unmake_move(state, move);
        }
        //if (pi && move.S < 4 && ((60 - e) * (60 - e) > 900))
        //    console.log(s, move.S, promotions[pi]);
        pi++;
    } while(s &&
            pi < promotions.length &&
            move.S < 4 &&
            ((60 - e) * (60 - e) > 900));

    return subnodes;
}


function p4_negascout_treeclimber(state, count, colour, score, s, e, alpha, beta){
    var move = p4_make_move(state, s, e, P4_QUEEN);
    var i;
    var ncolour = 1 - colour;
    var movelist = p4_movelist(state, colour, move.ep, -score);
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
