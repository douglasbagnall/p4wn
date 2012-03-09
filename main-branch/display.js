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
    player: 0  //0 for white, 8 for black
};


function square_clicked(square){
    if (GAMEOVER) return;
    var board = input.board_state.board;
    var mover = input.board_state.to_play;
    var piece = board[square];
    if (input.start == square){
        //clicked back on previously chosen piece -- putting it down again
        show_piece_in_hand(0);
        show_image(input.start, input.inhand);
        input.inhand = 0;
        input.start = 0;
    }
    else if (piece && (mover == (piece & 8))){
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
        var move_result = move(input.board_state, input.start, square);
        display_move_text(input.board_state,
                          input.start, square, input.board_state.taken_piece, '');

        alert(move_result);
        if(move_result == 1){
            show_image(square, input.inhand);
            show_piece_in_hand(0); //blank moving
            input.inhand = 0;
            input.start = 0;
            computer_move();
        }
        else { // failed to move. is it actually checkmate?
            if (move_result == 2)
                GAMEOVER = true;
        }
    }
}


//////////////////////////////to go:

var auto_play_timeout_ID;
function auto_play(){
    if (GAMEOVER) return;
    var level = document.fred.hep.selectedIndex + 1;
    if(findmove(input.board_state, level) == 1){          //do other colour
        auto_play_timeout_ID = window.setTimeout(computer_move, 500);
    }
    else{
        going = 0;
    }
}
function computer_move(){
    if (going || input.player != input.to_play){
        clearTimeout(auto_play_timeout_ID);
        auto_play();
    }
}




//*******************************shift & display

function display_move_text(moveno, s, e, b, c){
    var x=s%10,tx=e%10;
    var mn = 1 + (moveno >> 1);
    var C=" ";
    if (c=="check") {
        C="+";
    }
    if (c=="checkmate") {
        C="++";
    }
    if (c=="stalemate") {
        C=" 1/2-1/2";
    }
    var lttrs="abcdefgh";
    document.fred.bib.value+="\n"
        +(input.to_play?'     ':(mn<10?" ":"")+mn+".  ")
        +lttrs.charAt(x-1)
        +((s-x)/10-1)
        +(b?'x':'-')
        +lttrs.charAt(tx-1)
        +((e-tx)/10-1)
        +(C);
}


//*******************************************redraw screen from board

function refresh(bw){
    input.player=bw;
    for (var z=0;z<OFF_BOARD;z++){
        if(input.board_state.board[z]<16)show_image(z,input.board_state.board[z]);
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
    var im = document.images['pih'];
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
            //e = e || event;
            im.style.left = (e.clientX + 1) + "px";
            im.style.top = (e.clientY - 4) + "px";
        };
    }
}


//*********************************************final write,etc
// can be merged with weighters;

function write_board_html(){
    var html='<table cellpadding=4>';
    for (var y=90;y>10;y-=10){
        html+="<tr>";
        for(var x=0;x<10;x++){
            var z=y+x;
            if(x&&x<9){
                    html+=('<td class=' +
                           ((x + (y/10)) & 1 ? 'b':'w') +
                           '><a href="#" onclick="square_clicked(input.player?119-'+ z + ':' + z +
                           ');return false"><img src=images/0.gif width=7 height=40 border=0>' +
                           '<img src=images/0.gif width=25 height=40 id=i'+z+' name=i'+z +
                           ' border=0><img src=images/0.gif width=7 height=40 border></a></td>\n');
                }
        }
        html+='</tr>\n';
    }
    html+='</table>';
    document.write(html);
}
write_board_html();


refresh(0);
