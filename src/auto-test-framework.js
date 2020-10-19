
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
        log([state].concat(seq[i]));
        r = p4_move.apply(undefined, [state].concat(seq[i]));
        results.push(r.flags);
        if ((r.flags & 1) == 0){
            break;
        }
    }
    log("ran sequence", seq, results, seq.length);
    return results;
}

var TEST_FUNCTIONS = {};

function register_test_fn(name, fn) {
    TEST_FUNCTIONS[name] = fn;
}

register_test_fn('fen_moves', function (fen, moves, non_moves) {
    var i, j;
    var tstr = 'Fen: ' + fenlink(fen) + ' ';
    var results;
    var messages = [];
    if (moves){
        tstr += 'Moves: ' + highlight(moves.join('; ')) + ' ';
        for (i = 0; i < moves.length; i++){
            results = run_sequence(fen, moves[i]);
            log("move", moves[i], results);
            var n = results.length - 1;
            if (! results[n] & 1){
                messages.push(moves[i] + " fails after " + n + " moves");
            }
        }
    }
    if (non_moves){
        tstr += 'Non-moves: ' + highlight(non_moves.join('; ')) + ' ';
        for (i = 0; i < non_moves.length; i++){
            results = run_sequence(fen, non_moves[i]);
            log("non-move", non_moves[i], results);
            if (results[results.length - 1]  & 1){
                messages.push(non_moves[i] + " fails to fail");
            }
        }
    }
    var state = p4_fen2state(fen);
    var fen2 = p4_state2fen(state);
    if (fen != fen2){
        log(fen, "and", fen2, "differ");
        tstr += 'Fen fails round trip: ' + highlight(fen2) + ' ';
        messages.push(fen2 + " differs!");
    }
    var success = messages.length == 0;
    var msg = (success) ? 'OK' : msg_list(messages);
    return [success, tstr, msg];
});

register_test_fn('result_in_n', function(fen, result, n, depth, treeclimber){
    var i, msg;
    var tstr = 'Fen: ' + fenlink(fen) + ', depth ' + depth;
    var state = p4_fen2state(fen);
    var f = {
        checkmate: [P4_MOVE_CHECKMATE, P4_MOVE_CHECKMATE],
        stalemate: [P4_MOVE_STALEMATE, P4_MOVE_CHECKMATE]
    }[result];
    var wanted_flags = f[0];
    var mask = f[1];
    var ok = false;
    if (treeclimber !== undefined) {
        state.treeclimber = P4_EXTRA_TREECLIMBERS[treeclimber];
    }
    for (i = 0; i < n * 2; i++){
        var mv = p4_findmove(state, depth);
        var r = p4_move(state, mv[0], mv[1]);
        if ((r.flags & mask) == wanted_flags){
            ok = true;
        }
    }
    if (treeclimber !== undefined) {
        state.treeclimber = p4_alphabeta_treeclimber;
    }
    return [ok, tstr, msg = ok ? 'OK' : 'fails'];
});

register_test_fn('count_moves', function(fen, ply, expected){
    log(fen);
    var tstr = 'Fen: ' + fenlink(fen) + ', ply ' + ply + ' expecting ' + expected;
    var state = p4_fen2state(fen);
    p4_prepare(state);
    var nodes = p4_counting_treeclimber(state, ply - 1, state.to_play, 0, 0, 0);
    tstr += '; got ' + nodes;
    if (nodes == expected)
        return  [true, tstr, 'OK'];
    return [false, tstr, nodes + ' != ' + expected + " (diff " + (nodes - expected) + ")"];
});


function run_tests(tests) {
    announce("Working... (" + tests.length + " tests)");
    var i;
    var good = 0;
    var start = Date.now();
    for (i = 0; i < tests.length; i++){
        var t = tests[i];
        var desc = t.shift();
        log("starting " + desc);
        log(t);
        var f = TEST_FUNCTIONS[t.shift()];
        var r = f.apply(undefined, t);
        print_result.apply(desc, r);
        if(r[0]) {
            good++;
        } else {
            log("FAILED " + desc);
        }
    }
    var elapsed = (Date.now() - start) / 1000;
    announce("Passed " + good + " out of " + tests.length +
             " tests in " + elapsed + " seconds");
}

const KNOWN_TESTS = {
    autotests:    'auto-test-tests.json',
    check:        'auto-test-check.json',
    treeclimbers: 'auto-test-treeclimbers.json'
};


function load_named_tests(name) {
    var src = KNOWN_TESTS[name];
    if (src !== undefined) {
        fetch(src).then(response => response.json())
            .then(data => {
                run_tests(data);
            });
    } else {
        announce("unknown tests: " + name);
    }
}

