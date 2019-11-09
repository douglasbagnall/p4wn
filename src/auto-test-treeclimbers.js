var TESTS = [
    [
        "mate in 1",
        result_in_n, "5k2/8/5K2/4Q3/5P2/8/8/8 w - - 3 61",
        'checkmate', 1, 3
    ],
    [
        "mate in 1 nullmove",
        result_in_n, "5k2/8/5K2/4Q3/5P2/8/8/8 w - - 3 61",
        'checkmate', 1, 3,
        p4_nullmove_alphabeta_treeclimber
    ],
    [
        "mate in 1 negascout",
        result_in_n, "5k2/8/5K2/4Q3/5P2/8/8/8 w - - 3 61",
        'checkmate', 1, 3,
        p4_negascout_treeclimber
    ],
    [
        "mate in 1 negamax",
        result_in_n, "5k2/8/5K2/4Q3/5P2/8/8/8 w - - 3 61",
        'checkmate', 1, 3,
        p4_negamax_treeclimber
    ],
    [
        "mate in 6",
        result_in_n, "8/8/8/8/8/4K3/5Q2/7k w - - 11 56",
        'checkmate', 6, 3
    ],
    [
        "mate in 6 nullmove",
        result_in_n, "8/8/8/8/8/4K3/5Q2/7k w - - 11 56",
        'checkmate', 6, 3,
        p4_nullmove_alphabeta_treeclimber
    ],
    [
        "mate in 6 negascout",
        result_in_n, "8/8/8/8/8/4K3/5Q2/7k w - - 11 56",
        'checkmate', 6, 3,
        p4_negascout_treeclimber
    ],
    [
        "mate in 6 negamax",
        result_in_n, "8/8/8/8/8/4K3/5Q2/7k w - - 11 56",
        'checkmate', 6, 3,
        p4_negamax_treeclimber
    ],
    [
        "mate in 3",
        result_in_n, "8/8/8/8/8/4K3/5Q2/7k w - - 11 56",
        'checkmate', 6, 5
    ],
    [
        "mate in 3 nullmove",
        result_in_n, "8/8/8/8/8/4K3/5Q2/7k w - - 11 56",
        'checkmate', 6, 5,
        p4_nullmove_alphabeta_treeclimber
    ],
    [
        "mate in 1",
        result_in_n, "4kb1R/1p1np1P1/2B2p2/1N1P1b2/8/5NK1/p3rP1p/8 w - - 0 31",
        'checkmate', 1, 3
    ],
    [
        "mate in 1 nullmove",
        result_in_n, "4kb1R/1p1np1P1/2B2p2/1N1P1b2/8/5NK1/p3rP1p/8 w - - 0 31",
        'checkmate', 1, 3,
        p4_nullmove_alphabeta_treeclimber
    ],
    [
        "mate in 1 negascout",
        result_in_n, "4kb1R/1p1np1P1/2B2p2/1N1P1b2/8/5NK1/p3rP1p/8 w - - 0 31",
        'checkmate', 1, 3,
        p4_negascout_treeclimber
    ],
];
main(TESTS);
