
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
var P4_WIN = P4_VALUES[10] >> 1;

/* P4_EARLINESS_WEIGHTING indicates the extent to which the game can
 * be considered just beginning.
 *
 * Essentially, it maps the decay of the weighting toward centralising
 * moves.
 */
var P4_EARLINESS_WEIGHTING = [5,5,5,5,4,4,4,3,3,3,3,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1];

/* P4_{MAX,MIN}_SCORE should be beyond any possible evaluated score */

var P4_MAX_SCORE = 9999;    // extremes of evaluation range
var P4_MIN_SCORE = -P4_MAX_SCORE;


/*P4_DEBUG turns on debugging features */
var P4_DEBUG = 0;


/*P4_WEIGHT_STRING and P4_PAWN_WEIGHTS are used to set up weighting
 *towards the centre, and the other end, repesctively.
 *
 * XXX this is a crap way to do it.
 */
var P4_WEIGHT_STRING = "000000000000000000000000000000000111100000123321000123553210";
var P4_PAWN_WEIGHTS = '000012346900';  //per row - rewards advancement.

var P4_INITIAL_BOARD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 1";

/*use javascript typed arrays rather than plain arrays
 * (faster in some browsers, unsupported in others) */
var P4_USE_TYPED_ARRAYS = 1;
