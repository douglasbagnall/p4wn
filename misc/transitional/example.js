

//extract of parse function
//Written for Andy King's book. 

//The moves array is used to find the legal moves for each major (non-pawn) piece.
//The offset into the array corresponds to the first 3 bits of the piece
// eg: a knight has the number 3, so it's moves are 
// [21,19,12,8,-21,-19,-12,-8]
// which are the numbers that, when added to a knight's position, will move it to a 
// proper place.

// (the moves array is not actually given in this form, but constructed from a shorter one,
// but I've made it explicit for the example.)

moves=[0,0,[1,10,-1,-10],[21,19,12,8,-21,-19,-12,-8],[11,9,-11,-9],[1,10,11,9,-1,-10,-11,-9],[1,10,11,9,-1,-10,-11,-9]];


// I don't know if I explained the board representation very well. The 120 long array wraps like this: 

// 0 1 X 3 X X X X X 9 
//10 X X X14 X X X X X 
// X .22 . . . . . . X 
//30 . . .34 . . . o X 
// X41 .43 . . . . . X 
// X . . . . . . . . X 
// X . . . . . . . . X 
// X . . . . . . . . X 
// X . . . . . . . . X 
// X . . . . . . . . X 
// X X X X X X X X X X
// X X X X X X X X X 119

// So a knight starting in position 22 will try going to 22+21, 22+19, 22+12, 22+8, etc
// 22+21=43, and you can see that that is a legal move. 22+8=30, which is obviously
// an illegal move. Because square 30 (like all the Xs) will have a value of 16, 
// it can be rejected by the same line that checks whether it is empty or a takable piece.
// Without the padding of "off the board" values, explicit checks are needed to determine
// whether a move is travelling across the boundary,from one side to the other. With a 
// length-64 array (which snugly fits the board - imagine just the dots above) the 
// move corresponding to 22 to 30 above would place the knight at the far right of
// the board, at the spot marked 'o'. There'd need to be something tricky to discover    
// that. An explicitly 2 dimensional array simplifies things in someways, but is slower
// and long-winded. The padding gives the Array a virtual 2nd dimension
// without the overhead. 


// The Extract:

// do the following for each movingPiece starting at startPos, ending at endPos.
// These pieces are already known to exist (ie not point to blank squares).
// The colour is alread known too, but I've included colour determination
// so people can see how it works. 

{
    ourCol=movingPiece & 8; // what colour is it?
                            // 8=black, 0=white
    otherCol=8-ourCol;      // so pieces of the other colour (which can be taken)
                            // will have (8-ourCol) as their 8-bit
                            
    movingPiece &= 7;  //now we have the colour info, dump it.

    if(movingPiece > 1){    //If it is not a pawn.

	mv=moves[movingPiece];//as described above.
 
	if(movingPiece==3 || movingPiece==6){
	    // knights and kings. These have
	    // essentially equivalent move patterns
	    // (both length 8 move arrays, without iteration 
	    for(x=0;x<8;x++){     
		tempPos=startPos+mv[x];
		endVal=board[tempPos];
		if(!endVal || (endVal&24)==otherCol){ //this I've explained elsewhere

		    //evaluate move and add to list
		    // it is only a line but quite a complicated one.
		}
	    }
	}
	else{//rook, bishop, queen

	    for(x=0;x<mv.length;x++){   //go thru list of moves
		endVal=0;
		tempPos=startPos;
		// for these pieces, add the move offset
		// repeatedly, until the edge or a piece is hit,
		// whereupon endVal will be non-zero.
		// If the piece hit is of the other colour,
		// it is added on as a move.

		while(!endVal){   //while on board && not on a piece
		    tempPos+=mv[x];
		    endVal=board[tempPos];

		    if(!endVal || (endVal & 24)==otherCol){


		    //evaluate  move and add to list


		    }
		}
	    }
	}
    }
    else{
	// it is a pawn.
	// a bit less simple. 
	// the move array is not used,
	// rather a direction variable
	// direction[ourCol] is 10 or -10
	// which is the pawns normal move.
    }
}
