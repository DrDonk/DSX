'use strict';

/*
 * wmks/packet.js
 *
 *   A useful class for reading and writing binary data to and from a Uint8Array
 *
 */

/**
 * Use {@link Packet#createNewPacket} or {@link Packet#createFromBuffer}.
 * to create a new Packet.
 *
 * @classdesc A packet is a Uint8Array of binary data!
 *
 * @constructor
 * @private
 * @param {Uint8Array} buffer The buffer.
 * @param {Number}     length The length of data in the buffer.
 * @param {WMKS.Packet.BYTE_ORDER} [byteOrder] Byte order of words in buffer.
  */
WMKS.Packet = function(buffer, length, byteOrder) {
   /**
    * The length of the packet.
    * @type {Number}
    */
   this.length = length;

   /**
    * The internal buffer.
    * @private
    * @type {Uint8Array}
    */
   this._buffer = buffer;

   /**
    * The current read position of the buffer.
    * @private
    * @type {Number}
    */
   this._readPosition = 0;

   /**
    * The byte order of words in the buffer.
    * @private
    * @type {Number}
    */
   this._byteOrder = byteOrder || WMKS.Packet.BYTE_ORDER.NETWORK_ORDER;

   if (this._byteOrder == WMKS.Packet.BYTE_ORDER.LITTLE_ENDIAN) {
      this.setInt16 = this.setInt16le;
      this.setInt32 = this.setInt32le;
      this.setUint16 = this.setUint16le;
      this.setUint32 = this.setUint32le;
      this.getInt16 = this.getInt16le;
      this.getInt32 = this.getInt32le;
      this.getUint16 = this.getUint16le;
      this.getUint32 = this.getUint32le;
   } else if (this._byteOrder == WMKS.Packet.BYTE_ORDER.BIG_ENDIAN) {
      this.setInt16 = this.setInt16be;
      this.setInt32 = this.setInt32be;
      this.setUint16 = this.setUint16be;
      this.setUint32 = this.setUint32be;
      this.getInt16 = this.getInt16be;
      this.getInt32 = this.getInt32be;
      this.getUint16 = this.getUint16be;
      this.getUint32 = this.getUint32be;
   }
};


/**
 * Byte order of words in a packet.
 * @enum {Number}
 * @readonly
 */
WMKS.Packet.BYTE_ORDER = {
   LITTLE_ENDIAN: 1,
   BIG_ENDIAN: 2,
   NETWORK_ORDER: 2
};


/**
 * Create a new packet and allocates a fixed size buffer.
 *
 * @param {Number} [size=512] Size of the buffer
 * @param {WMKS.Packet.BYTE_ORDER} [byteOrder] Byte order of words in buffer.
 */
WMKS.Packet.createNewPacket = function(size, byteOrder)
{
   size = size || 512;
   return new WMKS.Packet(new Uint8Array(size), 0, byteOrder);
};


/**
 * Create a new packet with the provided buffer.
 * Intended to be used for reading data out of a Uint8Array.
 *
 * @param {Uint8Array|ArrayBuffer} buffer Buffer to use.
 * @param {WMKS.Packet.BYTE_ORDER} [byteOrder] Byte order of words in buffer.
 */
WMKS.Packet.createFromBuffer = function(buffer, byteOrder)
{
   if (buffer instanceof ArrayBuffer) {
      buffer = new Uint8Array(buffer);
   } else if (!(buffer instanceof Uint8Array)) {
      return null;
   }

   return new WMKS.Packet(buffer, buffer.length, byteOrder);
};


/**
 * Create a new big endian packet and allocates a fixed size buffer.
 *
 * @param {Number} [size=512] Size of the buffer
 */
WMKS.Packet.createNewPacketBE = function(size)
{
   return WMKS.Packet.createNewPacket(size, WMKS.Packet.BYTE_ORDER.BIG_ENDIAN);
};


/**
 * Create a new little endian packet and allocates a fixed size buffer.
 *
 * @param {Number} [size=512] Size of the buffer
 */
WMKS.Packet.createNewPacketLE = function(size)
{
   return WMKS.Packet.createNewPacket(size, WMKS.Packet.BYTE_ORDER.LITTLE_ENDIAN);
};


/**
 * Create a new big endian packet with the provided buffer.
 * Intended to be used for reading data out of a Uint8Array.
 *
 * @param {Uint8Array|ArrayBuffer} buffer Buffer to use.
 */
WMKS.Packet.createFromBufferBE = function(buffer)
{
   return WMKS.Packet.createFromBuffer(buffer, WMKS.Packet.BYTE_ORDER.BIG_ENDIAN);
};


/**
 * Create a new little endian packet with the provided buffer.
 * Intended to be used for reading data out of a Uint8Array.
 *
 * @param {Uint8Array|ArrayBuffer} buffer Buffer to use.
 */
WMKS.Packet.createFromBufferLE = function(buffer)
{
   return WMKS.Packet.createFromBuffer(buffer, WMKS.Packet.BYTE_ORDER.LITTLE_ENDIAN);
};


/**
 * Resets the packet write length and read position.
 * Does not reallocate the buffer.
 */
WMKS.Packet.prototype.reset = function()
{
   this.length = 0;
   this._readPosition = 0;
};


/**
 * Get an array representing the whole packets content, returns only the
 * written data and not the whole buffer.
 *
 * @return {Uint8Array} The packet's data
 */

WMKS.Packet.prototype.getData = function()
{
   return this._buffer.subarray(0, this.length);
};


/**
 * Returns the amount of bytes left available for reading.
 *
 * @return {Number} The number of bytes left to read.
 */
WMKS.Packet.prototype.bytesRemaining = function()
{
   return this.length - this._readPosition;
};


/**
 * Writes an 8 bit unsigned integer value to the end of the packet.
 *
 * @param {Number} value Value
 */
WMKS.Packet.prototype.writeUint8 = function(value)
{
   this._ensureWriteableBytes(1);
   this.setUint8(this.length, value);
   this.length += 1;
};


/**
 * Writes a 16 bit unsigned integer value to the end of the packet.
 *
 * @param {Number} value Value
 */
WMKS.Packet.prototype.writeUint16 = function(value)
{
   this._ensureWriteableBytes(2);
   this.setUint16(this.length, value);
   this.length += 2;
};


/**
 * Writes a 32 bit unsigned integer value to the end of the packet.
 *
 * @param {Number} value Value
 */
WMKS.Packet.prototype.writeUint32 = function(value)
{
   this._ensureWriteableBytes(4);
   this.setUint32(this.length, value);
   this.length += 4;
};


/**
 * Writes a 8 bit signed integer value to the end of the packet.
 *
 * @param {Number} value Value
 */
WMKS.Packet.prototype.writeInt8 = function(value)
{
   this._ensureWriteableBytes(1);
   this.setInt8(this.length, value);
   this.length += 1;
};


/**
 * Writes a 16 bit signed integer value to the end of the packet.
 *
 * @param {Number} value Value
 */
WMKS.Packet.prototype.writeInt16 = function(value)
{
   this._ensureWriteableBytes(2);
   this.setInt16(this.length, value);
   this.length += 2;
};


/**
 * Writes a 32 bit signed integer value to the end of the packet.
 *
 * @param {Number} value Value
 */
WMKS.Packet.prototype.writeInt32 = function(value)
{
   this._ensureWriteableBytes(4);
   this.setInt32(this.length, value);
   this.length += 4;
};


/**
 * Writes a string to the end of the packet in ASCII format.
 *
 * @param {String} value Value
 */
WMKS.Packet.prototype.writeStringASCII = function(value)
{
   var i;
   this._ensureWriteableBytes(value.length);

   for (i = 0; i < value.length; ++i) {
      this.setUint8(this.length++, value.charCodeAt(i));
   }
};


/**
 * Writes a byte array to the end of the packet.
 *
 * @param {Uint8Array} value Value
 */
WMKS.Packet.prototype.writeArray = function(value)
{
   if (value && value.length) {
      this._ensureWriteableBytes(value.length);
      this._buffer.set(value, this.length);
      this.length += value.length;
   }
};


/**
 * Reads a 8 bit value from the current read position.
 * Increases the read position by 1 byte.
 *
 * @return {Number} Value
 */
WMKS.Packet.prototype.readUint8 = function()
{
   var value;

   if (this._checkReadableBytes(1)) {
      value = this.getUint8(this._readPosition);
      this._readPosition += 1;
   }

   return value;
};


/**
 * Reads a 16 bit value from the current read position.
 * Increases the read position by 2 bytes.
 *
 * @return {Number} Value
 */
WMKS.Packet.prototype.readUint16 = function()
{
   var value;

   if (this._checkReadableBytes(2)) {
      value = this.getUint16(this._readPosition);
      this._readPosition += 2;
   }

   return value;
};


/**
 * Reads a 32 bit value from the current read position.
 * Increases the read position by 4 bytes.
 *
 * @return {Number} Value
 */
WMKS.Packet.prototype.readUint32 = function()
{
   var value;

   if (this._checkReadableBytes(4)) {
      value = this.getUint32(this._readPosition);
      this._readPosition += 4;
   }

   return value;
};


/**
 * Reads a 8 bit signed value from the current read position.
 * Increases the read position by 1 byte.
 *
 * @return {Number} Value
 */
WMKS.Packet.prototype.readInt8 = function()
{
   var value;

   if (this._checkReadableBytes(1)) {
      value = this.getInt8(this._readPosition);
      this._readPosition += 1;
   }

   return value;
};


/**
 * Reads a 16 bit signed value from the current read position.
 * Increases the read position by 2 bytes.
 *
 * @return {Number} Value
 */
WMKS.Packet.prototype.readInt16 = function()
{
   var value;

   if (this._checkReadableBytes(2)) {
      value = this.getInt16(this._readPosition);
      this._readPosition += 2;
   }

   return value;
};


/**
 * Reads a 32 bit signed value from the current read position.
 * Increases the read position by 4 bytes.
 *
 * @return {Number} Value
 */
WMKS.Packet.prototype.readInt32 = function()
{
   var value;

   if (this._checkReadableBytes(4)) {
      value = this.getInt32(this._readPosition);
      this._readPosition += 4;
   }

   return value;
};


/**
 * Reads a byte array from the current read position.
 * Increases the read position by length.
 *
 * @param  {Number}      length Length of the array to read in bytes.
 * @return {Uint8Array?}        Array
 */
WMKS.Packet.prototype.readArray = function(length)
{
   var value;

   if (this._checkReadableBytes(length)) {
      if (length === 0) {
         value = null;
      } else {
         value = this.getArray(this._readPosition, length);
         this._readPosition += length;
      }
   }

   return value;
};


/**
 * Reads an ASCII string from the current read position.
 * Increases the read position by length.
 *
 * @param  {Number} length Length of the string to read in bytes.
 * @return {String}        String
 */
WMKS.Packet.prototype.readStringASCII = function(length)
{
   var value = this.readArray(length);

   if (value) {
      value = String.fromCharCode.apply(String, value);
   }

   return value;
};


/**
 * Sets a 8 bit unsigned integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setUint8 = function(position, value)
{
   this._buffer[position] = value & 0xff;
};


/**
 * Sets a 16 bit big endian unsigned integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setUint16be = function(position, value)
{
   this._buffer[position + 1] = value & 0xff;
   this._buffer[position + 0] = (value >> 8) & 0xff;
};


/**
 * Sets a 32 bit big endian unsigned integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setUint32be = function(position, value)
{
   this._buffer[position + 3] = value & 0xff;
   this._buffer[position + 2] = (value >> 8) & 0xff;
   this._buffer[position + 1] = (value >> 16) & 0xff;
   this._buffer[position + 0] = (value >> 24) & 0xff;
};


/**
 * Sets a 16 bit little endian unsigned integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setUint16le = function(position, value)
{
   this._buffer[position + 0] = value & 0xff;
   this._buffer[position + 1] = (value >> 8) & 0xff;
};


/**
 * Sets a 32 bit little endian unsigned integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setUint32le = function(position, value)
{
   this._buffer[position + 0] = value & 0xff;
   this._buffer[position + 1] = (value >> 8) & 0xff;
   this._buffer[position + 2] = (value >> 16) & 0xff;
   this._buffer[position + 3] = (value >> 24) & 0xff;
};


/*
 * Due to how the javascript bitwise operators convert Numbers for writing
 * values we can use the same operation for signed and unsigned integers.
 */

/**
 * Sets a 8 bit signed integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setInt8 = function(position, value)
{
   return this.setUint8(position, value);
};


/**
 * Sets a 16 bit big endian signed integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setInt16be = function(position, value)
{
   return this.setUint16be(position, value);
};


/**
 * Sets a 32 bit big endian signed integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setInt32be = function(position, value)
{
   return this.setUint32be(position, value);
};


/**
 * Sets a 16 bit little endian signed integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setInt16le = function(position, value)
{
   return this.setUint16le(position, value);
};


/**
 * Sets a 32 bit little endian signed integer value at a specified position.
 *
 * @param {Number} position Position in bytes
 * @param {Number} value    Value
 */
WMKS.Packet.prototype.setInt32le = function(position, value)
{
   return this.setUint32le(position, value);
};


/**
 * Gets a subarray view from the buffer.
 *
 * @param  {Number}     start  Position in bytes
 * @param  {Number}     length Length in bytes
 * @return {Uint8Array}        The subarray
 */
WMKS.Packet.prototype.getArray = function(start, length)
{
   return this._buffer.subarray(start, start + length);
};


/**
 * Gets a 8 bit unsigned integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getInt8 = function(position)
{
   var value = this._buffer[position];

   if (value & 0x80) {
      value = value - 0xff - 1;
   }

   return value;
};


/**
 * Gets a 16 bit big endian signed integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getInt16be = function(position)
{
   var value;
   value  = this._buffer[position + 1];
   value |= this._buffer[position + 0] << 8;

   if (value & 0x8000) {
      value = value - 0xffff - 1;
   }

   return value;
};


/**
 * Gets a 32 bit big endian signed integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getInt32be = function(position)
{
   var value;
   value  = this._buffer[position + 3];
   value |= this._buffer[position + 2] << 8;
   value |= this._buffer[position + 1] << 16;
   value |= this._buffer[position + 0] << 24;
   return value;
};


/**
 * Gets a 16 bit little endian signed integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getInt16le = function(position)
{
   var value;
   value  = this._buffer[position + 0];
   value |= this._buffer[position + 1] << 8;

   if (value & 0x8000) {
      value = value - 0xffff - 1;
   }

   return value;
};


/**
 * Gets a 32 bit little endian signed integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getInt32le = function(position)
{
   var value;
   value  = this._buffer[position + 0];
   value |= this._buffer[position + 1] << 8;
   value |= this._buffer[position + 2] << 16;
   value |= this._buffer[position + 3] << 24;
   return value;
};


/**
 * Gets a 8 bit unsigned integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getUint8 = function(position)
{
   var value = this._buffer[position];
   return value;
};


/**
 * Gets a 16 bit big endian unsigned integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getUint16be = function(position)
{
   var value;
   value  = this._buffer[position + 1];
   value |= this._buffer[position + 0] << 8;
   return value;
};


/**
 * Gets a 32 bit big endian unsigned integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getUint32be = function(position)
{
   var value;
   value  = this._buffer[position + 3];
   value |= this._buffer[position + 2] << 8;
   value |= this._buffer[position + 1] << 16;
   value |= this._buffer[position + 0] << 24;

   if (value < 0) {
      value = 0xffffffff + value + 1;
   }

   return value;
};


/**
 * Gets a 16 bit little endian unsigned integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getUint16le = function(position)
{
   var value;
   value  = this._buffer[position + 0];
   value |= this._buffer[position + 1] << 8;
   return value;
};


/**
 * Gets a 32 bit little endian unsigned integer value from a position.
 *
 * @param  {Number} position Position in bytes
 * @return {Number}          Value
 */
WMKS.Packet.prototype.getUint32le = function(position)
{
   var value;
   value  = this._buffer[position + 0];
   value |= this._buffer[position + 1] << 8;
   value |= this._buffer[position + 2] << 16;
   value |= this._buffer[position + 3] << 24;

   if (value < 0) {
      value = 0xffffffff + value + 1;
   }

   return value;
};


/**
 * Changes the buffer size without modifying contents.
 *
 * @private
 * @param {Number} size New size of the buffer
 */
WMKS.Packet.prototype._resizeBuffer = function(size)
{
   if (size > 0) {
      var buffer = new Uint8Array(size);
      buffer.set(this._buffer);
      this._buffer = buffer;
   }
};


/**
 * Increases the buffer size to ensure there is enough size to write length
 * bytes in to the buffer. Grows the buffer size by factors of 1.5.
 *
 * @private
 * @param {Number} length The amount of bytes to ensure we fit in the buffer.
 */
WMKS.Packet.prototype._ensureWriteableBytes = function(length)
{
   if (length > 0) {
      var reqLength = this.length + length;
      var newLength = this._buffer.length;

      while (newLength < reqLength) {
         newLength = Math.floor(newLength * 1.5);
      }

      if (newLength > this._buffer.length) {
         this._resizeBuffer(newLength);
      }
   }
};


/**
 * Checks if we have enough bytes available to read from the buffer.
 *
 * @private
 * @param  {Number} length The number of bytes left.
 * @return {Boolean} [description]
 */
WMKS.Packet.prototype._checkReadableBytes = function(length)
{
   return this._readPosition + length <= this.length;
};
