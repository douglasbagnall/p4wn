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
    board_state: p4_new_game(),
    players: ['human', 'computer'], //[white, black] controllers
    pawn_becomes: 0, //index into PROMOTIONS array
    computer_level: DEFAULT_LEVEL
};

var PROMOTIONS = ['queen', 'rook', 'knight', 'bishop'];

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
        var move_result = p4_move(state, input.start, square);
        if(move_result & P4_MOVE_FLAG_OK){
            display_move_text(state.moveno, input.start, square, move_result);
            refresh();
            show_piece_in_hand(0); //blank moving
            input.inhand = 0;
            input.start = 0;
            auto_play_timeout_ID = undefined;
            if (! (move_result & P4_MOVE_FLAG_MATE))
                next_move();
        }
    }
}

function update_promotions(state, name){
    for (var i = 0; i < 2; i++){
        if (input.players[i] == 'human')
            p4_set_pawn_promotion(state, i, name);
        else
            p4_set_pawn_promotion(state, i, undefined);
    }
}


var auto_play_timeout_ID;

function next_move(){
    var state = input.board_state;
    var mover = state.to_play;
    update_promotions(state, PROMOTIONS[input.pawn_becomes]);
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
    var depth = input.computer_level + 1;
    var start_time = Date.now();
    mv = p4_findmove(state, depth);
    var delta = Date.now() - start_time;
    console.log("findmove took", delta);
    if (ADAPTIVE_LEVELS && depth > 2){
        var min_time = 25 * depth;
        while (delta < min_time){
            depth++;
            mv = p4_findmove(state, depth);
            delta = Date.now() - start_time;
            console.log("retry at depth", depth, " total time:", delta);
        }
    }
    s = mv[0], e = mv[1];
    var move_result = p4_move(state, s, e);
    if (move_result){
        display_move_text(state.moveno, s, e, move_result);
        refresh();

        if (! (move_result & P4_MOVE_FLAG_MATE))
            next_move();
    }
    else
        console.log("no good move!", s, e);
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
    if (flags & P4_MOVE_FLAG_CHECK)
        tail = (flags & P4_MOVE_FLAG_MATE) ? ' #' : ' +';
    else if (flags & P4_MOVE_FLAG_MATE)
        tail = ' stalemate';

    var msg;
    if (flags & P4_MOVE_FLAG_CASTLE_QUEEN)
        msg = 'O-O-O';
    else if (flags & P4_MOVE_FLAG_CASTLE_KING)
        msg = 'O-O';
    else
        msg = p4_stringify_point(s) + ((flags & P4_MOVE_FLAG_CAPTURE) ? 'x' : '-') + p4_stringify_point(e);

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
    div.scrollTop = 999999;
}

function goto_move(n){
    p4_jump_to_moveno(input.board_state, n);
    var div = document.getElementById('log');
    var entries = div.childNodes;
    for (var i = entries.length - 1; i >= n; i--){
        div.removeChild(entries[i]);
    }
    refresh();
    next_move();
}


//refresh: redraw screen from board

function refresh(){
    for (var i = 20; i < 100; i++){
        if(input.board_state.board[i] != P4_EDGE)
            show_image(i, input.board_state.board[i]);
    }
}

function show_image(img, piece){
    var id = "i" + (input.orientation ? 119 - img : img);
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
        square_clicked(input.orientation ? 119 - n : n);
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
            td.addEventListener("click",
                                click_closure(z),
                                true);

            var img = new_child(td, "img");
            img.id = "i" + z;
            img.src = IMAGE_NAMES[0];
            img.width= SQUARE_WIDTH;
            img.height= SQUARE_HEIGHT;
        }
    }
    /*piece in hand indicator */
    var pih = new_child(document.body, 'img');
    pih.id = 'pih';
    pih.src = IMAGE_NAMES[0];
    pih.width= SQUARE_WIDTH;
    pih.height= SQUARE_HEIGHT;
}

function refresh_buttons(){
    for (var x in CONTROLS){
        var o = CONTROLS[x];
        if (o.refresh === undefined)
            continue;
        var e = document.getElementById(o.id);
        o.refresh(e);
    }
}

function maybe_rotate_board(){
    var p = input.players;
    if (p[0] != p[1] && ROTATE_BOARD){
        input.orientation = p[0] == 'computer' ? 1 : 0;
        refresh();
    }
}


var CONTROLS = [
    {
        id: 'toggle_white_button',
        onclick: function(e){
            input.players[0] = (input.players[0] == 'human') ? 'computer' : 'human';
            refresh_buttons();
            maybe_rotate_board();
            next_move();
        },
        refresh: function(el){
            if (input.players[0] == 'human')
                el.innerHTML = 'white <img src="images/human.png" alt="human">';
            else
                el.innerHTML = 'white <img src="images/computer.png" alt="computer">';
        }
    },
    {
        id: 'toggle_black_button',
        onclick: function(e){
            input.players[1] = (input.players[1] == 'human') ? 'computer' : 'human';
            refresh_buttons();
            maybe_rotate_board();
            next_move();
        },
        refresh: function(el){
            if (input.players[1] == 'human')
                el.innerHTML = 'black <img src="images/human.png" alt="human">';
            else
                el.innerHTML = 'black <img src="images/computer.png" alt="computer">';
        }
    },
    {
        id: 'swap_button',
        onclick: function(e){
            var p = input.players;
            var tmp = p[0];
            p[0] = p[1];
            p[1] = tmp;
            if (p[0] != p[1] && ROTATE_BOARD)
                input.orientation = 1 - input.orientation;

            refresh_buttons();
            maybe_rotate_board();
            next_move();
        },
        refresh: function(el){
            if (input.players[0] != input.players[1])
                el.innerHTML = '<b>swap</b>';
            else
                el.innerHTML = 'swap';
        }
    },
    {
        label: 'pawn becomes <b>' + PROMOTIONS[input.pawn_becomes] + '</b>',
        id: 'pawn_promotion_button',
        onclick: function(e){
            var x = (input.pawn_becomes + 1) % PROMOTIONS.length;
            input.pawn_becomes = x;
            e.currentTarget.innerHTML = 'pawn becomes <b>' + PROMOTIONS[x] + '</b>';
        }
    },
    {
        id: 'computer_level_button',
        onclick: function(e){
            var x = (input.computer_level + 1) % LEVELS.length;
            input.computer_level = x;
            e.currentTarget.innerHTML = 'computer level: <b>' + LEVELS[x] + '</b>';
        },
        refresh: function(el){
            el.innerHTML = 'computer level: <b>' + LEVELS[input.computer_level] + '</b>';
        }
    },
    {
        label: 'dump state',
        onclick: function(e){
            p4_dump_state(input.board_state);
        },
        debug: true
    },
    {
        label: 'dump FEN',
        onclick: function(e){
            console.log(p4_state2fen(input.board_state));
        },
        debug: true
    }
];


function write_controls_html(lut){
    if (lut === undefined)
        lut = CONTROLS;

    var div = document.getElementById("controls");
    for (var i = 0; i < lut.length; i++){
        var o = lut[i];
        if (o.debug && ! P4_DEBUG)
            continue;
        var span = new_child(div, "span");
        span.className = 'control-button';
        span.id = o.id || ('p4wn_button_' + i);
        if (o.label){
            span.innerHTML = o.label;
        }
        else {
            o.refresh(span);
        }
        span.addEventListener("click",
                              o.onclick,
                              true);

    }
}

//hacky thing to make the log fit beside the board.
function squeeze_into_box(){
    var div = document.getElementById('log');
    div.style.height = (SQUARE_HEIGHT * 9) + 'px';
    var div2 = document.getElementById('controls');
    div2.style.width = (SQUARE_WIDTH * 9 + 90) + 'px';
    div2.style.clear = 'both';
}


write_board_html();
write_controls_html();
if (SQUEEZE_INTO_BOX)
    squeeze_into_box();
