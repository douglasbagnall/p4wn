function new_child(element, childtag){
    var child = document.createElement(childtag);
    element.appendChild(child);
    return child;
}

function print_result(ok, tstr, msg){
    var i;
    var div = document.getElementById("messages");
    var p = new_child(div, 'div');
    p.innerHTML = '<h3>' + this + '</h3>' + tstr + ' <b>' + msg + '</b>';
    p.className = ok ? 'pass' : 'fail';
}

function announce(msg) {
    var h1 = document.getElementById("heading");
    h1.innerHTML = msg;
}

function log (msg) {
    console.log(msg);
}

function highlight(msg) {
    return "<i>" + msg + "</i>";
}

function fenlink(fen){
    return ('<i><a href="fen-test.html?start=' +
            fen +
            '&player=both">' + fen + '</a></i>');
}

function msg_list(msgs) {
    return msgs.join('<br>');
}

function load_tests() {
    var i;
    var query = window.location.search.substring(1);
    if (query.length == 0) {
        load_named_tests('autotests');
    }
    else {
        load_named_tests(query);
    }
}

