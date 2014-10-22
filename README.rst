P4wn, a smallish javascript chess engine
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

P4wn is both - an online web page and an offline HTML mobile and tablet
application - that can play chess. It is quite small, plays well
enough to be interesting, and is easy to embed in your pages. The
default interface is easy to replace, and the engine is simple and
tunable. P4wn is completely free, available under CC0_ or public
domain terms. You can use it for anything you want.

.. _CC0: http://creativecommons.org/publicdomain/zero/1.0/

How to play
===========

If you load ``src/index.html`` (or http://p4wn.sf.net/src) in a modern
javascript enabled browser, you should see a small chess board. You
are playing white. To change that, click **swap**. You can swap sides
at any stage of the game.

To move a piece, click on it and click again where you want it to be.

If the game is too easy or hard, click on the **computer level**
button until it seems about right. Depending on you browser and
computer, the slower settings might cause the browser to pop up
warning windows.

When you make a stupid move, you can undo it by clicking on the
**undo** button. To jump back a long way, you can click on a move in
the game log.

The **pawn becomes ...** button switches between the various possible
promotions for a pawn that reaches the end. If you want to change it,
do so before you move the pawn.

If a draw is technically possible (either through 3 repetitions of the
same position, or 50 moves without a capture or pawn move) , a
**Draw?** button will appear. You can claim a draw by clicking it.
P4wn will never claim a draw on its own, just offer you the button.

Where to find it and get help
=============================

There is a homepage at http://p4wn.sf.net and git repositories at
http://p4wn.git.sourceforge.net/git/gitweb.cgi?p=p4wn/p4wn and
https://github.com/douglasbagnall/p4wn. The two git repositories
should be pretty similar. Most people seem to use the github one. Zip
and tar files of version 2 can be found at
http://sourceforge.net/projects/p4wn/files/.


The git tree contains several files not included in the version 2 zip
and tar files. These are mainly interesting for historical reasons, or
for testing, and are unnecessary and potentially confusing if you just
want to play chess. So they have been left out and instead you'll get
confused when this document refers to them. You can get these files
via git, or just look at them on the Github and Sourceforge links
above.

There is a mailing list at
https://lists.sourceforge.net/lists/listinfo/p4wn-chess, and the issue
tracker at https://github.com/douglasbagnall/p4wn/issues is used.

History
=======

Version 1
---------

P4wn was originally written between 2000 and 2002 in a very compressed
form, and was entered in the 2002 5k web contest. This version can
still be found in the ``5k`` and ``6k`` directories. It is quite
obtuse, due to its minified nature and the inexperience of the
programmer.

Sourceforge CVS era
-------------------

In 2004 it gained a sourceforge page (http://p4wn.sf.net) with a CVS
tree and a public domain dedication. This spurred a small flurry of
forks, as various people tried fixing the obvious bugs and bad
graphics or further reducing the code size. These forks never
coalesced into anything that could be called a stream of development,
no doubt due to the pathological state of the code and a perceived
lack of need for small chess playing web pages.

The name “p4wn” was originally only intended as a sourceforge
subdomain, not to be applied to the chess program itself (which was
called “5k chess” or somesuch). People have universally assumed
otherwise, so the name sticks.

Version 2
---------

In 2012 P4wn was rewritten for readability, correctness, and speed.
The code in the ``src`` directory is version 2; that in ``5k`` is
version 1.  Version 2 followed liberation from CVS into git.

Version 2.01 contains an interface fix for Internet Explorer.

Version 2.02 introduces changes and wrappers so p4wn runs with an
offline.appcache. Now p4wn can be installed as a packaged application
or hosted application on Firefox OS devices to run even offline
and in full screen. Furthermore p4wn can now be installed and run on
iOS devices being started via icon from Home Screen and run in full
screen, too. An optimize to screen resolution feature is available
now. It provides resolution awareness, e.g. on mobile devices if
switching between portrait and landscape, etc. New SVG (Scalable
Vector Graphics) chess set has been created from scratch under CC0_.
See

* http://omerkel.github.io/p4wn/src/index-mobile.html ,
* http://omerkel.github.io/p4wn/src/index-mobile-1.html ,
* http://omerkel.github.io/p4wn/src/index-mobile-2.html ,
* https://marketplace.firefox.com/app/p4wn/ , and
* https://marketplace.firefox.com/app/p4wn2/

Differences between version 1 and 2
-----------------------------------


Although they look entirely different, there is a structural and
algorithmic continuity between the versions.

P4wn 1 was written to run on turn of the century browsers, and to be
as small as possible. It works in browsers newer than Netscape 3 and
Internet Explorer 4. Version 2 targets HTML5-ish browsers and aims to
be as small as is reasonable, while remaining easy to modify and
embed. It probably works in all versions of Firefox, Chrome, and
Safari, and (more slowly) in Internet Explorer 5.5 and above.

P4wn 2 in 2012 works a few thousand times faster than p4wn 1 did is
2002. Much, but not all, of that is down to browser and hardware
improvements.

Embedding and theming
=====================

*TL;DR:* look at ``src/index.html``. If you are trying something more
complex than that, look also at ``src/fen-test.html``. Failing that,
read on.

The default interface (``display.js``) is deliberately primitive, to
encourage the development of replacements.

Putting it in you own page, method 1
------------------------------------

Copy the files ``engine.js``, ``display.js``, ``p4wn.css``, and the
``images`` directory into your html directory. Then add these lines to
your html::

  <link rel="stylesheet" href="p4wn.css" />

in the ``<head>``,
::

  <div id="board-goes-here"></div>

where you want the board to be, and this::

 <script src="engine.js"></script>
 <script src="display.js"></script>
 <script>
  var game = p4wnify("board-goes-here");
  game.next_move();
 </script>

at the bottom (as seen in ``src/index.html``).

Putting it in you own page, method 2
------------------------------------

You might want the p4wn files somewhere else in your web tree, in
which case you would do something like this (replacing ``p4wn/src``
with the correct path)::

 <html>
    <link rel="stylesheet" href="p4wn/src/p4wn.css" />
  <body>
    Your content...
   <div id="board-goes-here"></div>
    Your other content...
   <script src="p4wn/src/engine.js"></script>
   <script src="p4wn/src/display.js"></script>
   <script>
    P4WN_IMAGE_DIR = 'p4wn/src/images';
    var game = p4wnify("board-goes-here");
    game.next_move();
   </script>
  </body>
 </html>

Putting it in you own page, method 3 (no local copy)
----------------------------------------------------

Replacing every instance of ``p4wn/src`` in the above example with
``http://p4wn.sf.net/src`` ought to work. (Which is not to say
http://p4wn.sf.net/src will always contain working and up-to-date
code).

Theming using CSS
-----------------

Start from ``p4wn.css``. A few rules (e.g. the log panel height) are
overridden by javascript. If you really need to wrest control back,
use the ``!important`` declaration. Or you could write your own
version of ``p4wnify()`` from ``display.js`` that doesn’t do that.

Theming: images
---------------

The images are found in a directory specified by ``P4WN_IMAGE_DIR``.
When you have better images, put them where you like and change that
variable before calling ``p4wnify()``::

   <script src="p4wn/src/engine.js"></script>
   <script src="p4wn/src/display.js"></script>
   <script>
    P4WN_IMAGE_DIR = '/path/to/better/images';
    var game = p4wnify("board-goes-here");
    game.next_move();
   </script>

Alternatively you can change the ``P4WN_IMAGE_NAMES`` variable, which is
a list of variable names::

 var P4WN_IMAGE_NAMES = [
     'empty.gif',
     '',   // 1 is unused
     'white_pawn.gif',
     'black_pawn.gif',
     'white_rook.gif',
     'black_rook.gif',
     'white_knight.gif',
     //....
    ];

but that is more work.

Theming: scale
--------------

The size of the board is controlled by the size of each square, which
is controlled by two variables::

   <script>
    P4WN_SQUARE_WIDTH = 60;  /* default is 30 x 30 */
    P4WN_SQUARE_HEIGHT = 60;
    var game = p4wnify("board-goes-here");
    game.next_move();
   </script>

The images will be scaled to this size.

Theming: miscellaneous
----------------------

Should the board flip around when you are playing black, so your
pieces are at the bottom?
::

 P4WN_ROTATE_BOARD = false; //default is true

Do you dislike the names of the various levels, or think the default
level is wrong? Change these::

 P4WN_LEVELS = ['stupid', 'middling', 'default', 'slow', 'slowest'];
 P4WN_DEFAULT_LEVEL = 2;

The names of pieces for pawn promotions can be localised::

 P4WN_PROMOTION_STRINGS = ['queen', 'rook', 'knight', 'bishop'];

as can the moves in the game log::

 P4_ENCODE_LUT = "  ♙♟♖♜♘♞♗♝♔♚♕♛";

Should p4wn keep trying deeper and deeper searches until it runs out
of time (around a second)?

::

 P4WN_ADAPTIVE_LEVELS = true;

More complicated and deeper adaptations
---------------------------------------

It is possible to replace the ``display.js`` interface altogether, or to
modify the way the engine plays. But these topics are discussed below.
It is time for a break.

p4wnify() tries to do what you mean
-----------------------------------

For convenience, the ``p4wnify`` function will work with an element ID
(as seen in the other examples), a DOM element itself, or a jquery
object::

    var el = document.getElementById("board-goes-here");
    var $el = $("#board-goes-here");
    p4wnify(el).next_move();
    p4wnify($el).next_move();

The engine.js API and internals
===============================

**engine.js** keeps track of the game, finds moves to play, and tries
to communicate as much of this as is necessary to the human interface
(**display.js**, by default). There are a few functions and a state
object you need to worry about if you are writing a new interface, and
a number of configurable constants you can fiddle with whether you are
replacing ``display.js`` or not.

Some terminology
----------------

*FEN*, or `Forsyth-Edwards Notation`_ is a standard for describing
chess positions. It is fairly simple and widely used.

.. _`Forsyth-Edwards Notation`: http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation

`Algebraic Notation`_ or *AN* is a widely used but not quite precisely
defined standard for describing chess *moves*. If you have ever read a
chess article you will have seen little clusters of letters and
numbers like “*a8=Q Nbxa8*”. That is algebraic notation. P4wn follows
the PGN_ dialect which uses upper case Os instead of zeros in castling
notation (*O-O-O* vs *0-0-0*), but it tries to understand a wider
range, including the long form which names each square rather than the
moved piece (e.g. *b1-c3* rather than *Nc3*).

.. _`Algebraic Notation`: http://en.wikipedia.org/wiki/Algebraic_chess_notation
.. _PGN: http://en.wikipedia.org/wiki/Portable_Game_Notation

Finally, a *pseudo-legal move* is a move that is allowed by the
movement rules of chess without regard for check. The pseudo legal
moves are an easier to find super-set of the actually legal moves.


Functions used by display.js
----------------------------

p4_new_game() and p4_fen2state()
++++++++++++++++++++++++++++++++

``p4_new_game()`` creates a state object representing a game in the
initial position. This is actually just a wrapper for
``p4_fen2state(P4_INITIAL_BOARD)``, with ``P4_INITIAL_BOARD`` being the
appropriate FEN string. With other FEN strings you can start the game
in another position.

The ``state`` object has three methods, which are wrappers around
global functions in ``engine.js``. You can use the global functions
just as well, using this conversion table::

  state.findmove(depth)    <-->   p4_findmove(state, depth)
  state.move(...)                 p4_move(state, ...)
  state.jump_to_moveno(n)         p4_jump_to_moveno(state, n)

state.findmove(depth)
+++++++++++++++++++++

This finds the computer’s moves. ``state`` is the object returned by
``p4_new_game()``, and ``depth`` is an integer 1 less than the depth
of the desired search. That is, a ``3`` will give you a 4-ply search.

It returns the array ``[start, end, score]``, where ``start`` and
``end`` are board co-ordinates suitable for feeding into
``state.move()``, which is what you need to do if you actually want to
make the move it found.

state.move(start, end, promotion) or state.move(move_string)
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

This moves the piece and updates the board state. ``promotion`` is the
piece the pawn should become if this move happens to be moving a pawn
to the end. The options are ``P4_ROOK``, ``P4_KNIGHT``, ``P4_BISHOP``,
and ``P4_QUEEN``, equating to 4, 6, 8, and 12 respectively. If
``promotion`` is omitted, ``P4_QUEEN`` is assumed.

The start and end can take various forms. The native form used by
``display.js`` and ``state.findmove`` are indexes into a 120 element
array, which is conceptually a 10x12 board, with the 8x8 board placed
at the centre, thus::

   + 0123456789
   0 ##########
  10 ##########
  20 #RNBQKBNR#
  30 #PPPPPPPP#
  40 #........#
  50 #........#
  60 #........#
  70 #........#
  80 #pppppppp#
  90 #rnbqkbnr#
 100 ##########
 110 ##########

The idea behind this representation is that any piece trying to walk
off the board will hit a wall (“``#``” in the diagram), which simplifies
bounds checking. There are two rows at top and bottom to catch the
knights. The white pieces start in locations 21-28 and 31-38, and the
black ones in 91-98 and 81-88, so moving the white kings pawn out 2
rows (*e4* in algebraic notation) would be made using::

 state.move(35, 55);

But ``state.move`` will also accept a split algebraic form::

 state.move('e2', 'e4');  /*start and end in algebraic notation*/

or various complete algebraic forms, where ``end`` and ``promotion``
are both ignored::

 state.move('e4');
 state.move('e2-e4'); /* 'long' algebraic notation */

If you are using this for, you should set the pawn promotion as part
of the algebraic string (or you’ll just get queens):

 state.move('e8=N'); /*got to end; promote to knight*/

state.move() return value
+++++++++++++++++++++++++

You get back an object like this::

   {
     flags: <integer flags>,
     string: <algebraic notation>,
     ok: <boolean>
   }

``ok`` says whether or not the move was legal. If ``ok`` is true, the
move stuck and the state has changed accordingly. ``flags`` contains
more detailed information about what happened.  The flags are::

 P4_MOVE_FLAG_OK = 1             the move is OK
 P4_MOVE_FLAG_CHECK = 2          a king is in check
 P4_MOVE_FLAG_MATE = 4           checkmate or stalemate
 P4_MOVE_FLAG_CAPTURE = 8        a piece has been taken
 P4_MOVE_FLAG_CASTLE_KING = 16   king side castle
 P4_MOVE_FLAG_CASTLE_QUEEN = 32  queen side castle
 P4_MOVE_FLAG_DRAW = 64          a draw is available

For example, if you put the other king into check by taking a piece,
the flags attribute will be ``P4_MOVE_FLAG_OK | P4_MOVE_FLAG_CHECK |
P4_MOVE_FLAG_CAPTURE``, which is 11. An ordinary move with no capture
or check results in a 1.

If ``P4_MOVE_FLAG_MATE`` is set without ``P4_MOVE_FLAG_CHECK``, the result is
stalemate.

``P4_MOVE_FLAG_DRAW`` indicates that a technical draw can be claimed (that
is, a position has been repeated three times or 50 full moves have
passed without a pawn move or capture).

If the move is OK, ``string`` is a description of it in algebraic
notation. If the move fails, ``string`` may or may not contain an
explanation (“in check” or similar).


state.jump_to_moveno(n)
+++++++++++++++++++++++

Rewind the game to an earlier move, wth ``n`` being the half-move
number to jump to.  Examples::

 state.jump_to_moveno(0) /* jump to the beginning */
 state.jump_to_moveno(3) /* jump to black's second move */

If the game was initialised using ``p4_fen2state()``, you can only rewind
as far back as the move specified by the FEN involved.

State attributes
----------------

The display code reads two attributes of the state object::

 {
  board: array,
  to_play: 0
 }

where ``board`` is the 120 element array described above, and
``to_play`` is 0 during white’s turn and 1 during blacks.

Tweakable constants
-------------------

These can be adjusted in the same way as themeable constants above:
just change them after you load ``engine.js``, and before you do anything
else.

Relative values of pieces.
++++++++++++++++++++++++++

It would be wise to stick to approximately the same scale::

  P4_VALUES=[0, 0,
             20, 20,    //pawns
             100, 100,  //rooks
             60, 60,    //knights
             61, 61,    //bishops
             8000, 8000,//kings
             180, 180,  //queens
             0];

P4_DEBUG: determinism and verbosity
+++++++++++++++++++++++++++++++++++

You can make p4wn play the same game every time and possibly log more
to the javscript console::

  P4_DEBUG = 1; /*or true */

Typed arrays vs plain old arrays
++++++++++++++++++++++++++++++++

Modern browsers have typed arrays which p4wn uses by default where
they exist.  You can force them off or on::

  P4_USE_TYPED_ARRAYS = false;

Changing the search algorithm
=============================

The state object has a ``treeclimber`` attribute, which points to a
function used by ``p4_find_move`` to evaluate the various possible
moves. The default implementation calls itself recursively to perform
an alpha-beta search, but replacement treeclimbers need not do this.

There are a number of alternatives in ``parse-test.js``, and if you
visit ``src/fen-test.html`` you will see a button for cycling through
these.

To replace the search, just go ``state.treeclimber =
your_search_function``, making sure of course that your function knows
the treeclimber signature::

  treeclimber(
      state,      /* p4wn state object */
      depth,      /* integer indicating depth of search */
      colour,     /* colour to move 0 == white, 1 == black */
      score,      /* base score to alter */
      s, e,       /* start and end squares of the move to be considered */
      alpha, beta /* low and high cutoffs */
      ){
       return score; /*score adjusted by evaluation */
      }

If you don’t know ``alpha`` and ``beta`` do, you can ignore them (or
look up *alpha-beta search*).  You can probably ignore the ``score``
argument too if your function is not performing cumulative evaluation
via recursion.

Tree search helper functions
----------------------------

p4_make_move(state, start, end, promotion)
++++++++++++++++++++++++++++++++++++++++++

This alters the state object by making the move indicated by ``start``
and ``end``. If the move puts a pawn in the promotion row,
``promotion`` must be set. The returned object contains all the
information necessary to unmake the move (and a bit more).

p4_unmake_move(state, move)
+++++++++++++++++++++++++++

This undoes a ``p4_make_move`` move. The basic pattern is::

  var move = p4_make_move(state, start, end, promotion)
  /* evaluate... */
  p4_unmake_move(state, move)

p4_parse(state, colour, ep, score)
++++++++++++++++++++++++++++++++++

This returns an array of arrays representing the available
pseudo-legal moves along with a partial evaluation of the move’s
value. Each returned move is represented thus: ``[score, start,
end]``. Even if you aren’t using the evaluation, ``p4_parse`` is
reasonably quick.

As an exception to the pseudo-legal moves rule, ``p4_parse`` thoroughly
checks that castling is possible.

p4_check_check(state, colour)
+++++++++++++++++++++++++++++

Returns true if the king of the colour in question is in check.
Otherwise false.

Re-minimising
=============

If you wanted to shrink p4wn back down to a few kilobytes, you could
get rid of much of the last third of ``engine.js`` which is mostly about
interpreting and producing strings in standard formats. Then if you
manually shorten the global names (including functions), an automatic
minimiser should be able to make it quite small, though probably not
down to 5k.

Tests
=====

A *few* tests are run automatically by ``src/auto-test.html``. The
test harness in ``src/auto-test.js`` is primitive but reusable, topical,
and extensible.

``src/fen-test.html`` doesn’t test anything on its own, but offers more
debugging options than ``index.html``.

HTTP query string interpretation
================================

The board state, search depth, and player colour can be set via the
http query string.  The following options are recognised:

start
  a FEN string to start the board at.

level
  the search depth

player
  one of ``white`` | ``black`` | ``both`` | ``neither``. “both” means
  the computer makes no moves, players move both sides.

debug
  switch on P4_DEBUG

For example,
http://p4wn.sf.net/src/?start=8/8/8/8/8/4K3/5Q2/7k+w+-+-+11+56&player=black
lands you in a pickle, playing black.


Contributors and copyright
==========================

These people (and probably others whose names I have mislaid) have
added something to p4wn:

* Douglas Bagnall
* Sven Vahar
* Antony Lesuisse
* Ron Winter
* Chris Lear
* Ivan Yelizariev
* Oliver Merkel

Public domain/ CC0
------------------

All of the authors listed have dedicated their contributions to this
work to the public domain by waiving all of his rights to the work
worldwide under copyright law, including all related and neighboring
rights, to the extent allowed by law.

You can copy, modify, distribute and perform the work, even for
commercial purposes, all without asking permission.

Sharing your contributions
--------------------------

If you want your contributions to be included in the main p4wn
repository, you will also need to waive copyright on them.


.. This README written in reStructuredText for automated html markup.
.. Apologies to plain text readers for the occasional odd construct.
