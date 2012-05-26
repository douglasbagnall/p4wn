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
        "castling knight on 3rd row",
        fen_moves, "r3k2r/p4p1p/4np2/1Bb5/3p4/P3nN2/1P3PPP/R3K2R w KQkq - 2 18",
        undefined, ['O-O-O', 'O-O']
     ],
    [
        "castling knight on 2nd row",
        fen_moves, "r3k2r/p4p1p/4np2/B1b5/3p4/P3pN2/Pn3PPP/R3K2R w KQkq - 2 18",
        ['O-O'], ['O-O-O']
     ],
    [
        "initial board",
        fen_moves, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1",
        [['Nc3', 'e6']],
        [['Nd3'], ['e3', 'e4']]
    ],
    [
        "mate in 1",
        result_in_n, "5k2/8/5K2/4Q3/5P2/8/8/8 w - - 3 61",
        'checkmate', 1
    ],
    [
        "mate in 6",
        result_in_n, "8/8/8/8/8/4K3/5Q2/7k w - - 11 56",
        'checkmate', 6
    ],
    [
        "mate in 3",
        result_in_n, "8/8/8/8/8/4K3/5Q2/7k w - - 11 56",
        'checkmate', 6, 5
    ],
    [
        "mate in 1",
        result_in_n, "4kb1R/1p1np1P1/2B2p2/1N1P1b2/8/5NK1/p3rP1p/8 w - - 0 31",
        'checkmate', 1
    ],
    [
        "count moves, initial board",
        count_moves, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1",
        1, 20
    ],
    [
        "count moves, initial board",
        count_moves, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1",
        2, 400
    ],
    [
        "count moves, initial board",
        count_moves, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1",
        3, 8902
    ],
    [
        "count moves, initial board",
        count_moves, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1",
        4, 197281
    ],
    [
        "count moves, complex board",
        count_moves, "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -",
        1, 48
    ],
    [
        "count moves, complex board",
        count_moves, "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -",
        2, 2039
    ],
    [
        "count moves, complex board",
        count_moves, "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -",
        3, 97862
    ],
    [
        "count moves, complex board",
        count_moves, "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -",
        4, 4085603
    ],
    [
        "count moves, in check, promotions",
        count_moves, "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
        2, 264
    ],
    [
        "count moves, in check, promotions",
        count_moves, "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
        3, 9467
    ],
    [
        "count moves, in check, promotions",
        count_moves, "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
        4, 422333
    ],
    [
        "count moves, emptyish board",
        count_moves, "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -",
        2, 191
    ],
    [
        "count moves, emptyish board",
        count_moves, "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -",
        3, 2812
    ],
    [
        "count moves, emptyish board",
        count_moves, "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -",
        4, 43238
    ],
    [
        "count moves, emptyish board",
        count_moves, "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -",
        5, 674624
    ],
    [
        "count moves, checkmate near",
        count_moves, "8/3K4/2p5/p2b2r1/5k2/8/8/1q6 b - 1 67",
        2, 279
    ]
];
main(TESTS);
