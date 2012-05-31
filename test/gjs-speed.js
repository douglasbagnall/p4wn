#!/usr/bin/gjs
/* gjs command line script*/

/* I don't know a simple way to get the scripts directory or spawn a
process in gjs, so let's pretend you always run this from somewhere
around here */
imports.searchPath.unshift('../src', './src');

function merge_modules(dest, src){
    var x;
    for (x in src){
        if (src.hasOwnProperty(x)){
            dest[x] = src[x];
        }
    }
}

var engine = imports.engine;
var fentest = imports['fen-test'];
merge_modules(fentest, engine);

function benchmark(n){
    var r = fentest.mixed_benchmark_core(n);
    print("total " + r.cumulative + " avg " + parseInt(r.mean) +
          ' median ' + r.median);
}

benchmark(3);
