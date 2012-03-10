/* p4wn, AKA 5k chess - by Douglas Bagnall <douglas@paradise.net.nz>
 *
 * This code is in the public domain, or as close to it as various
 * laws allow. No warranty; no restrictions.
 *
 * lives at http://p4wn.sf.net/
 *
 * Additional work by: [add yourself if you wish]
 *
 *  Chris Lear
 */

/* The routines here draw the screen and handle user interaction */

var GAMEOVER = false;
var going=0;    // DEV: denotes auto play, or not.

var input = {
    start: 0,     // start click - used in display.js
    inhand: 0,     // piece in hand (ie, during move)
    board_state: board_state(),
    players: ['human', 'computer'] //[white, black] controllers
};


function square_clicked(square){
    var state = input.board_state;
    var board = state.board;
    var mover = state.to_play;
    if (input.players[mover] == 'computer'){
        console.log("not your turn!");
        return;
    }
    var piece = board[square];
    if (input.start == square){
        //clicked back on previously chosen piece -- putting it down again
        show_piece_in_hand(0);
        show_image(input.start, input.inhand);
        input.inhand = 0;
        input.start = 0;
    }
    else if (piece && (mover == (piece & 1))){
        //clicked on player's colour, so it becomes start
        if (input.inhand)
            show_image(input.start, input.inhand); //put back old piece, if any
        input.inhand = piece;
        input.start = square;
        show_image(square, 0);
        show_piece_in_hand(piece);     //dragging piece
    }
    else if (input.inhand){
        // there is one in hand, so this is an attempted move
        //but is it valid?
        var move_result = move(state, input.start, square);
        if (move_result)
            display_move_text(state.moveno, input.start, square);

        if(move_result == 1){
            show_image(square, input.inhand);
            show_piece_in_hand(0); //blank moving
            input.inhand = 0;
            input.start = 0;
            next_move();
        }
        else { // failed to move. is it actually checkmate?
            if (move_result == 2)
                GAMEOVER = true;
        }
    }
}


var auto_play_timeout_ID;

function next_move(){
    if (GAMEOVER){
        return;
    }
    var state = input.board_state;
    var mover = state.to_play;
    if (input.players[mover] == 'computer'){
        var timeout = (input.players[1 - mover] == 'computer') ? 500: 10;
        auto_play_timeout_ID = window.setTimeout(computer_move, timeout);
    }
}

function computer_move(){
    var state = input.board_state;
    var s, e, mv;
    mv = findmove(state, 3);
    s = mv[0], e = mv[1];
    console.log(s, e);
    var move_result = move(state, s, e);
    display_move_text(state.moveno, s, e);

    for (var i = 20; i < 100; i++){
        show_image(i, state.board[i]);
    }

    if (move_result == 2)
        GAMEOVER = 1;
    next_move();
}




//*******************************shift & display

function stringify_point(p){
    var letters = " abcdefgh";
    var x = p % 10;
    var y = (p - x) / 10 - 1;
    return letters.charAt(x) + y;
}


function display_move_text(moveno, s, e){
    var mn;
    console.log(moveno);
    if ((moveno & 1) == 0){
        mn = '    ';
    }
    else{
        mn = ((moveno >> 1) + 1) + ' ';
        while(mn.length < 4)
            mn = ' ' + mn;
    }

    var msg = mn + stringify_point(s) + '-' + stringify_point(e) + "\n";

    var div = document.getElementById("log");
    div.innerHTML += msg;
}


//*******************************************redraw screen from board

function refresh(bw){
    input.player = bw;
    for (var z=0;z<OFF_BOARD;z++){
        if(input.board_state.board[z]<16)
            show_image(z,input.board_state.board[z]);
    }
}


//*********************************************drag piece


function show_image(img, src){
    var id = "i" + (input.player?119-img : img);
    var e = document.getElementById(id);
    if (e)
        e.src='images/' + src + '.gif';
}

function show_piece_in_hand(piece){
    var im = document.getElementById('pih');
    im.src = 'images/' + piece + '.gif';
    if (piece == 0){
        document.onmousemove = null;         //and switch off mousemove.
        im.style.top = '0px';
        im.style.left = '0px';
        im.style.visibility = 'hidden';
    }
    else {
        im.style.visibility = 'visible';
        document.onmousemove = function (e){
            im.style.left = (e.clientX + 1) + "px";
            im.style.top = (e.clientY - 4) + "px";
        };
    }
}


function click_closure(n){
    return function(e){
        square_clicked(input.player ? 119 - n : n);
    };
}

function new_child(element, childtag){
    var child = document.createElement(childtag);
    element.appendChild(child);
    return child;
}

function write_board_html(){
    var div = document.getElementById("board");
    var table = new_child(div, "table");
    for (var y = 90; y > 10; y-=10){
        var tr = new_child(table, "tr");
        for(var x = 1;  x < 9; x++){
            var z = y + x;
            var td = new_child(tr, "td");
            td.className = (x + (y / 10)) & 1 ? 'b' : 'w';
            var img = new_child(td, "img");
            img.id = "i" + z;
            img.addEventListener("click",
                                 click_closure(z),
                                 true);
            img.src = "images/0.gif";
            img.width= "30";
            img.height= "30";
        }
    }
}

var CONTROLS = [
    {
        label: 'swap sides',
        id: 'swap_button',
        onclick: function(e){
            console.log('clicked');
            var p = input.players;
            var tmp = p[0];
            p[0] = p[1];
            p[1] = tmp;
            next_move();
        }
    },
    {
        label: 'computer vs computer',
        id: 'cvc_button',
        onclick: function(e){
            input.players = ['computer', 'computer'];
            next_move();
        }
    },
    {
        label: 'human vs computer',
        id: 'hvc_button',
        onclick: function(e){
            var p = input.players;
            if (p[0] == p[1]){
                p[0] = 'human';
                p[1] = 'computer';
            }
            next_move();
        }
    },
    {
        label: 'human vs human',
        id: 'hvh_button',
        onclick: function(e){
            input.players = ['human', 'human'];
            next_move();
        }
    }
];


function write_controls_html(){
    var div = document.getElementById("controls");
    for (var i = 0; i < CONTROLS.length; i++){
        var o = CONTROLS[i];
        var span = new_child(div, "span");
        span.className = 'control-button';
        span.id = o.id;
        span.innerHTML = o.label;
        span.addEventListener("click",
                              o.onclick,
                              true);

    }
}

write_board_html();
write_controls_html();



refresh(0);
next_move();
