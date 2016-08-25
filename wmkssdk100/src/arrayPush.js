
/*
 * wmks/arrayPush.js
 *
 *   Convenience functions for building an array of bytes
 *   (for sending messages to servers or handling image formats).
 *
 */


Array.prototype.push8 = function (aByte) {
   this.push(aByte & 0xFF);
};


Array.prototype.push16 = function (aWord) {
   this.push((aWord >> 8) & 0xFF,
             (aWord     ) & 0xFF);
};


Array.prototype.push32 = function (aLongWord) {
   this.push((aLongWord >> 24) & 0xFF,
             (aLongWord >> 16) & 0xFF,
             (aLongWord >>  8) & 0xFF,
             (aLongWord      ) & 0xFF);
};


Array.prototype.push16le = function(aWord) {
   this.push((aWord     ) & 0xff,
             (aWord >> 8) & 0xff);
};


Array.prototype.push32le = function(aLongWord) {
   this.push((aLongWord     ) & 0xff,
             (aLongWord >> 8) & 0xff,
             (aLongWord >> 16) & 0xff,
             (aLongWord >> 24) & 0xff);
};
