
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

/* Threshold that indicates a king has been taken. It has to be quite
 * a bit less than the value of a king, in case someone finds a way
 * to, say, sacrifice two queens in order to checkmate.
 */
var P4_KING_VALUE = P4_VALUES[10];
var P4_WIN = P4_KING_VALUE >> 1;

/* every move, a winning score decreases by this much */
var P4_WIN_DECAY = 300;
var P4_WIN_NOW = P4_KING_VALUE - 200;

/* P4_{MAX,MIN}_SCORE should be beyond any possible evaluated score */

var P4_MAX_SCORE = 9999;    // extremes of evaluation range
var P4_MIN_SCORE = -P4_MAX_SCORE;

/*P4_DEBUG turns on debugging features */
var P4_DEBUG = 0;

var P4_INITIAL_BOARD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1";

/*use javascript typed arrays rather than plain arrays
 * (faster in some browsers, unsupported in others, possibly slower elsewhere) */
var P4_USE_TYPED_ARRAYS = (Int32Array !== undefined);
