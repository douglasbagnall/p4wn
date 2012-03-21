P4wn, a smallish javascript chess engine
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is a web page that can play chess. It was originally written
between 2000 and 2002 and was entered in the 2002 5k web contest.
Because it was developed without source control and was minified by
hand, the code was rather obtuse and resistant to modification.

The version here (in ``src/``) has been reconstructed and expanded
from old backup files. It almost certainly lacks some bug fixes and
optimisations found in the 5k and 6k versions, but it has been fixed
in other ways and altered to suit modern browsers and to facilitate
extension and embedding.

The code is in the public domain, or if that does not make sense in
your country, the CC0_ license applies. You can do anything you want
with it. There are no restrictions, obligations, or warranties.

.. _CC0: http://creativecommons.org/publicdomain/zero/1.0/

The name "p4wn" was originally only intended as a sourceforge
subdomain, not to be applied to the chess program itself. People have
universally assumed otherwise, so the name sticks.

Where to find it
================

There is a homepage at http://p4wn.sf.net and git repositories at
http://p4wn.git.sourceforge.net/git/gitweb.cgi?p=p4wn/p4wn and
https://github.com/douglasbagnall/p4wn. The two git repositories
should be pretty similar.

Historical notes
================

As mentioned, a 5kB version was entered in a 2002 competition for
small web pages. In 2004 the code gained a sourceforge page
(http://p4wn.sf.net) with a CVS tree and a public domain dedication.
This spurred a small flurry of forks, as various people tried fixing
the obvious bugs and bad graphics or further reducing the code size.
These forks never coalesced into anything that could be called a
stream of development, no doubt due to the pathological state of the
code and a perceived lack of need for small chess playing web pages.

In March 2012 Douglas Bagnall liberated the code into git and tried to
de-obfuscate, disentangle, and modernise it, resulting in what you
find in ``/src/``. The intention, perhaps not entirely realised, is
that the interface code can be easily replaced without affecting the
chess engine, or vice versa.

The original program was first written for turn of the century
browsers, and to be as small as possible. It worked in Netscape 3. The
new version targets HTML5-ish browsers and aims to be as small as is
reasonable, while remaining easy to modify and embed. While it might
appear that every single line differs, the code is substantially the
same. The changes are mostly in the variable names and whitespace. In
particular, it is full of constructs that reflect the programmer's
former interest in brevity over clarity (and his inexperience).

Description of the code
=======================

**index.html** and **p4wn.css** are vessels for the javascript. These
are intended as examples and are deliberately simple.

**display.js** shows chess moves in the html. This is also an example,
though it is quite complex in its way. **display-config.js**
configures the interface a little. By putting your own script between
this and display.js, you can override the values you want.

**engine.js** plays chess and verifies moves.

Board structure
---------------

The board is stored as a 120 element array, conceptually a 10x12
board, with the 8x8 board placed at the centre, thus::

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

The idea is that any piece trying to walk off the board will hit a
wall ('#' in the diagram). There are two rows at top and bottom to
catch the knights.

The white pieces start in locations 21-28 and 31-38, and the black
ones in 91-98 and 81-88.

This board is stored as an attribute of a ``state`` object, which is
passed around the various engine functions. The board is called
``state.board``. Extra bits of state, like the presence of en passant
pawns and the availability of castling, are also stored as attributes
of the state object. Also, because it is there, the engine uses the
state to cache all kinds of intermediate values that aren't really
state.

Tree search
-----------

The function ``p4_treeclimber()`` calls itself recursively to
implement some sort of principal variation search, which is a kind of
alpha-beta search that tries to examine the best branches first.
(Whether this version does that successfully, and whether it is worth
the complexity over a plain alpha-beta search, is an interesting
question).

``p4_treeclimber()`` calls ``p4_parse()`` to get a list of possible
moves at each level of recursion. As parse finds moves it also scores
them according to material taken and weights given to various squares.
These weights are calculated in advance by ``p4_prepare()`` which is
called before the outermost ``p4_treeclimber()``. Most of the time is
probably spent in ``p4_parse()``, but this has not been tested or
particularly optimised.

The scoring system is really naive, in part due to size constraints
and in part to genuine authorial naivete.

display.js facing API
---------------------

The display code needs to call ``p4_new_game()`` to get a state
object. To ask for a computer move, it calls ``p4_findmove(state,
depth)``, where depth indicates how far ahead the search should look.
``p4_findmove`` returns an array of ``[start, end]``, where start and
end are board offsets as described above. To make a move, whether
found by ``p4_findmove()`` or user interaction, it must call
``p4_move(state, s, e)``. This tries to alter the board state and
returns a single integer indicating the result of the move, made up
out of these flags::

 P4_MOVE_ILLEGAL = 0             0 means the board is unchanged
 P4_MOVE_FLAG_OK = 1             the move is OK
 P4_MOVE_FLAG_CHECK = 2          a king is in check
 P4_MOVE_FLAG_MATE = 4           a side can't move (mate)
 P4_MOVE_FLAG_CAPTURE = 8        a piece has been taken
 P4_MOVE_FLAG_CASTLE_KING = 16   king side castle
 P4_MOVE_FLAG_CASTLE_QUEEN = 32  queen side castle

The castling and capture flags are useful for writing game logs. A
value of ``P4_MOVE_FLAG_OK | P4_MOVE_FLAG_MATE`` (5) indicates
stalemate, while ``P4_MOVE_FLAG_OK | P4_MOVE_FLAG_CHECK |
P4_MOVE_FLAG_MATE`` (7) means checkmate. If, through a mate somehow
being missed, a move would directly capture a king, the combination
``P4_MOVE_FLAG_CHECK | P4_MOVE_FLAG_MATE`` is returned. This says
"checkmate, but the move is not OK", and means the game should stop.


TODO
====

These changes should have a good or at least interesting effect.

Tune weights
------------

The weights have suffered all kinds of arbitrary changes with little
testing, and as a result this version probably plays worse than the 6k
one.

More general state loading/unloading/storage and history navigation
-------------------------------------------------------------------

It would be nice, and not difficult, to be able to go back and forward
in history and load arbitrary boards. Perhaps the board should be
loaded from a more readable compact string (like
'RNBQKBNRPPPPPPPP...'). The actually stateful parts of the state could
likewise be stringified, and the history stored as a list of strings.
(This is sort of how the 6k version worked -- its strings were
eval()ed into lists).

This would be useful for testing.

Testing
-------

It wouldn't be hard to write a test page, that loaded various boards
and tested odd positions.  And timed things.

Convert parse to a per-square-per piece look-up table.
------------------------------------------------------

Currently a knight or king on the edge will try looking in 8
directions when we know it can at the most go in 4. If the current
parse code was run for every square at the beginning, there could be a
big (but not all that big) look up table to use at parse time. Like
so::

   var moves = MOVE_LUT[piece][start_location];
   for(i = 0; i < moves.length; i++){
       e = moves[i];
       E = board[e];
       if(!E || ( E & 1) == other_colour){
           ...move
       }
    }

It saves trying off board moves, as well as some arithmetic.

For the pieces with variable length moves, it would look more like this::

   var directions = MOVE_LUT[piece][start_location];
   for (j = 0; j < directions.length; j++){
       moves = directions[j];
       for(i = 0; i < moves.length; i++){
           e = moves[i];
           E = board[e];
           if(! E || (E & 1) == other_colour){
              ...move
           }
           if (E)
              break;
       }
   }

Pawns should save the most.


Consideration of material balance
---------------------------------

A knight-knight swap is only even if every thing else is even. A side
with a material advantage will proportionally increase its advantage
through even exchanges.  This is easy enough to calculate.


General front-end improvements
------------------------------

The images and interaction could be better.

WebGL or html5 canvas front-ends are welcome.

Contributors and copyright
==========================

These people (and probably others whose names I have mislaid) have
added something to p4wn:

* Douglas Bagnall
* Sven Vahar
* Antony Lesuisse
* Ron Winter
* Chris Lear

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
