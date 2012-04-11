

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
        results.push(r);
        if ((r & 1) == 0){
            break;
        }
    }
    console.log("ran sequence", seq, results, seq.length);
    return results;
}


function fen_moves(fen, moves, non_moves){
    var i, j;
    var tstr = 'Fen: <i>' + fen + '</i> ';
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
    var success = messages.length == 0;
    var msg = (success) ? 'OK' : messages.join('<br>');
    return [success, tstr, msg];
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
    var i;
    for (i = 0; i < tests.length; i++){
        var t = tests[i];
        var desc = t.shift();
        var f = t.shift();
        var r = f.apply(undefined, t);
        print_result.apply(desc, r);
    }
}


var TESTS = [
    [
        "mid game board 1",
        fen_moves, "r3kb1r/ppBnp1pp/5p2/1N1n1b2/2BP4/5NP1/P4P1P/R1R3K1 b kq - 1 16",
        [[['a7', 'a6']]],
        [[['a1', 'a2']]]
    ],
    [
        "mid game board 2",
        fen_moves, "r3kb1r/1pBnp1pp/p4p2/1N1n1b2/2BP4/5NP1/P4P1P/R1R3K1 w kq - 0 17",
        [['a1-b1']],
        [['d4-e5']]],
    [
        "pinned knight by check",
        fen_moves, "4k3/4n3/8/3N1R2/4R2p/7P/1r3BK1/8 b - - 6 42",
        [['b2-b5']],
        [['e7-d5'], ['e7-c5'], ['e8f8']]],
    [
        "en passant",
        fen_moves,
        "rn1qkbnr/p1p1pppp/8/1pPp4/3P1B2/8/PP2PPPP/Rb1QKBNR w KQkq b6 0 5",
        ['c5-b6', 'c5-c6'],
        ['c5-d6', 'c5c4']],
    [
        "enpassant out of check github #2",
        fen_moves, "8/p2p1N2/8/4p2k/1p2P1Pp/1P1b3K/P6P/n7 b - g3 0 32",
        ['h4g3']
    ],
    [
        "castling while in check github #3",
        fen_moves, "rnb1r1k1/ppp2ppp/8/8/2PN4/2Nn4/P3BPPP/R3K2R w KQ - 5 14",
        undefined,
        ['e1-g1', 'e1-c1']
     ],
    [
        "castling error github #4",
        fen_moves, "r6r/p3kp1p/4np2/1Bb5/3p4/P4N2/1P3PPP/R3K2R w KQ - 2 18",
        ['e1-g1', 'e1-c1', 'O-O', 'O-O-O']
     ],
    [
        "castling king side disallowed",
        fen_moves, "r6r/p3kp1p/4np2/1Bb5/3p4/P4N2/1P3PPP/R3K2R w Q - 2 18",
        ['O-O-O'], ['O-O']
     ],
    [
        "castling queen side disallowed",
        fen_moves, "r6r/p3kp1p/4np2/1Bb5/3p4/P4N2/1P3PPP/R3K2R w K - 2 18",
        ['O-O'], ['O-O-O']
     ],
    [
        "castling error github #5",
        fen_moves, "r3k2Q/pp3p1p/3qp3/2pp2N1/3P4/4PP2/PP1K2PP/nNB4R b q - 0 15",
        undefined, ['O-O-O']
     ],
    [
        "initial board",
        fen_moves, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1",
        [['Nc3', 'e6']],
        [['Nd3'], ['e3', 'e4']]]
];
main(TESTS);
