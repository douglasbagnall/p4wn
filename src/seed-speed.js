#!/usr/bin/seed

imports.searchPath.unshift(".");
var engine = imports.engine;

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
    ["castling; various checks", "r3k2r/p4p1p/4np2/1Bb5/3p4/P3nN2/1P3PPP/R3K2R w KQkq - 2 18"]
];


function mixed_benchmark(){
    var cumulative = 0;
    var count = 0;
    var scores = [];
    for (var i = 0; i < FEN.length; i++){
        var ply = FEN[i][2];
        if (ply === undefined)
            continue;
        var fen = FEN[i][1];
        var desc = FEN[i][0];
        var state = engine.p4_fen2state(fen);
        var best = 1e999;
        var all_times = [];
        for (var j = 0; j < 3; j++){
            var start = Date.now();
            state.findmove(ply, state.to_move, state.ep);
            var elapsed = Date.now() - start;
            if (elapsed < best)
                best = elapsed;
            all_times.push(elapsed);
        }
        cumulative += best;
        print([ply, all_times, desc]);
        count++;
        scores.push(best);
    }
    scores.sort(function(a, b){return a - b});
    print(scores);
    var n = scores.length;
    var median;
    if (n & 1){
        median = scores[(n - 1) / 2];
    }
    else{
        median = (scores[n / 2] + scores[n / 2 - 1]) / 2;
    }
    print("total " + cumulative + " avg " + parseInt(cumulative / count) + ' median ' + median);
}

mixed_benchmark();
