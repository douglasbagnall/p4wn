#!/usr/bin/seed
/* For seed command-line use, but it might work elsewhere.
 * https://live.gnome.org/Seed
 * */
if (this.Seed){
    Seed.include('engine.js');
    Seed.include("fen-test.js");
}

function benchmark(n){
    var r = mixed_benchmark_core(n);
    print("total " + r.cumulative + " avg " + parseInt(r.mean) +
          ' median ' + r.median);
}

benchmark(3);
