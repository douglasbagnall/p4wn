var FEN = [
    "r3kb1r/ppBnp1pp/5p2/1N1n1b2/2BP4/5NP1/P4P1P/R1R3K1 b kq - 1 16",
    "r3kb1r/1pBnp1pp/p4p2/1N1n1b2/2BP4/5NP1/P4P1P/R1R3K1 w kq - 0 17",
    "4k3/4n3/8/3N1R2/4R2p/7P/1r3BK1/8 b - - 6 42",
    "4p3/8/8/8/8/k6P/6K1/8 b - - 6 42", //empty, impossible pawn
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1",  //beginning
    "rn1qkbnr/p1p1pppp/8/1pPp4/3P1B2/8/PP2PPPP/Rb1QKBNR w KQkq b6 0 5",//en passant
    "rnbqkbnr/pppppppp/nnnnnnnn/PPPPPPPP/pppppppp/NNNNNNNN/PPPPPPPP/RNBQKBNR w KQkq - 1 1", //excessive
    "8/p2p1N2/8/4p2k/1p2P1Pp/1P1b3K/P6P/n7 b - g3 0 32",
    "8/8/8/8/8/4K3/5Q2/7k w - - 11 56", //stalemate, checkmate
    "rnb1r1k1/ppp2ppp/8/8/2PN4/2Nn4/P3BPPP/R3K2R w KQ - 5 14",
    "r6r/p3kp1p/4np2/1Bb5/3p4/P4N2/1P3PPP/R3K2R w KQ - 2 18", //github issue 4, castling
    "r3k2Q/pp3p1p/3qp3/2pp2N1/3P4/4PP2/PP1K2PP/nNB4R b k - 0 15", //github issue 5, castling
    "8/p2P1N2/8/4p2k/1p2P3/1P1b2pK/P6P/n7 w - - 0 33",
    "4kb1R/1p1np1P1/2B2p2/1N1P1b2/8/5NK1/p3rP1p/8 w - - 0 31", //queening opportunities
    "5k2/8/5K2/4Q3/5P2/8/8/8 w - - 3 61" //mate in 1
];


function time_find_move(depth){
    var N = 3;
    var state = input.board_state;
    var best = 1e999;
    for (var i = 0; i < N; i++){
        var start_time = Date.now();
        var mv = p4_findmove(state, depth);
        var end_time = Date.now();
        var delta = end_time - start_time;
        console.log("depth", depth, "run", i, "took", delta);
        if (delta < best)
            best = delta;
    }
    var div = document.getElementById("log");
    var item = new_child(div, "div");
    item.innerHTML = "depth " + depth + " best of " + N + ": " + best;
}

function parse_test(){
    var state = input.board_state;
    p4_prepare(state);
    var p = p4_parse(state, state.to_play, state.enpassant, state.castles, 0);
    console.log("found", p.length, "moves");
    var current_start = undefined;
    var current_piece = undefined;
    for (var i = 0; i < p.length; i++){
        var mv = p[i];
        if (mv[1] != current_start){
            current_start = mv[1];
            current_piece = state.board[mv[1]];
        }
        console.log('  PpRrNnBbKkQq'.charAt(current_piece), p4_stringify_point(mv[1]),
                    p4_stringify_point(mv[2]));
    }
}

var TEST_BUTTONS = [
    {
        label: "speed test",
        onclick: function(e){
            time_find_move(4);
        }
    },
    {
        label: "parse test",
        onclick: function(e){
            parse_test();
        }
    },

];

write_controls_html(TEST_BUTTONS);


function write_fen_switches(){
    var div = document.getElementById("fen_switch");
    for (var i = 0; i < FEN.length; i++){
        var span = new_child(div, "div");
        var fen = FEN[i];
        span.id = 'fen_' + i;
        span.className = 'control-button';
        span.innerHTML = fen;
        span.addEventListener("click",
                              function(s){
                                  return function(e){
                                      var div = document.getElementById("log");
                                      var item = new_child(div, "div");
                                      item.innerHTML = '--------';
                                      p4_fen2state(s, input.board_state);
                                      refresh(0);
                                      var s2 = p4_state2fen(input.board_state);
                                      if (s == s2){
                                          console.log(s, "survives round trip");
                                      }
                                      else {
                                          console.log(s, "and", s2, "differ");
                                      }
                                      next_move();
                                  };
                              }(fen));

    }
}

write_fen_switches();
p4_fen2state(FEN[0], input.board_state);
refresh(0);
next_move();
