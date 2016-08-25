// Use the following for js-lint.
/*global WMKS:false, Base64:false, stringFromArray:false, arrayFromString:false*/
/*jshint bitwise:false*/

/*
 * wmks/vncProtocolUint8Utf8.js
 *
 *   Calling addUint8Utf8 with an WMKS.VNCDecoder instance will restore
 *   the legacy uint8utf8 support.
 *
 *   Most functions are only monkey patched if the protocol is uint8utf8,
 *   leaving the normal functionality unchanged. This is a temporary fix
 *   until uint8utf8 support can be updated to convert to ArrayBuffers
 *   instead of the older string based receiveQueue.
 */
function addUint8Utf8(vncDecoder) {
   'use strict';

   WMKS.LOGGER.debug('adding uint8utf8 support');
   var self = vncDecoder;

   if (!self.hasOwnProperty('_legacyReceiveQueue')) {
      self._legacyReceiveQueue = '';
      self._legacyReceiveQueueIndex = '';
   }

   self.useLegacy = false;


   var legacyFunctions = {};

   /*
    *
    * RX/TX queue management
    *
    */
   legacyFunctions._receiveQueueBytesUnread = function () {
      return this._legacyReceiveQueue.length - this._legacyReceiveQueueIndex;
   };

   legacyFunctions._receiveQueueConsumeBytes = function (nr) {
      this._legacyReceiveQueueIndex += nr;
   };

   legacyFunctions._receiveQueueReset = function () {
      this._legacyReceiveQueue = '';
      this._legacyReceiveQueueIndex = 0;
   };

   legacyFunctions._readString = function (stringLength) {
      var string = this._legacyReceiveQueue.slice(this._legacyReceiveQueueIndex,
                                                  this._legacyReceiveQueueIndex + stringLength);
      this._legacyReceiveQueueIndex += stringLength;
      return string;
   };




   /*
    *------------------------------------------------------------------------------
    *
    * _readStringUTF8
    *
    *    Pops the first 'stringLength' bytes from the front of the read buffer
    *    and parses the string for unicode. If it finds unicode, it converts them
    *    to unicode and returns the unicode string.
    *
    * Results:
    *    A unicode string thats as long as 'stringLength' in case of non-unicodes
    *    or shorter.
    *
    * Side Effects:
    *    Advances receive buffer.
    *
    *------------------------------------------------------------------------------
    */

   legacyFunctions._readStringUTF8 = function (stringLength) {
      var c, c1, c2, c3, valArray = [],
          i = this._legacyReceiveQueueIndex;
      while (i < this._legacyReceiveQueueIndex + stringLength) {
         c = this._legacyReceiveQueue.charCodeAt(i);
         if (c < 128) {
            // Handle non-unicode string here.
            valArray.push(c);
            i++;
         } else if (c < 224) {
            c1 = this._legacyReceiveQueue.charCodeAt(i+1) & 63;
            valArray.push(((c & 31) << 6) | c1);
            i += 2;
         } else if (c < 240) {
            c1 = this._legacyReceiveQueue.charCodeAt(i+1) & 63;
            c2 = this._legacyReceiveQueue.charCodeAt(i+2) & 63;
            valArray.push(((c & 15) << 12) | (c1 << 6) | c2);
            i += 3;
         } else {
            c1 = this._legacyReceiveQueue.charCodeAt(i+1) & 63;
            c2 = this._legacyReceiveQueue.charCodeAt(i+2) & 63;
            c3 = this._legacyReceiveQueue.charCodeAt(i+3) & 63;
            valArray.push(((c & 7) << 18) | (c1 << 12) | (c2 << 6) | c3);
            i += 4;
         }
      }

      this._legacyReceiveQueueIndex += stringLength;
      // WMKS.LOGGER.warn(valArray + ' :arr, str: ' + String.fromCharCode.apply(String, valArray));
      // Apply all at once is faster: http://jsperf.com/string-fromcharcode-apply-vs-for-loop
      return String.fromCharCode.apply(String, valArray);
   };


   /*
    *------------------------------------------------------------------------------
    *
    * _readByte
    *
    *    Pops the first byte from the front of the receive buffer.
    *
    * Results:
    *    First byte of the receive buffer.
    *
    * Side Effects:
    *    Advances receive buffer.
    *
    *------------------------------------------------------------------------------
    */

   legacyFunctions._readByte = function () {
      var aByte = this._legacyReceiveQueue.charCodeAt(this._legacyReceiveQueueIndex);
      this._legacyReceiveQueueIndex += 1;
      return aByte;
   };


   /*
    *------------------------------------------------------------------------------
    *
    * _readBytes
    *
    *    Pops the first 'length' bytes from the front of the receive buffer.
    *
    * Results:
    *    Array of 'length' bytes.
    *
    * Side Effects:
    *    Advances receive buffer.
    *
    *------------------------------------------------------------------------------
    */

   legacyFunctions._readBytes = function (length) {
      var result, i;

      result = new Array(length);

      for (i = 0; i < length; i++) {
         result[i] = this._legacyReceiveQueue.charCodeAt(i + this._legacyReceiveQueueIndex);
      }

      this._legacyReceiveQueueIndex += length;
      return result;
   };


   /*
    *------------------------------------------------------------------------------
    *
    * _sendString
    *
    *    Sends a string to the server, using the appropriate encoding.
    *
    * Results:
    *    None.
    *
    * Side Effects:
    *    Sends data.
    *
    *------------------------------------------------------------------------------
    */

   legacyFunctions._sendString = function (stringValue) {
      if (!this._websocket) {
         return;
      }

      this._websocket.send(stringValue);
   };


   /*
    *------------------------------------------------------------------------------
    *
    * _sendBytes
    *
    *    Sends the array 'bytes' of data bytes to the server.
    *
    * Results:
    *    None.
    *
    * Side Effects:
    *    Sends data.
    *
    *------------------------------------------------------------------------------
    */

   legacyFunctions._sendBytes = function (bytes) {
      this._sendString(stringFromArray(bytes));
   };




   /*
    *
    * Client message sending
    *
    */



   /*
    *------------------------------------------------------------------------------
    *
    * _sendClientEncodingsMsg
    *
    *    Sends the server a list of supported image encodings.
    *    This is a temporary override to disabled encTightDiffComp
    *    until it can be better tested and potentially updated.
    *
    * Results:
    *    None.
    *
    * Side Effects:
    *    Sends data.
    *
    *------------------------------------------------------------------------------
    */

   legacyFunctions._sendClientEncodingsMsg = function () {
      var i;
      var encodings = [/* this.encTightDiffComp, */
         this.encTightPNG,
         this.encDesktopSize,
         this.encVMWDefineCursor,
         this.encVMWCursorState,
         this.encVMWCursorPosition,
         this.encVMWTypematicInfo,
         this.encVMWLEDState,
         this.encVMWServerPush2,
         this.encVMWServerCaps,
         this.encTightJpegQuality10,
         this.encVMWFrameStamp,
         this.encUpdateCache];


      if (this.options.mediaPlayer) {
         encodings.unshift(this.encH264MP4);
      }

      if (this._canvas[1]) {
         encodings = [this.encOffscreenCopyRect].concat(encodings);
      }

      /*
       * Blits seem to work well on most browsers now.
       */
      encodings = [this.encCopyRect].concat(encodings);

      var message = [];
      message.push8(this.msgClientEncodings);
      message.push8(0);
      message.push16(encodings.length);
      for (i = 0; i < encodings.length; i += 1) {
         message.push32(encodings[i]);
      }
      this._sendBytes(message);
   };

   /*
    *
    * Framebuffer updates
    *
    */


   /*
    *------------------------------------------------------------------------------
    *
    * _readTightData
    *
    *    Parses a compressed FB update payload.
    *
    * Results:
    *    None.
    *
    * Side Effects:
    *    Sets next parser callback.
    *
    *------------------------------------------------------------------------------
    */

   legacyFunctions._readTightData = function (rect) {
      /*
       * Skip the preamble and read the actual JPEG data.
       */
      var type = (rect.subEncoding === this.subEncPNG) ? 'image/png' : 'image/jpeg',
          data = this._readString(this.nextBytes),
          URL  = window.URL || window.webkitURL;

      /*
       * Construct an Image and keep a reference to it in the
       * rectangle object. Since Images are loaded asynchronously
       * we can't draw it until the image has finished loading so
       * we don't call onDecodeComplete() until this has happened.
       */
      rect.image = this._imageManager.getImage();
      rect.image.width = rect.width;
      rect.image.height = rect.height;
      rect.image.destX = rect.x;
      rect.image.destY = rect.y;

      if (rect.subEncoding !== this.subEncPNG) {
         this._lastJpegData = data;
      }

      if (URL) {
         // Ensure data is in Uint8Array format
         data = arrayFromString(data, true);

         rect.image.onload = this.onDecodeObjectURLComplete;
         rect.image.src = URL.createObjectURL(new Blob([data], {type: type}));
      } else {
         data = Base64.encodeFromString(data);

         rect.image.onload = this.onDecodeComplete;
         rect.image.src = 'data:' + type + ';base64,' + data;
      }

      this._nextRect();
   };


   /*
    *------------------------------------------------------------------------------
    *
    * _peekFirstMessage
    *
    *    We have built and deployed two sorts of VNC servers, those that
    *    expect an RFB 003.008 and VNC authentication handshake, and
    *    those which jump straight into the VNC protocol at the
    *    serverInitialized message.  Previously we had to switch the
    *    client between these two modes, but it is possible to build a
    *    single client which can talk to both types of server simply by
    *    examining the size of the first message we receive.
    *
    *    Note that this is a very robust detection method - the server is
    *    required in each case to send a message of a specific size on
    *    connection establishment.  We are lucky that the two messages
    *    are of different sizes.
    *
    * Results:
    *    None.
    *
    * Side Effects:
    *    Sets next parser callback.
    *
    *------------------------------------------------------------------------------
    */

   legacyFunctions._peekFirstMessage = function () {
      this.usedVNCHandshake = (this._receiveQueueBytesUnread() == 12);
      if (this.usedVNCHandshake) {
         this._setReadCB(12, this._handleProtocolVersionMsg);
      } else {
         this._setReadCB(24, this._handleServerInitializedMsg);
      }
   };



   function replaceFunctions(vncDecoder) {
      WMKS.LOGGER.trace('uint8utf8: replacing functions');
      vncDecoder._originalFunctions = vncDecoder._originalFunctions || {};

      for (var functionName in legacyFunctions) {
         if(legacyFunctions.hasOwnProperty(functionName)){
            if (!vncDecoder._originalFunctions[functionName]) {
               //Save reference to original
               vncDecoder._originalFunctions[functionName] = vncDecoder[functionName];
            }
            vncDecoder[functionName] = legacyFunctions[functionName];
         }
      }
   }

   function restoreFunctions(vncDecoder) {
      WMKS.LOGGER.trace('restoreFunctions');
      if (!vncDecoder._originalFunctions) {
         return;
      }  //never replaced

      for (var functionName in vncDecoder._originalFunctions) {
         if(vncDecoder._originalFunctions.hasOwnProperty(functionName)){
            vncDecoder[functionName] = vncDecoder._originalFunctions[functionName];
         }
      }
   }

   self.wsOpen = function (evt) {

      self._state = self.VNC_ACTIVE_STATE;
      if (this.protocol !== 'uint8utf8' &&
          this.protocol !== 'binary' &&
          this.protocol !== 'vmware-vvc') {
         return self.fail('no agreement on protocol');
      }

      if (this.protocol === 'vmware-vvc') {
         self._setupVVC();
         WMKS.LOGGER.log('WebSocket is using VMware Virtual Channels');
         this.protocol = 'binary';
      }

      if (this.protocol === 'binary') {
         this.binaryType = 'arraybuffer';
         WMKS.LOGGER.log('WebSocket HAS binary support');
      }

      self.useLegacy = (this.protocol === 'uint8utf8');

      if (self.useLegacy) {
         replaceFunctions(self);
      } else{
         restoreFunctions(self);
      }

      // Note: this is after _setupVVC() in case the UI wants to add vvc listeners.
      self.options.onConnecting(self.vvc, self.vvcSession);

      WMKS.LOGGER.log('WebSocket created protocol: ' + this.protocol);
   };


   var wsMessageOriginal = self.wsMessage;
   self.wsMessage = function (evt) {
      if (!self.useLegacy) { return wsMessageOriginal.apply(this, arguments); }

      if (self._legacyReceiveQueueIndex > self._legacyReceiveQueue.length) {
         return self.fail('overflow receiveQueue');
      } else if (self._legacyReceiveQueueIndex === self._legacyReceiveQueue.length) {
         self._legacyReceiveQueue = '';
         self._legacyReceiveQueueIndex = 0;
      }

      if (typeof evt.data !== 'string') {
         var data = new Uint8Array(evt.data);
         self._legacyReceiveQueue = self._legacyReceiveQueue.concat(stringFromArray(data));
      } else {
         self._legacyReceiveQueue = self._legacyReceiveQueue.concat(evt.data);
      }
      self._processMessages();
   };


   if (self.protocolList.indexOf('uint8utf8') === -1) {
      self.protocolList.push('uint8utf8');
   }
   legacyFunctions._receiveQueueReset.call(self);
}
