#!/usr/bin/seed

Seed.include("fen-test.js");

function benchmark(){
    var r = mixed_benchmark_core(1);
    print("total " + r.cumulative + " avg " + parseInt(r.mean) +
          ' median ' + r.median);
}

benchmark();
