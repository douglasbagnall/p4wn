function fenlink(fen){
    return '<a href="index.html?start=' + fen + '&player=both">' + fen + '</a>';
}

function run_sequence(fen, seq){
    var i, r;
    var results = [];
    var state = p4_fen2state(fen);
    if (seq === undefined){
        return [];
    }
    if (seq.join === undefined){
        seq = [seq];
    }
    for (i = 0; i < seq.length; i++){
        console.log([state].concat(seq[i]));
        r = p4_move.apply(undefined, [state].concat(seq[i]));
        results.push(r.flags);
        if ((r.flags & 1) == 0){
            break;
        }
    }
    console.log("ran sequence", seq, results, seq.length);
    return results;
}


function fen_moves(fen, moves, non_moves){
    var i, j;
    var tstr = 'Fen: <i>' + fenlink(fen) + '</i> ';
    var ok = true;
    var messages = [];
    if (moves){
        tstr += 'Moves: <i>' + moves.join('; ') + '</i> ';
        for (i = 0; i < moves.length; i++){
            var results = run_sequence(fen, moves[i]);
            console.log("move", moves[i], results);
            var n = results.length - 1;
            if (! results[n] & 1){
                messages.push(moves[i] + " fails after " + n + " moves");
            }
        }
    }
    if (non_moves){
        tstr += 'Non-moves: <i>' + non_moves.join('; ') + '</i> ';
        for (i = 0; i < non_moves.length; i++){
            var results = run_sequence(fen, non_moves[i]);
            console.log("non-move", non_moves[i], results);
            if (results[results.length - 1]  & 1){
                messages.push(non_moves[i] + " fails to fail");
            }
        }
    }
    var state = p4_fen2state(fen);
    var fen2 = p4_state2fen(state);
    if (fen != fen2){
        console.log(fen, "and", fen2, "differ");
        tstr += 'Fen fails round trip: <i>' + fen2 + '</i> ';
        messages.push(fen2 + " differs!");
    }
    var success = messages.length == 0;
    var msg = (success) ? 'OK' : messages.join('<br>');
    return [success, tstr, msg];
}

function result_in_n(fen, result, n, depth){
    var i, msg;
    if (depth == undefined)
        depth = 3;
    var tstr = 'Fen: <i>' + fenlink(fen) + '</i>, depth ' + depth;
    var state = p4_fen2state(fen);
    var f = {
        checkmate: [P4_MOVE_CHECKMATE, P4_MOVE_CHECKMATE],
        stalemate: [P4_MOVE_STALEMATE, P4_MOVE_CHECKMATE]
    }[result];
    var wanted_flags = f[0];
    var mask = f[1];
    var ok = false;
    for (i = 0; i < n * 2; i++){
        var mv = p4_findmove(state, depth);
        var r = p4_move(state, mv[0], mv[1]);
        if ((r.flags & mask) == wanted_flags){
            ok = true;
        }
    }
    return [ok, tstr, msg = ok ? 'OK' : 'fails'];
}

function count_moves(fen, ply, expected){
    console.log(fen);
    var tstr = 'Fen: <i>' + fenlink(fen) + '</i>, ply ' + ply + ' expecting ' + expected;
    var state = p4_fen2state(fen);
    p4_prepare(state);
    var nodes = p4_counting_treeclimber(state, ply - 1, state.to_play, 0, 0, 0);
    tstr += '; got ' + nodes;
    if (nodes == expected)
        return  [true, tstr, 'OK'];
    return [false, tstr, nodes + ' != ' + expected + " (diff " + (nodes - expected) + ")"];
}

function new_child(element, childtag){
    var child = document.createElement(childtag);
    element.appendChild(child);
    return child;
}

function print_result(ok, tstr, msg){
    var i;
    var div = document.getElementById("messages");
    var p = new_child(div, 'div');
    p.innerHTML = '<h3>' + this + '</h3>' + tstr + ' <b>' + msg + '</b>';
    p.className = ok ? 'pass' : 'fail';
}

function main(tests){
    var h1 = document.getElementById("heading");
    h1.innerHTML = "Working...";
    var i;
    var good = 0;
    for (i = 0; i < tests.length; i++){
        var t = tests[i];
        var desc = t.shift();
        var f = t.shift();
        var r = f.apply(undefined, t);
        print_result.apply(desc, r);
        if(r[0])
            good++;
    }
    h1.innerHTML = "Passed " + good + " out of " + tests.length + " tests";
}
