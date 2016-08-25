
/*
 *-----------------------------------------------------------------------------
 * wmks/bitbuf.js
 *
 *    This class implements decoding of variable-length-encoded
 *    integers from an array of bytes.
 *
 *-----------------------------------------------------------------------------
 */


/*
 *----------------------------------------------------------------------------
 *
 * BitBuf --
 *
 *      Given a buffer of bytes and its size, initialize a BitBuf
 *      object for reading from or writing to that buffer.
 *
 * Results:
 *      The initialized bit buffer.
 *
 * Side effects:
 *      None.
 *
 *----------------------------------------------------------------------------
 */

WMKS.BitBuf = function(buffer, size) {
   "use strict";
   this._buf = buffer;
   this._size = size;
   this._readCount = 0;
   this._overflow = false;
   this._thisByte = 0;
   this._thisByteBits = 0;

   return this;
};


/*
 *----------------------------------------------------------------------------
 *
 * BitBuf.readBits0 --
 *
 *      Helper for readBits() which reads a number of bits from the
 *      current active byte and returns them to the caller.
 *
 * Results:
 *      The bits requested.
 *
 * Side effects:
 *      Advances the buffer read offset by the specified number of bits.
 *
 *----------------------------------------------------------------------------
 */

WMKS.BitBuf.prototype.readBits0 = function (val, nr) {
   "use strict";
   var mask;

   if (this._bits < nr) {
      this._overflow = true;
      return -1;
   }

   mask = ~(0xff >> nr);        /* ones in the lower 'nr' bits */
   val <<= nr;                  /* move output value up to make space */
   val |= (this._thisByte & mask) >> (8-nr);
   this._thisByte <<= nr;
   this._thisByte &= 0xff;
   this._thisByteBits -= nr;

   return val;
};


/*
 *----------------------------------------------------------------------------
 *
 * BitBuf.readBits --
 *
 *      Read and return the specified number of bits from the BitBuf.
 *
 * Results:
 *      The value from the buffer.
 *
 * Side effects:
 *      Advances the buffer read offset by the specified number of bits.
 *
 *----------------------------------------------------------------------------
 */

WMKS.BitBuf.prototype.readBits = function (nr) {
   "use strict";
   var origNr = nr;
   var val = 0;

   if (this._overflow) {
      return 0;
   }

   while (nr > this._thisByteBits) {
      nr -= this._thisByteBits;
      val = this.readBits0(val, this._thisByteBits);

      if (this._readCount < this._size) {
         this._thisByte = this._buf[this._readCount++];
         this._thisByteBits = 8;
      } else {
         this._thisByte = 0;
         this._thisByteBits = 0;
         if (nr > 0) {
            this._overflow = true;
            return 0;
         }
      }
   }

   val = this.readBits0(val, nr);
   return val;
};


/*
 *----------------------------------------------------------------------------
 *
 * BitBuf.readEliasGamma --
 *
 *      Read an elias-gamma-encoded integer from the buffer.  The
 *      result will be greater than or equal to one, and is
 *      constrained to fit in a 32-bit integer.
 *
 * Results:
 *      None.
 *
 * Side effects:
 *      Advances the buffer read offset by the necessary number of bits.
 *
 *----------------------------------------------------------------------------
 */

WMKS.BitBuf.prototype.readEliasGamma = function() {
   "use strict";
   var l = 0;
   var value;
   var bit;
   var origidx = this._readCount;
   var origbit = this._thisByteBits;

   while (!this._overflow &&
          (bit = this.readBits(1)) == 0) {
      l++;
   }

   value = 1 << l;

   if (l) {
      value |= this.readBits(l);
   }

   return value;
}
