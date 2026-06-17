'use strict';
const { Jimp } = require('jimp');

// A pixel counts as "content" if it is opaque and not near-white.
// We define the visual bounding box as the first/last row and column
// that contain at least MIN_PX_DENSE content pixels — filtering out
// the 1-4 stray anti-aliased edge pixels that extend well beyond
// the actual visible logo and cause false bounding-box inflation.
const EMPTY_ALPHA  = 10;
const WHITE_THRESH = 241;
const MIN_PX_DENSE = 5;    // minimum content pixels per row/col to count as "real" content

(async () => {
  const img = await Jimp.read('edgen-logo-final.png');
  const w = img.bitmap.width, h = img.bitmap.height;
  const data = img.bitmap.data;
  console.log('Input  (edgen-logo-final.png): ' + w + ' x ' + h + '  (ratio ' + (w/h).toFixed(3) + ':1)');

  function isContent(x, y) {
    const i = (y * w + x) * 4;
    const a = data[i+3], r = data[i], g = data[i+1], b = data[i+2];
    return a > EMPTY_ALPHA && !(r >= WHITE_THRESH && g >= WHITE_THRESH && b >= WHITE_THRESH);
  }

  // Build per-row and per-column content pixel counts
  const rowCnt = new Int32Array(h);
  const colCnt = new Int32Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isContent(x, y)) { rowCnt[y]++; colCnt[x]++; }
    }
  }

  let minY = -1, maxY = -1, minX = -1, maxX = -1;
  for (let y = 0; y < h; y++) { if (rowCnt[y] >= MIN_PX_DENSE) { if (minY < 0) minY = y; maxY = y; } }
  for (let x = 0; x < w; x++) { if (colCnt[x] >= MIN_PX_DENSE) { if (minX < 0) minX = x; maxX = x; } }

  if (minY < 0) { console.log('No dense content found!'); process.exit(1); }

  console.log('Dense content rows:  y=' + minY + ' to y=' + maxY + '  (stripped ' + minY + 'px top, ' + (h-1-maxY) + 'px bottom)');
  console.log('Dense content cols:  x=' + minX + ' to x=' + maxX + '  (stripped ' + minX + 'px left, ' + (w-1-maxX) + 'px right)');

  img.crop({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });

  const fw = img.bitmap.width, fh = img.bitmap.height;
  console.log('Output (edgen-logo-tight.png):  ' + fw + ' x ' + fh + '  (ratio ' + (fw/fh).toFixed(3) + ':1)');

  await img.write('edgen-logo-tight.png');
  console.log('Saved: edgen-logo-tight.png');
})();
