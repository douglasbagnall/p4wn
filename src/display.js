/* p4wn, AKA 5k chess - by Douglas Bagnall <douglas@paradise.net.nz>
 *
 * This code is in the public domain, or as close to it as various
 * laws allow. No warranty; no restrictions.
 *
 * lives at http://p4wn.sf.net/
 */

/* The routines here draw the screen and handle user interaction */

var input = {
    start: 0,     // start click - used in display.js
    inhand: 0,     // piece in hand (ie, during move)
    board_state: new_game(),
    players: ['human', 'computer'] //[white, black] controllers
};

var IMAGE_NAMES = [
    'images/empty.gif',
    'images/empty.gif',   // 1 is unused
    'images/white_pawn.gif',
    'images/black_pawn.gif',
    'images/white_rook.gif',
    'images/black_rook.gif',
    'images/white_knight.gif',
    'images/black_knight.gif',
    'images/white_bishop.gif',
    'images/black_bishop.gif',
    'images/white_king.gif',
    'images/black_king.gif',
    'images/white_queen.gif',
    'images/black_queen.gif'
];

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
        if(move_result & MOVE_FLAG_OK){
            display_move_text(state.moveno, input.start, square, move_result);
            refresh();
            show_piece_in_hand(0); //blank moving
            input.inhand = 0;
            input.start = 0;
            auto_play_timeout_ID = undefined;
            if (! (move_result & MOVE_FLAG_MATE))
                next_move();
        }
    }
}


var auto_play_timeout_ID;

function next_move(){
    var state = input.board_state;
    var mover = state.to_play;
    if (input.players[mover] == 'computer' &&
        auto_play_timeout_ID === undefined){
        var timeout = (input.players[1 - mover] == 'computer') ? 500: 10;
        auto_play_timeout_ID = window.setTimeout(computer_move, timeout);
    }
}

function computer_move(){
    auto_play_timeout_ID = undefined;
    var state = input.board_state;
    var s, e, mv;
    mv = findmove(state, 3);
    s = mv[0], e = mv[1];
    var move_result = move(state, s, e);
    if (move_result){
        display_move_text(state.moveno, s, e, move_result);
        refresh();

        if (! (move_result & MOVE_FLAG_MATE))
            next_move();
    }
    else
        console.log("no good move!", s, e);
}




//*******************************shift & display

function stringify_point(p){
    var letters = " abcdefgh";
    var x = p % 10;
    var y = (p - x) / 10 - 1;
    return letters.charAt(x) + y;
}


function display_move_text(moveno, s, e, flags){
    var mn;
    console.log(moveno, s, e, flags);
    if ((moveno & 1) == 0){
        mn = '    ';
    }
    else{
        mn = ((moveno >> 1) + 1) + ' ';
        while(mn.length < 4)
            mn = ' ' + mn;
    }
    var div = document.getElementById("log");
    var item = new_child(div, "div");

    var tail = '';
    if (flags & MOVE_FLAG_CHECK)
        tail = (flags & MOVE_FLAG_MATE) ? ' #' : ' +';
    else if (flags & MOVE_FLAG_MATE)
        tail = ' stalemate';

    var msg;
    if (flags & MOVE_FLAG_CASTLE_QUEEN)
        msg = 'O-O-O';
    else if (flags & MOVE_FLAG_CASTLE_KING)
        msg = 'O-O';
    else
        msg = stringify_point(s) + ((flags & MOVE_FLAG_CAPTURE) ? 'x' : '-') + stringify_point(e);

    item.innerHTML = mn + msg + tail;
    item.id = "move_" + moveno;
    item.className = "log_move";
    item.addEventListener("click",
                          function (n){
                              return function(e){
                                  goto_move(n);
                              };
                          }(moveno),
                          true);
}

function goto_move(n){
    jump_to_moveno(input.board_state, n);
    var div = document.getElementById('log');
    var entries = div.childNodes;
    for (var i = entries.length - 1; i >= n; i--){
        div.removeChild(entries[i]);
    }
    refresh();
    next_move();
}


//refresh: redraw screen from board, from colour's point of view

function refresh(colour){
    if (colour)
        input.orientation = colour;
    for (var i = 20; i < 100; i++){
        if(input.board_state.board[i] != EDGE)
            show_image(i, input.board_state.board[i]);
    }
}

function show_image(img, piece){
    var id = "i" + (input.player ? 119 - img : img);
    var e = document.getElementById(id);
    if (e)
        e.src = IMAGE_NAMES[piece];
}

function show_piece_in_hand(piece){
    var im = document.getElementById('pih');
    im.src = IMAGE_NAMES[piece];
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
            img.src = IMAGE_NAMES[0];
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
    },
    {
        label: 'dump state',
        id: 'dump_button',
        onclick: function(e){
            dump_state(input.board_state);
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
