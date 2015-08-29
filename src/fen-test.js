var FEN = [
    ["mid game benchmark, white to play", "r3kb1r/1pBnp1pp/p4p2/1N1n1b2/2BP4/5NP1/P4P1P/R1R3K1 w kq - 0 17", 6],
    ["initial state", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1", 5],
    ["checkmate in 6", "8/8/8/8/8/4K3/5Q2/7k w - - 11 56", 7],
    ["checkmate in 1", "8/8/8/8/8/6K1/4Q3/6k1 w - - 21 61"],
    ["github issue 4, castling (slow search)", "r6r/p3kp1p/4np2/1Bb5/3p4/P4N2/1P3PPP/R3K2R w KQ - 2 18", 5],
    ["github issue 4, no castling", "r6r/p3kp1p/4np2/1Bb5/3p4/P4N2/1P3PPP/R3K2R w - - 2 18", 5],
    ["mid game benchmark, black to play", "r3kb1r/ppBnp1pp/5p2/1N1n1b2/2BP4/5NP1/P4P1P/R1R3K1 b kq - 1 16"],
    ["late game, rook pins bishop", "4k3/4n3/8/3N1R2/4R2p/7P/1r3BK1/8 b - - 6 42", 6],
    ["end game, impossible pawn", "4p3/8/8/8/8/k6P/6K1/8 b - - 6 42", 8],
    ["en passant", "rn1qkbnr/p1p1pppp/8/1pPp4/3P1B2/8/PP2PPPP/Rb1QKBNR w KQkq b6 0 5", 5],
    ["too many pieces", "rnbqkbnr/pppppppp/nnnnnnnn/PPPPPPPP/pppppppp/NNNNNNNN/PPPPPPPP/RNBQKBNR w KQkq - 1 1"],
    ["en passant", "rnb1r1k1/ppp2ppp/8/8/2PN4/2Nn4/P3BPPP/R3K2R w KQ - 5 14", 6],
    ["github issue 5, castling", "r3k2Q/pp3p1p/3qp3/2pp2N1/3P4/4PP2/PP1K2PP/nNB4R b k - 0 15", 6],
    ["late-ish", "8/p2P1N2/8/4p2k/1p2P3/1P1b2pK/P6P/n7 w - - 0 33", 6],
    ["queening opportunities", "4kb1R/1p1np1P1/2B2p2/1N1P1b2/8/5NK1/p3rP1p/8 w - - 0 31", 6],
    ["mate in 1", "5k2/8/5K2/4Q3/5P2/8/8/8 w - - 3 61"],
    ["incomplete FEN, stalemate", "rn2k1nr/pp4pp/3p4/q1pP4/P1P2p1b/1b2pPRP/1P1NP1PQ/2B1KBNR w Kkq -"],
    ["stalemate", "5bnr/4p1pq/4Qpkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR b KQ - 0 10"],
    ["stalemate in 1 (Qxe6)", "5bnr/4p1pq/2Q1ppkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR w KQ - 0 10"],
    ["rook & king", "8/7K/8/8/8/8/R7/7k w - - 0 1", 8],
    ["zugzwang", "8/8/p1p5/1p5p/1P5p/8/PPP2K1p/4R1rk w - - 0 1", 7],
    ["earlyish", "rnq1nrk1/pp3pbp/6p1/3p4/3P4/5N2/PP2BPPP/R1BQK2R w KQ -", 4],
    ["checkmate in 2", "4kb2/3r1p2/2R3p1/6B1/p6P/P3p1P1/P7/5K2 w - - 0 36"],
    ["“leonid's position”", "q2k2q1/2nqn2b/1n1P1n1b/2rnr2Q/1NQ1QN1Q/3Q3B/2RQR2B/Q2K2Q1 w - -", 4],
    ["insufficient material", "8/7K/8/8/8/8/N7/7k w - - 40 40", 8],
    ["sufficient material - knight", "8/7K/8/5n2/8/8/N7/7k w - - 40 40", 8],
    ["insufficient material - bishops", "8/6BK/7B/6b1/7B/8/1B6/7k w - - 40 40", 8],
    ["sufficient material - opposing bishops", "8/6BK/7B/6b1/7B/8/B7/7k w - - 40 40", 8],
    ["sufficient material", "8/7K/8/8/7B/8/N7/7k w - - 40 40", 8],
    ["castling; various checks", "r3k2r/p4p1p/4np2/1Bb5/3p4/P3nN2/1P3PPP/R3K2R w KQkq - 2 18"],
    ["Adrian Dușa's en-passant position", "r2k3B/ppp2p1p/7n/3p4/8/1P3N2/P4qP1/4RRK1 w q - 0 17", 6],
    ["Adrian Dușa's position, no castling", "r2k3B/ppp2p1p/7n/3p4/8/1P3N2/P4qP1/4RRK1 w - - 0 17", 6],
    ["Adrian Dușa's continuation", "r7/pp1k1p1p/5B1n/2pp4/8/1P3N2/P4RP1/4R1K1 w q - 3 19", 6],
    ["blatantly false castling claims", "8/7K/8/8/8/8/q7/7k w KQq - 40 40", 8]
];


function time_find_move(game, depth){
    var N = 7, i;
    var max_milliseconds = 10000;
    var state = game.board_state;
    var best = 1e999;
    var start_run = Date.now();
    for (i = 0; i < N; i++){
        var start_time = Date.now();
        var mv = p4_findmove(state, depth);
        var end_time = Date.now();
        var delta = end_time - start_time;
        p4_log("depth", depth, "run", i, "took", delta);
        if (delta < best)
            best = delta;
        if (end_time - start_run > max_milliseconds){
            i++;
            break;
        }
    }
    game.log((depth + 1) + " ply; best of " + i + ": " + best);
}

function parse_test(state){
    p4_prepare(state);
    var moves = p4_parse(state, state.to_play, state.enpassant, 0);
    p4_log("found", moves.length, "moves");
    var current_start = undefined;
    var current_piece = undefined;
    for (var i = 0; i < moves.length; i++){
        var mv = moves[i];
        if (mv[1] != current_start){
            current_start = mv[1];
            current_piece = state.board[mv[1]];
        }
        p4_log('  PpRrNnBbKkQq'.charAt(current_piece), p4_stringify_point(mv[1]),
             p4_stringify_point(mv[2]));
    }
}

var WEIGHTS_OVERLAYS = [
    "none", undefined, 0,
    "W pawn", 'weights', 2,
    "B pawn", 'weights', 3,
    "W rook", 'weights', 4,
    "B rook", 'weights', 5,
    "W knight", 'weights', 6,
    "B knight", 'weights', 7,
    "W bishop", 'weights', 8,
    "B bishop", 'weights', 9,
    "W king", 'weights', 10,
    "B king", 'weights', 11,
    "W queen", 'weights', 12,
    "B queen", 'weights', 13
];

var __weights_overlay_index = 0;

function weights_update(p4d, delta, element){
    if (delta == undefined)
        delta = 0;
    p4_prepare(p4d.board_state);
    var i;
    var w = WEIGHTS_OVERLAYS;
    var j = (__weights_overlay_index + delta * 3) % w.length;
    __weights_overlay_index = j;
    var pieces = p4d.elements.pieces;
    if (w[j + 1] !== undefined){
        var overlay = p4d.board_state[w[j + 1]][w[j + 2]];
        var knee = P4_VALUES[P4_PAWN];
        for (i = 0; i < 120; i++){
            var el = pieces[p4d.orientation ? 119 - i : i];
            if (el === undefined)
                continue;
            var scaled = parseInt((overlay[i]) / knee * 255);
            var r = 51 + parseInt(scaled * 204 / 255);
            if (scaled < 0){
                var b = -8 * overlay[i];
                el.style.backgroundColor = 'rgb(' + r + ',0,' + b + ')';
            }
            else if (scaled < 256){
                el.style.backgroundColor = 'rgb(' + r +','  + scaled + ',0)';
            }
            else {
                p4_log(scaled);
                scaled = parseInt(Math.min(255, scaled / 4));
                el.style.backgroundColor = 'rgb(255,255,' + scaled + ')';
            }
        }
    }
    else {
        for (i = 0; i < 120; i++){
            var el = pieces[p4d.orientation ? 119 - i : i];
            if (el !== undefined)
                el.style.backgroundColor = 'transparent';
        }
    }
    if (element !== undefined)
        element.innerHTML = "weights overlay: " + w[j] + '</b>';
}


/*some debugging functions */
function p4_dump_board(_board, name){
    if (name !== undefined)
        p4_log(name);
    var board = [];
    for (var i = 0; i < 120; i++){
        board[i] = _board[i];
    }
    for (var y = 9; y >= 2; y--){
        var s = y * 10;
        p4_log(board.slice(s + 1, s + 9));
    }
}

function p4_dump_state(state){
    var wt_strings = ['', '',
                      'W pawn', 'B pawn',
                      'W rook', 'B rook',
                      'W knight', 'B knight',
                      'W bishop', 'B bishop',
                      'W king', 'B king',
                      'W queen', 'B queen'];
    for (var i = 2; i < 14; i++){
        p4_dump_board(state.weights[i], wt_strings[i]);
    }
    p4_dump_board(state.board, 'board');
    p4_dump_board(P4_CENTRALISING_WEIGHTS, 'centralising weights');
    p4_dump_board(P4_BASE_PAWN_WEIGHTS, 'base pawn weights');
    p4_dump_board(P4_KNIGHT_WEIGHTS, 'base knight weights');
    var attr;
    for (attr in state){
        if (! /weights|board$/.test(attr))
            p4_log(attr, state[attr]);
        else
            p4_log(attr, "board array", state[attr].length);
    }
}


var TEST_BUTTONS = [
    {/*dump state -- debug only */
        label: 'dump state',
        onclick_wrap: function(p4d){
            return function(e){
                p4_dump_state(p4d.board_state);
            };
        },
        debug: true
    },
    {/*dump FEN -- debug only */
        label: 'dump FEN',
        onclick_wrap: function(p4d){
            return function(e){
                p4_log(p4_state2fen(p4d.board_state));
            };
        },
        debug: true
    },
    {
        label: " 5-ply speed",
        onclick_wrap: function(p4d){
            return  function(e){
                time_find_move(p4d, 4);
            };
        }
    },
    {
        label: "6-ply speed",
        onclick_wrap: function(p4d){
            return  function(e){
                time_find_move(p4d, 5);
            };
        }
    },
    {
        label: "7-ply speed",
        onclick_wrap: function(p4d){
            return  function(e){
                time_find_move(p4d, 6);
            };
        }
    },
    {
        label: "8-ply speed",
        onclick_wrap: function(p4d){
            return  function(e){
                time_find_move(p4d, 7);
            };
        }
    },
    {
        label: "mixed benchmark",
        onclick_wrap: function(p4d){
            return  function(e){
                mixed_benchmark(p4d);
            };
        }
    },
    {
        label: "parse test",
        onclick_wrap: function(p4d){
            return  function(e){
                parse_test(p4d.board_state);
            };
        }
    },
    {
        label: "reset RNG",
        onclick_wrap: function(p4d){
            return  function(e){
                p4_random_seed(p4d.state, 1);
            };
        }
    },
    {
        onclick_wrap: function(p4d){
            return function(e){
                weights_update(p4d, 1, _event_target(e));
            };
        },
        refresh: function(el){
            weights_update(this, 0, el);
        },
        move_listener_wrap: function(p4d){
            return function(){
                weights_update(p4d, 0);
            };
        }
    }
];

function write_fen_switches(p4d){
    var div = p4d_new_child(p4d.elements.container, "div", 'p4wn-fen-switches');
    div.innerHTML = '<h3>Load FEN</h3>';
    for (var i = 0; i < FEN.length; i++){
        var span = p4d_new_child(div, "div");
        var fen = FEN[i];
        span.id = 'fen_' + i;
        span.className = 'p4wn-control-button';
        span.innerHTML = '<b>' + fen[0] + '</b> ' + fen[1];
        fen = fen[1];
        _add_event_listener(span, "click",
                            function(s){
                                return function(e){
                                    p4d.log('--------');
                                    p4_fen2state(s, p4d.board_state);
                                    p4_prepare(p4d.board_state); //so dump_state(), etc work
                                    p4d.refresh();
                                    var s2 = p4_state2fen(p4d.board_state);
                                    if (s == s2){
                                        p4_log(s, "survives round trip");
                                    }
                                    else {
                                        p4_log(s, "and", s2, "differ");
                                    }
                                    p4d.next_move();
                                };
                            }(fen));
    }
}

function mixed_benchmark(p4d){
    var r = mixed_benchmark_core(1, p4d.board_state.treeclimber);
    p4d.log("total " + r.cumulative + " avg " + parseInt(r.mean) +
            ' median ' + r.median);
}

function mixed_benchmark_core(iterations, treeclimber){
    var cumulative = 0;
    var count = 0;
    var scores = [];
    for (var i = 0; i < FEN.length; i++){
        var ply = FEN[i][2];
        if (ply === undefined)
            continue;
        var fen = FEN[i][1];
        var desc = FEN[i][0];
        var best = 1e999;
        var all_times = [];
        for (var j = 0; j < iterations; j++){
            var state = p4_fen2state(fen);
            if (treeclimber !== undefined)
                state.treeclimber = treeclimber;
            var start = Date.now();
            state.findmove(ply, state.to_move, state.ep);
            var elapsed = Date.now() - start;
            if (elapsed < best)
                best = elapsed;
            all_times.push(elapsed);
        }
        cumulative += best;
        p4_log([ply, all_times, desc]);
        count++;
        scores.push(best);
    }
    scores.sort(function(a, b){return a - b});
    p4_log(scores);
    var n = scores.length;
    var median;
    if (n & 1){
        median = scores[(n - 1) / 2];
    }
    else{
        median = (scores[n / 2] + scores[n / 2 - 1]) / 2;
    }
    return {cumulative: cumulative,
            mean: cumulative / count,
            median: median,
            count: count
           };
}
