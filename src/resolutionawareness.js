/* p4wn, AKA 5k chess - by Douglas Bagnall <douglas@paradise.net.nz>
 *
 * This code is in the public domain, or as close to it as various
 * laws allow. No warranty; no restrictions.
 *
 * @author Douglas Bagnall <douglas@paradise.net.nz>
 * @author Oliver Merkel <merkel.oliver@web.de>
 *
 */
/* The routines here resize the screen elements to optimize them for
 * the given device resolution */

function displayResize(evt) {
  var available_height = window.innerHeight - 100,
      available_width = window.innerWidth;
  var tmp_square_height = available_height >> 3,
      tmp_square_width = available_width / 11.5;
  var tmp = tmp_square_height > tmp_square_width ?
      tmp_square_width : tmp_square_height;
  var tmp_square = tmp < 30 ? 30 : tmp;
  /*
   * Overwriting CONSTANTS here (due to compatibility to display.js code)
   */
  P4WN_SQUARE_WIDTH = tmp_square;
  P4WN_SQUARE_HEIGHT = tmp_square;
  game.render_elements();
  for (var i=0; i<64; ++i) {
    var element = this.document.getElementById('field' + i)
    element.height = tmp_square;
    element.width = tmp_square;
  }
}

window.onresize = displayResize;
window.onload = displayResize;
