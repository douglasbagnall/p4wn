#!/usr/bin/node
/* Uses node.js, whether it likes it or not. */
/*argv[0] is /usr/bin/node, [1] is this script */
var SRC_DIR = process.argv[1].replace(/[^\/]+$/, '../src');

var fs = require('fs');
eval(fs.readFileSync(SRC_DIR + '/engine.js').toString());
eval(fs.readFileSync(SRC_DIR + '/fen-test.js').toString());

/*console.warn uses stderr */
p4_log = function(){console.warn.apply(console, arguments);};

function benchmark(n){
    var r = mixed_benchmark_core(n);
    console.log("total " + r.cumulative + " avg " + parseInt(r.mean) +
                ' median ' + r.median);
}

benchmark(3);
