/* p4wn, AKA 5k chess - by Douglas Bagnall <douglas@paradise.net.nz>
 *
 * This code is in the public domain, or as close to it as various
 * laws allow. No warranty; no restrictions.
 *
 * lives at http://p4wn.sf.net/
 */

/* The routines here draw the screen and handle user interaction */


/*the next two should match*/
var PROMOTION_STRINGS = ['queen', 'rook', 'knight', 'bishop'];
var PROMOTION_INTS = [P4_QUEEN, P4_ROOK, P4_KNIGHT, P4_BISHOP];

var auto_play_timeout_ID;
var next_move_timeout_ID;
var _p4d_proto = {};

_p4d_proto.square_clicked = function(square){
    var state = this.board_state;
    var board = state.board;
    var mover = state.to_play;
    if (this.players[mover] == 'computer'){
        console.log("not your turn!");
        return;
    }
    var piece = board[square];
    if (this.start == square){
        //clicked back on previously chosen piece -- putting it down again
        this.stop_moving_piece();
    }
    else if (piece && (mover == (piece & 1))){
        //clicked on player's colour, so it becomes start
        this.start_moving_piece(square);     //dragging piece
    }
    else if (this.move(this.start, square, PROMOTION_INTS[this.pawn_becomes])){
        /*If the move works, drop the piece.*/
        this.stop_moving_piece(square);
    }
};

_p4d_proto.move = function(start, end, promotion){
    var state = this.board_state;
    var move_result = p4_move(state, start, end, promotion);
    if(move_result.ok){
        console.log(move_result);
        this.display_move_text(state.moveno, move_result.string);
        this.refresh();
        if (! (move_result.flags & P4_MOVE_FLAG_MATE)){
            var p4d = this;
            next_move_timeout_ID = window.setTimeout(function(){p4d.next_move();}, 1);
        }
    }
    else {
        console.log("bad move!", start, end);
    }
    for (var i = 0; i < this.move_listeners.length; i++){
        this.move_listeners[i](move_result);
    }
    if (move_result.flags & P4_MOVE_FLAG_DRAW){
        if (! this.draw_offered){
            var p4d = this;
            write_controls_html([{
                                     id: 'offer_draw_button',
                                     label: '<b>Draw?</b>',
                                     onclick_wrap: function(io){
                                         return function(e){
                                             window.clearTimeout(next_move_timeout_ID);
                                             window.clearTimeout(auto_play_timeout_ID);
                                             this.refresh_buttons();
                                             this.display_move_text(0, 'DRAW');
                                             console.log(p4_state2fen(p4d.board_state));
                                             auto_play_timeout_ID = undefined;
                                             next_move_timeout_ID = undefined;
                                         };
                                     }
                                 }]);
            this.draw_offered = true;
        }
        else {
            var draw_button = document.getElementById('offer_draw_button');
            draw_button.style.display = 'inline-block';
            draw_button.style.color = '#c00';
        }
    }
    else {
        var draw_button = document.getElementById('offer_draw_button');
        if (draw_button !== null){
            draw_button.style.display = 'none';
        }
    }
    return move_result.ok;
};

_p4d_proto.next_move = function(){
    console.log(this);
    var mover = this.board_state.to_play;
    if (this.players[mover] == 'computer' &&
        auto_play_timeout_ID === undefined){
        var timeout = (this.players[1 - mover] == 'computer') ? 500: 10;
        var p4d = this;
        auto_play_timeout_ID = window.setTimeout(function(){p4d.computer_move();}, timeout);
    }
};

_p4d_proto.computer_move = function(){
    auto_play_timeout_ID = undefined;
    console.log(this);
    var state = this.board_state;
    var s, e, mv;
    var depth = this.computer_level + 1;
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
    this.move(s, e);
};


_p4d_proto.display_move_text = function(moveno, string){
    var mn;
    if ((moveno & 1) == 0){
        mn = '    ';
    }
    else{
        mn = ((moveno >> 1) + 1) + ' ';
        while(mn.length < 4)
            mn = ' ' + mn;
    }
    var div = this.elements.log;
    var item = new_child(div, "div");
    item.className = "log_move";
    item.addEventListener("click",
                          function (p4d, n){
                              return function(e){
                                  p4d.goto_move(n);
                              };
                          }(this, moveno),
                          true);
    item.innerHTML = mn + string;
    div.scrollTop = 999999;
};

_p4d_proto.goto_move = function(n){
    var delta = this.board_state.moveno - n;
    p4_jump_to_moveno(this.board_state, n);
    var div = this.elements.log;
    var entries = div.childNodes;
    for (var i = 0; i < delta; i++){
        div.removeChild(div.lastChild);
    }
    this.refresh();
    this.next_move();
};


//refresh: redraw screen from board

_p4d_proto.refresh = function(){
    var pieces = this.elements.pieces;
    for (var i = 20; i < 100; i++){
        if(this.board_state.board[i] != P4_EDGE){
            var j = this.orientation ? 119 - i : i;
            pieces[j].src =  IMAGE_NAMES[this.board_state.board[i]];
        }
    }
};

_p4d_proto.start_moving_piece = function(position){
    console.log("starting moving", position);
    /*drop the currently held one, if any*/
    var img = this.elements.moving_img;
    if (img){
        img.style.position = 'static';
    }
    img = this.elements.pieces[position];
    this.elements.moving_img = img;
    img.style.position = 'absolute';
    this.start = position;
    document.onmousemove = function (e){
        img.style.left = (e.clientX + 1) + "px";
        img.style.top = (e.clientY - 4) + "px";
    };
};

_p4d_proto.stop_moving_piece = function(position){
    console.log("stopping moving", position);
    var img = this.elements.moving_img;
    if (img !== undefined){
        img.style.position = 'static';
        if (position){
            var tmp = img.src;
            img.src = IMAGE_NAMES[0];
            this.elements.pieces[position].src = tmp;
        }
    }
    this.start = 0;
    this.elements.moving_img = undefined;
    document.onmousemove = null;
};


function new_child(element, childtag, className){
    var child = document.createElement(childtag);
    element.appendChild(child);
    if (className !== undefined)
        child.className = className;
    return child;
}

_p4d_proto.write_board_html = function(){
    var div = this.elements.board;
    var pieces = this.elements.pieces = [];
    var table = new_child(div, "table");
    for (var y = 90; y > 10; y-=10){
        var tr = new_child(table, "tr");
        for(var x = 1;  x < 9; x++){
            var z = y + x;
            var td = new_child(tr, "td");
            td.className = (x + (y / 10)) & 1 ? 'b' : 'w';
            td.addEventListener("click",
                                function(p4d, n){
                                    return function(e){
                                        p4d.square_clicked(p4d.orientation ? 119 - n : n);
                                    };
                                }(this, z),
                                true);

            var img = new_child(td, "img");
            pieces[z] = img;
            img.src = IMAGE_NAMES[0];
            img.width= SQUARE_WIDTH;
            img.height= SQUARE_HEIGHT;
        }
    }
};

_p4d_proto.refresh_buttons = function(){
    for (var x in CONTROLS){
        var o = CONTROLS[x];
        if (o.refresh === undefined)
            continue;
        var e = document.getElementById(o.id);
        o.refresh.call(this, e);
    }
};

_p4d_proto.maybe_rotate_board = function(){
    var p = this.players;
    if (p[0] != p[1] && ROTATE_BOARD){
        this.orientation = p[0] == 'computer' ? 1 : 0;
        refresh();
    }
};

/*some debugging functions */
function p4_dump_board(_board, name){
    if (name !== undefined)
        console.log(name);
    //console.log(_board);
    var board = [];
    for (var i = 0; i < 120; i++){
        board[i] = _board[i];
    }
    for (var y = 9; y >= 2; y--){
        var s = y * 10;
        console.log(board.slice(s + 1, s + 9));
    }
}

function p4_dump_state(state){
    var wt_strings = ['', '',
                      'W pawn', 'B pawn',
                      'W rook', 'B rook',
                      'W knight', 'B knight',
                      'W bishop', 'B bishop',
                      'W king', 'B king',
                      'W queen', 'B queen'];
    for (var i = 2; i < 14; i++){
        p4_dump_board(state.weights[i], wt_strings[i]);
    }
    p4_dump_board(state.board, 'board');
    p4_dump_board(P4_CENTRALISING_WEIGHTS, 'centralising weights');
    p4_dump_board(P4_BASE_PAWN_WEIGHTS, 'base pawn weights');
    p4_dump_board(P4_KNIGHT_WEIGHTS, 'base knight weights');
    var attr;
    for (attr in state){
        if (! /weights|board$/.test(attr))
            console.log(attr, state[attr]);
        else
            console.log(attr, "board array", state[attr].length);
    }
}

var CONTROLS = [
    {
        id: 'toggle_white_button',
        onclick_wrap: function(p4d){
            return function(e){
                p4d.players[0] = (p4d.players[0] == 'human') ? 'computer' : 'human';
                p4d.refresh_buttons();
                p4d.maybe_rotate_board();
                p4d.next_move();
            };
        },
        refresh: function(el){
            if (this.players[0] == 'human')
                el.innerHTML = 'white <img src="images/human.png" alt="human">';
            else
                el.innerHTML = 'white <img src="images/computer.png" alt="computer">';
        }
    },
    {
        id: 'toggle_black_button',
        onclick_wrap: function(p4d){
            return function(e){
                p4d.players[1] = (p4d.players[1] == 'human') ? 'computer' : 'human';
                p4d.refresh_buttons();
                p4d.maybe_rotate_board();
                p4d.next_move();
            };
        },
        refresh: function(el){
            if (this.players[1] == 'human')
                el.innerHTML = 'black <img src="images/human.png" alt="human">';
            else
                el.innerHTML = 'black <img src="images/computer.png" alt="computer">';
        }
    },
    {
        id: 'swap_button',
        onclick_wrap: function(p4d){
            return function(e){
                var p = p4d.players;
                var tmp = p[0];
                p[0] = p[1];
                p[1] = tmp;
                if (p[0] != p[1] && ROTATE_BOARD)
                    p4d.orientation = 1 - p4d.orientation;

                p4d.refresh_buttons();
                p4d.maybe_rotate_board();
                p4d.next_move();
            };
        },
        refresh: function(el){
            if (this.players[0] != this.players[1])
                el.innerHTML = '<b>swap</b>';
            else
                el.innerHTML = 'swap';
        }
    },
    {
        id: 'pawn_promotion_button',
        onclick_wrap: function(p4d){
            return function(e){
                var x = (p4d.pawn_becomes + 1) % PROMOTION_STRINGS.length;
                p4d.pawn_becomes = x;
                e.currentTarget.innerHTML = 'pawn becomes <b>' + PROMOTION_STRINGS[x] + '</b>';
            };
        },
        refresh: function(el){
            el.innerHTML = 'pawn becomes <b>' + PROMOTION_STRINGS[this.pawn_becomes] + '</b>';
        }
    },
    {
        id: 'computer_level_button',
        onclick_wrap: function(p4d){
            return function(e){
                var x = (p4d.computer_level + 1) % LEVELS.length;
                p4d.computer_level = x;
                e.currentTarget.innerHTML = 'computer level: <b>' + LEVELS[x] + '</b>';
            };
        },
        refresh: function(el){
            el.innerHTML = 'computer level: <b>' + LEVELS[this.computer_level] + '</b>';
        }
    },
    {
        label: 'dump state',
        onclick_wrap: function(p4d){
            return function(e){
                p4_dump_state(p4d.board_state);
            };
        },
        debug: true
    },
    {
        label: 'dump FEN',
        onclick_wrap: function(p4d){
            return function(e){
                console.log(p4_state2fen(p4d.board_state));
            };
        },
        debug: true
    }
];


_p4d_proto.write_controls_html = function(lut){
    var div = this.elements.controls;
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
            o.refresh.call(this, span);
        }
        span.addEventListener("click",
                              o.onclick_wrap(this),
                              true);
        if (o.move_listener){
            this.move_listeners.push(o.move_listener);
        }
    }
};

function parse_query(query){
    if (query === undefined)
        query = window.location.search.substring(1);
    if (! query) return [];
    var args = [];
    var re = /([^&=]+)=?([^&]*)/g;
    while (true){
        var match = re.exec(query);
        if (match === null)
            break;
        args.push([decodeURIComponent(match[1].replace(/\+/g, " ")),
                   decodeURIComponent(match[2].replace(/\+/g, " "))]);
    }
    return args;
}

_p4d_proto.interpret_query_string = function(){
    /*XXX Query arguments are not all sanitised.
     */
    var ATTRS = {
        start: function(s){p4_fen2state(s, this.board_state)},
        level: function(s){this.computer_level = parseInt(s)},
        player: function(s){
            var players = {
                white: ['human', 'computer'],
                black: ['computer', 'human'],
                both: ['human', 'human'],
                neither: ['computer', 'computer']
            }[s.toLowerCase()];
            if (players !== undefined){
                this.players = players;
                this.maybe_rotate_board();
            }
        },
        debug: function(s){P4_DEBUG = parseInt(s)}
    };
    var i;
    var query = parse_query();
    for (i = 0; i < query.length; i++){
        var p = query[i];
            var fn = ATTRS[p[0]];
        if (fn !== undefined){
            fn(p[1]);
            this.refresh_buttons();
        }
    }
};


//hacky thing to make the log fit beside the board.
_p4d_proto.squeeze_into_box = function(){
    var div = this.elements.log;
    div.style.height = (SQUARE_HEIGHT * 9) + 'px';
    var div2 = this.elements.controls;
    div2.style.width = (SQUARE_WIDTH * 9 + 90) + 'px';
    div2.style.clear = 'both';
};

_p4d_proto.go = function(){
    this.refresh(0);
    this.next_move();
};

function P4wn_display(target){
    if (! this instanceof P4wn_display){
        return new P4wn_display(target);
    }
    var container;
    if (typeof(target) == 'string')
        container = document.getElementById(target);
    else if (target.jquery !== undefined)
        container = target.get(0);
    else
        container = target;
    var inner = new_child(container, "div", P4WN_WRAPPER_CLASS);
    this.elements = {};
    this.elements.board = new_child(inner, "div", P4WN_BOARD_CLASS);
    this.elements.log = new_child(inner, "div", P4WN_LOG_CLASS);
    this.elements.messages = new_child(inner, "div", P4WN_MESSAGES_CLASS);
    this.elements.controls = new_child(inner, "div", P4WN_CONTROLS_CLASS);

    this.start = 0;
    this.board_state = p4_new_game();
    this.players = ['human', 'computer']; //[white, black] controllers
    this.pawn_becomes = 0; //index into PROMOTION_* arrays
    this.computer_level = DEFAULT_LEVEL;
    this.move_listeners = [];
    return this;
}

function p4wnify(id){
    var p4d = new P4wn_display(id);
    p4d.write_board_html();
    p4d.write_controls_html(CONTROLS);
    p4d.interpret_query_string();
    return p4d;
}

P4wn_display.prototype = _p4d_proto;

