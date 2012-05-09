
/*P4_VALUES defines the relative value of various pieces.
 *
 * By default it follows the 1,3,3,5,9 pattern you learn as a kid,
 * multiplied by 16 to give sub-pawn resolution to other factors.
 */

var P4_VALUES=[0, 0,      //Piece values
               16, 16,    //pawns
               80, 80,    //rooks
               48, 48,    //knights
               48, 48,    //bishops
               5000, 5000,//kings
               144, 144,  //queens
               0];

/*P4_DEBUG turns on debugging features */
var P4_DEBUG = 0;
var P4_SHUFFLE_PIECES = false;
var P4_INITIAL_BOARD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1";

/*use javascript typed arrays rather than plain arrays
 * (faster in some browsers, unsupported in others, possibly slower elsewhere) */
var P4_USE_TYPED_ARRAYS = this.Int32Array !== undefined;
