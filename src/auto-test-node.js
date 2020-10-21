const fs = require('fs');

var announce = console.log;
var log = console.log;

function print_result(ok, tstr, msg){
    console.log(ok, tstr, msg);
}

function msg_list(msgs) {
    return msgs;
}

function fenlink(x) {return x};
function highlight(x) {return x};


function load_named_tests(name) {
    var src = KNOWN_TESTS[name];
    if (src === undefined) {
        announce("unknown tests: " + name);
        return false;
    }
    let s = fs.readFileSync(__dirname + '/' + src);
    let data = JSON.parse(s);
    let ok = run_tests(data);
    return ok;
}

function load_tests() {
    var tests = process.argv[2];
    if (tests === undefined) {
        tests = 'autotests';
    }
    let ok = load_named_tests(tests);
    if (! ok) {
        process.exit(1);
    }
}


load_tests();
