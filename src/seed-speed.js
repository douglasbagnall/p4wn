#!/usr/bin/seed

Seed.include("fen-test.js");

function benchmark(n){
    var r = mixed_benchmark_core(n);
    print("total " + r.cumulative + " avg " + parseInt(r.mean) +
          ' median ' + r.median);
}

benchmark(3);
