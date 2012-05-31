#!/usr/bin/seed
/* For seed command-line use, but it might work elsewhere.
 * https://live.gnome.org/Seed
 * */
var SRC_DIR = Seed.spawn('git rev-parse --show-toplevel').stdout.trim() + '/src';

if (this.Seed){
    Seed.include(SRC_DIR + '/engine.js');
    Seed.include(SRC_DIR + '/fen-test.js');
}

function benchmark(n){
    var r = mixed_benchmark_core(n);
    print("total " + r.cumulative + " avg " + parseInt(r.mean) +
          ' median ' + r.median);
}

benchmark(3);
