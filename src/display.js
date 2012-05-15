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
    var board = this.board_state.board;
    var mover = this.board_state.to_play;
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
        this.start_moving_piece(square);
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
        this.display_move_text(state.moveno, move_result.string);
        this.refresh();
        if (! (move_result.flags & P4_MOVE_FLAG_MATE)){
            next_move_timeout_ID = window.setTimeout(
                function(p4d){
                    return function(){
                        p4d.next_move();
                    };
                }(this), 1);
        }
    }
    else {
        console.log("bad move!", start, end);
    }
    for (var i = 0; i < this.move_listeners.length; i++){
        this.move_listeners[i](move_result);
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
    this.log(mn + string, "p4wn-log-move",
             function (p4d, n){
                 return function(e){
                     p4d.goto_move(n);
                 };
             }(this, moveno));
};

_p4d_proto.log = function(msg, klass, onclick){
    var div = this.elements.log;
    var item = new_child(div, "div");
    item.className = klass;
    if (onclick !== undefined)
        item.addEventListener("click", onclick, true);
    item.innerHTML = msg;
    div.scrollTop = 999999;
}

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
            pieces[j].src =  P4WN_IMAGE_NAMES[this.board_state.board[i]];
        }
    }
};

_p4d_proto.start_moving_piece = function(position){
    /*drop the currently held one, if any*/
    this.stop_moving_piece();
    var img = this.elements.pieces[position];
    this.elements.moving_img = img;
    img.style.position = 'absolute';
    var yoffset = parseInt(P4WN_SQUARE_HEIGHT / 2);
    if (window.event){
        img.style.left = (window.event.clientX + 1) + "px";
        img.style.top = (window.event.clientY - yoffset) + "px";
    }
    this.start = position;
    document.onmousemove = function (e){
        img.style.left = (e.clientX + 1) + "px";
        img.style.top = (e.clientY - yoffset) + "px";
    };
};

/*If stop_moving_piece is given a position, the moved piece will be
 *drawn at that position, not its original position. THis is only
 *temporary until the next refresh */
_p4d_proto.stop_moving_piece = function(){
    var img = this.elements.moving_img;
    if (img){
        img.style.position = 'static';
        img.style.left = "auto";
        img.style.top = "auto";
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
            var i = y + x;
            var td = new_child(tr, "td");
            td.className = (x + (y / 10)) & 1 ? P4WN_BLACK_SQUARE : P4WN_WHITE_SQUARE;
            td.addEventListener("click",
                                function(p4d, n){
                                    return function(e){
                                        p4d.square_clicked(p4d.orientation ? 119 - n : n);
                                    };
                                }(this, i),
                                true);

            var img = new_child(td, "img");
            pieces[i] = img;
            img.src = P4WN_IMAGE_NAMES[0];
            img.width= P4WN_SQUARE_WIDTH;
            img.height= P4WN_SQUARE_HEIGHT;
        }
    }
};

_p4d_proto.refresh_buttons = function(){
    var rf = this.buttons.refreshers;
    for (var i = 0; i < rf.length; i++){
        var x = rf[i];
        x[0].call(this, x[1]);
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
    },
    {
        id: 'draw_button',
        label: '<b>Draw?</b>',
        onclick_wrap: function(p4d){
            return function(e){
                window.clearTimeout(next_move_timeout_ID);
                window.clearTimeout(auto_play_timeout_ID);
                p4d.refresh_buttons();
                p4d.log('DRAW');
                console.log(p4_state2fen(p4d.board_state));
                auto_play_timeout_ID = undefined;
                next_move_timeout_ID = undefined;
            };
        },
        move_listener_wrap: function(p4d){
            return function(move_result){
                var draw_button = p4d.elements.draw_button;
                if (move_result.flags & P4_MOVE_FLAG_DRAW){
                    draw_button.style.display = 'inline-block';
                    if (p4d.draw_offered){
                        draw_button.style.display = 'inline-block';
                        draw_button.style.color = '#c00';
                    }
                    p4d.draw_offered = true;
                }
                else {
                    p4d.draw_offered = false;
                    draw_button.style.color = 'inherit';
                    draw_button.style.display = 'none';
                }
            };
        },
        hidden: true
    }
];

_p4d_proto.write_controls_html = function(lut){
    var div = this.elements.controls;
    var buttons = this.buttons;
    for (var i = 0; i < lut.length; i++){
        var o = lut[i];
        if (o.debug && ! P4_DEBUG)
            continue;
        var span = new_child(div, "span");
        span.className = 'p4wn-control-button';
        buttons.elements.push(span);
        span.addEventListener("click",
                              o.onclick_wrap(this),
                              true);
        if (o.label)
            span.innerHTML = o.label;
        if (o.move_listener_wrap)
            this.move_listeners.push(o.move_listener_wrap(this));
        if (o.hidden)
            span.style.display = 'none';
        if (o.refresh)
            buttons.refreshers.push([o.refresh, span]);
        if (o.id)
            this.elements[o.id] = span;
    }
    this.refresh_buttons();
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
    this.elements.inner = inner;
    var board_height = (8 * (P4WN_SQUARE_HEIGHT + 3)) + 'px';
    inner.style.height = board_height;
    this.elements.container = container;
    var board = this.elements.board = new_child(inner, "div", P4WN_BOARD_CLASS);
    var log = this.elements.log = new_child(inner, "div", P4WN_LOG_CLASS);
    log.style.height = board_height;
    board.style.height = board_height;
    this.elements.messages = new_child(inner, "div", P4WN_MESSAGES_CLASS);
    this.elements.controls = new_child(container, "div", P4WN_CONTROLS_CLASS);
    this.elements.controls.style.width = (15 * P4WN_SQUARE_WIDTH) + 'px';
    this.start = 0;
    this.board_state = p4_new_game();
    this.players = ['human', 'computer']; //[white, black] controllers
    this.pawn_becomes = 0; //index into PROMOTION_* arrays
    this.computer_level = DEFAULT_LEVEL;
    this.buttons = {
        elements: [],
        refreshers: []
    };
    this.move_listeners = [];
    return this;
}

function p4wnify(id){
    var p4d = new P4wn_display(id);
    p4d.write_board_html();
    p4d.write_controls_html(CONTROLS);
    p4d.interpret_query_string();
    p4d.refresh();
    return p4d;
}

P4wn_display.prototype = _p4d_proto;

