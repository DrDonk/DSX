
/*
 * wmks/vncProtocol.js
 *
 *   WebMKS VNC decoder prototype.
 *
 */

WMKS.VNCDecoder = function(opts) {
   var i;
   this.options = $.extend({}, this.options, opts);

   $.extend(this, {
      useVMWRequestResolution: false,
      useVMWKeyEvent: false,                 // VMware VScanCode key inputs are handled.
      allowVMWKeyEvent2UnicodeAndRaw: false, // unicode + JS keyCodes are handled by server.
      useVMWAck: false,
      useVMWAudioAck: false,
      useVMWSessionClose: false,             // Session close msg are sent and handled by server.
      serverSupportsMKSVChanClipboard: false,
      vvc: null,
      vvcSession: null,
      _websocket: null,
      _encrypted: false,
      _receivedFirstUpdate: false,
      _serverInitialized: false,
      _canvas: [],
      _currentCursorURI: 'default',
      _cursorVisible: true,
      _imageCache: [],

      _copyRectBlit: null,
      _copyRectOffscreenBlit: null,

      _state: this.DISCONNECTED,

      _FBWidth: 0,
      _FBHeight: 0,
      _FBName: '',
      _FBBytesPerPixel: 0,
      _FBDepth: 3,

      /*
       * Mouse state.
       * The current button state(s) are sent with each pointer event.
       */
      _mouseButtonMask: 0,
      _mouseX: 0,
      _mouseY: 0,
      onDecodeComplete: {},

      /*
       * Frame buffer update state.
       */
      rects: 0,
      rectsRead: 0,
      rectsDecoded: 0,

      /*
       * Width/height requested through self.onRequestResolution()
       */
      requestedWidth: 0,
      requestedHeight: 0,

      decodeToCacheEntry: -1,
      updateCache: [],
      updateCacheEntries: 0,

      /*
       * Rate-limit resolution requests to the server.  These are slow
       * & we get a better experience if we don't send too many of
       * them.
       */
      resolutionTimeout: {},
      resolutionTimer: null,
      resolutionRequestActive: false,

      /*
       * We maintain an incrementing ID for each update request.
       * This assists in tracking updates/acks with the host.
       */
      updateReqId: 0,

      /*
       * Typematic details for faking keyboard auto-repeat in
       * the client.
       */
      typematicState: 1,             // on
      typematicPeriod: 33333,        // microseconds
      typematicDelay: 500000,        // microseconds

      /*
       * Bitmask of Remote keyboard LED state
       *
       * Bit 0 - Scroll Lock
       * Bit 1 - Num Lock
       * Bit 2 - Caps Lock
       */
      _keyboardLEDs: 0,

      /*
       * Timestamp frame's timestamp value --
       * This is stored as the low and high 32 bits as
       * Javascript integers can only give 53 bits of precision.
       */
      _frameTimestampLo: 0,
      _frameTimestampHi: 0,

      rect: [],
      _msgTimer: null,
      _mouseTimer: null,
      _mouseActive: false,
      msgTimeout: {},
      mouseTimeout: {},

      _retryConnectionTimer: null,

      _url: "",
      _receiveQueue: [],
      _receiveQueueIndex: 0,
      _receiveQueueLength: 0
   });

   this.setRenderCanvas(this.options.canvas);

   /*
    * Did we get a backbuffer canvas?
    */
   if (this.options.backCanvas) {
      this._canvas = this._canvas.concat([this.options.backCanvas]);
      this._canvas[1].ctx = this.options.backCanvas.getContext('2d');
   }

   if (this.options.blitTempCanvas) {
      this._canvas = this._canvas.concat([this.options.blitTempCanvas]);
      this._canvas[2].ctx = this.options.blitTempCanvas.getContext('2d');
   }

   // TODO: Make it a private var as the consumers if this object should have
   // been private too. Leave it as public until then.
   this._imageManager = new ImageManagerWMKS(256);

   if (this.options.mediaPlayer) {
      this._mp4Decoder = new MP4Decoder();
   }

   /*
    *---------------------------------------------------------------------------
    *
    * _releaseImage
    *
    *    Pushes the current image to the cache if it is not full,
    *    and then deletes the image. Reset destX, destY before image recycle.
    *
    *---------------------------------------------------------------------------
    */

   this._releaseImage = function (image) {
      image.destX = image.destY = null;
      this._imageManager.releaseImage(image);
   };

   return this;
};


$.extend(WMKS.VNCDecoder.prototype, {
   options: {
      canvas: null,
      backCanvas: null,
      blitTempCanvas: null,
      VCDProxyHandshakeVmxPath: null,
      useUnicodeKeyboardInput: false,
      enableVorbisAudioClips: false,
      enableOpusAudioClips: false,
      enableAacAudioClips: false,
      enableVVC: true,
      enableUint8Utf8: false,
      enableVMWSessionClose: false,
      retryConnectionInterval: -1,
      onConnecting: function() {},
      onConnected: function() {},
      onBeforeDisconnected: function() {},
      onDisconnected: function() {},
      onAuthenticationFailed: function() {},
      onError: function(err) {},
      onProtocolError: function() {},
      onNewDesktopSize: function(width, height) {},
      onKeyboardLEDsChanged: function(leds) {},
      onCursorStateChanged: function(visibility) {},
      onHeartbeat: function(interval) {},
      onUpdateCopyPasteUI: function(disableCopy, disablePaste) {},
      onCopy: function(txt) {},
      onSetReconnectToken: function(token) {},
      onAudio: function(audioInfo) {},
      onEncodingChanged: function(currentEncoding) {},
      cacheSizeKB: 102400,
      cacheSizeEntries: 1024
   },

   DISCONNECTED: 0,
   VNC_ACTIVE_STATE: 1,
   FBU_DECODING_STATE: 2,
   FBU_RESTING_STATE: 3,

   /*
    * Server->Client message IDs.
    */
   msgFramebufferUpdate: 0,
   msgSetColorMapEntries: 1,
   msgRingBell: 2,
   msgServerCutText: 3,
   msgVMWSrvMessage: 127,

   /*
    * VMWSrvMessage sub-IDs we handle.
    */
   msgVMWSrvMessage_ServerCaps: 0,
   msgVMWSrvMessage_Audio: 3,
   msgVMWSrvMessage_Heartbeat: 4,
   msgVMWSrvMessage_SetReconnectToken: 6,
   msgVMWSrvMessage_SessionClose: 7,

   /*
    * Client->Server message IDs: VNCClientMessageID
    */
   msgClientEncodings: 2,
   msgFBUpdateRequest: 3,
   msgKeyEvent: 4,
   msgPointerEvent: 5,
   msgVMWClientMessage: 127,

   /*
    * VMware Client extension sub-IDs: VNCVMWClientMessageID
    */
   msgVMWKeyEvent: 0,
   msgVMWPointerEvent2: 2,
   msgVMWKeyEvent2: 6,
   msgVMWAudioAck: 7,
   msgVMWSessionClose: 12,

   /*
    * Encodings for rectangles within FBUpdates.
    */
   encRaw:               0x00,
   encCopyRect:          0x01,
   encTightPNG:          -260,
   encDesktopSize:       -223,
   encTightDiffComp:      22 + 0x574d5600,
   encH264MP4:            24 + 0x574d5600,
   encVMWDefineCursor:   100 + 0x574d5600,
   encVMWCursorState:    101 + 0x574d5600,
   encVMWCursorPosition: 102 + 0x574d5600,
   encVMWTypematicInfo:  103 + 0x574d5600,
   encVMWLEDState:       104 + 0x574d5600,
   encVMWServerPush2:    123 + 0x574d5600,
   encVMWServerCaps:     122 + 0x574d5600,
   encVMWFrameStamp:     124 + 0x574d5600,
   encOffscreenCopyRect: 126 + 0x574d5600,
   encUpdateCache:       127 + 0x574d5600,
   encTightJpegQuality10: -23,

   diffCompCopyFromPrev: 0x1,
   diffCompAppend: 0x2,
   diffCompAppendRemaining:  0x3,

   updateCacheOpInit:        0,
   updateCacheOpBegin:       1,
   updateCacheOpEnd:         2,
   updateCacheOpReplay:      3,

   updateCacheCapDisableOffscreenSurface: 0x2,
   updateCacheCapReplay: 0x4,

   /*
    * Capability bits from VMWServerCaps which we can make use of.
    */
   serverCapKeyEvent:             0x002,
   serverCapClientCaps:           0x008,
   serverCapUpdateAck:            0x020,
   serverCapRequestResolution:    0x080,
   serverCapKeyEvent2Unicode:     0x100,
   serverCapKeyEvent2JSKeyCode:   0x200,
   serverCapAudioAck:             0x400,
   serverCapUpdateCacheInfo:      0x2000,
   serverCapDisablingCopyUI:      0x4000,
   serverCapDisablingPasteUI:     0x8000,
   serverCapSessionClose:         0x20000,
   serverCapHasMKSVChanClipboard: 0x40000,

   /*
    * Capability bits from VMClientCaps which we make use of.
    */
   clientCapHeartbeat:            0x100,
   clientCapVorbisAudioClips:     0x200,
   clientCapOpusAudioClips:       0x400,
   clientCapAacAudioClips:        0x800,
   clientCapAudioAck:             0x1000,
   clientCapSetReconnectToken:    0x4000,
   clientCapSessionClose:         0x8000,
   clientCapUseMKSVChanClipboard: 0x10000,

   /*
    * Flags in the VNCAudioData packet
    */
   audioflagRequestAck:       0x1,

   /*
    * Sub-encodings for the tightPNG encoding.
    */
   subEncFill: 0x80,
   subEncJPEG: 0x90,
   subEncPNG:  0xA0,
   subEncDiffJpeg:  0xB0,
   subEncMask: 0xF0,

   mouseTimeResolution: 16,  // milliseconds
   resolutionDelay: 300     // milliseconds
});





/** @private */

/*
 *------------------------------------------------------------------------------
 *
 * fail
 *
 *    Prints an error message and disconnects from the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Prints an error message and disconnects from the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.fail = function (msg) {
   WMKS.LOGGER.log(msg);
   this.disconnect();
   return null;
};



/*
 *------------------------------------------------------------------------------
 *
 * _assumeServerIsVMware
 *
 *    Enables features available only on VMware servers.
 *
 *    This is called when we have reason to believe that we are connecting
 *    to a VMware server. Old servers do not advertise their extensions,
 *    so we have to rely on fingerprinting for those.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Enables VMware-only features, which may crash connections
 *    to non-VMware servers.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._assumeServerIsVMware = function () {
   /*
    * Only when we skip VNC authentication we also assume that the server
    * is a VMware one. This is an additional protection in case someone
    * implements a server that emits CursorState updates.
    */
   if (!this.usedVNCHandshake) {
      return;
   }

   /*
    * The server seems to be a VMware server. Enable proprietary extensions.
    */
   this.useVMWKeyEvent = true;
};






/*
 *
 * RX/TX queue management
 *
 */


/*
 *------------------------------------------------------------------------------
 *
 * _receiveQueueBytesUnread
 *
 *    Calculates the number of bytes received but not yet parsed.
 *
 * Results:
 *    The number of bytes locally available to parse.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._receiveQueueBytesUnread = function () {
   "use strict";

   return this._receiveQueueLength - this._receiveQueueIndex;
};


/*
 *------------------------------------------------------------------------------
 *
 * _receiveQueueConsumeBytes
 *
 *    Advances the read pointer the specified number of bytes into the
 *    current websocket message.  Note that a complete VNC message may
 *    be split into more than one websocket message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._receiveQueueConsumeBytes = function (nr) {
   this._receiveQueueIndex += nr;

   while (this._receiveQueueIndex > 0 &&
          this._receiveQueue[0].data.byteLength <= this._receiveQueueIndex) {
      this._receiveQueueLength -= this._receiveQueue[0].data.byteLength;
      this._receiveQueueIndex -= this._receiveQueue[0].data.byteLength;
      this._receiveQueue.shift();
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _receiveQueueReset
 *
 *    Resets the receive queue, eg after websocket disconnect.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._receiveQueueReset = function () {
   this._receiveQueue = [];
   this._receiveQueueLength = 0;
   this._receiveQueueIndex = 0;
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

WMKS.VNCDecoder.prototype._readBytes = function (length) {
   "use strict";

   if (this._receiveQueueIndex + length <=
       this._receiveQueue[0].data.byteLength) {

      var result = new Uint8Array(this._receiveQueue[0].data,
                                  this._receiveQueueIndex,
                                  length);

      this._receiveQueueConsumeBytes(length);

      return result;
   } else {
      var result = new Uint8Array(length);
      var offset = 0;

      while (length > 0) {
         var thisAmt = Math.min(length,
                                this._receiveQueue[0].data.byteLength -
                                this._receiveQueueIndex);

         var tmp = new Uint8Array(this._receiveQueue[0].data,
                                  this._receiveQueueIndex,
                                  thisAmt);
         result.set(tmp, offset);
         offset += thisAmt;
         length -= thisAmt;
         this._receiveQueueConsumeBytes(thisAmt);
      }

      return result;
   }
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

WMKS.VNCDecoder.prototype._readByte = function () {
   "use strict";

   var bytes = this._readBytes(1);
   return bytes[0];
};


/*
 *------------------------------------------------------------------------------
 *
 * _skipBytes
 *
 *    Drops 'nr' bytes from the front of the receive buffer.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Advances receive buffer.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._skipBytes = function (nr) {
   "use strict";
   this._receiveQueueConsumeBytes(nr);
};


/*
 *------------------------------------------------------------------------------
 *
 * _readString
 *
 *    Pops the first 'stringLength' bytes from the front of the read buffer.
 *
 * Results:
 *    An array of 'stringLength' bytes.
 *
 * Side Effects:
 *    Advances receive buffer.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readString = function (stringLength) {
   "use strict";

   var bytes = this._readBytes(stringLength);

   return stringFromArray(bytes);
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

WMKS.VNCDecoder.prototype._readStringUTF8 = function (stringLength) {
   "use strict";

   var c, c1, c2, c3, valArray = [], i = 0;
   var bytes = this._readBytes(stringLength);

   while (i < stringLength) {
      c = bytes[i];
      if (c < 128) {
          // Handle non-unicode string here.
          valArray.push(c);
          i++;
      } else if (c < 224) {
         c1 = bytes[i+1] & 63;
         valArray.push(((c & 31) << 6) | c1);
         i += 2;
      } else if (c < 240) {
         c1 = bytes[i+1] & 63;
         c2 = bytes[i+2] & 63;
         valArray.push(((c & 15) << 12) | (c1 << 6) | c2);
         i += 3;
      } else {
         c1 = bytes[i+1] & 63;
         c2 = bytes[i+2] & 63;
         c3 = bytes[i+3] & 63;
         valArray.push(((c & 7) << 18) | (c1 << 12) | (c2 << 6) | c3);
         i += 4;
      }
   }

   // Apply all at once is faster:
   // http://jsperf.com/string-fromcharcode-apply-vs-for-loop
   //
   return String.fromCharCode.apply(String, valArray);
};




/*
 *------------------------------------------------------------------------------
 *
 * _readInt16
 *
 *    Pops the first two bytes from the front of the receive buffer.
 *
 * Results:
 *    First two bytes of the receive buffer.
 *
 * Side Effects:
 *    Advances receive buffer.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readInt16 = function () {
   "use strict";

   var bytes = this._readBytes(2);

   return ((bytes[0] << 8) +
           (bytes[1]));
};


/*
 *------------------------------------------------------------------------------
 *
 * _readInt32
 *
 *    Pops the first four bytes from the front of the receive buffer.
 *
 * Results:
 *    First four bytes of the receive buffer.
 *
 * Side Effects:
 *    Advances receive buffer.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readInt32 = function () {
   "use strict";

   var bytes = this._readBytes(4);

   return ((bytes[0] << 24) +
           (bytes[1] << 16) +
           (bytes[2] <<  8) +
           (bytes[3]));
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

WMKS.VNCDecoder.prototype._sendString = function (stringValue) {
   "use strict";
   this._sendBytes(arrayFromString(stringValue));
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

WMKS.VNCDecoder.prototype._sendBytes = function (bytes) {
   "use strict";
   if (!this._websocket) {
      return;
   }

   var msg = new ArrayBuffer(bytes.length);
   var uint8View = new Uint8Array(msg);
   var i;
   for (i = 0; i < bytes.length; i++) {
      uint8View[i] = bytes[i];
   }
   this._websocket.send(msg);
};





/*
 *
 * Parser / queue bridge helpers
 *
 */

WMKS.VNCDecoder.prototype._setReadCB = function(bytes, nextFn, nextArg) {
   this.nextBytes = bytes;
   this.nextFn = nextFn;
   this.nextArg = nextArg;
};


/*
 *
 * Client message sending
 *
 */


/*
 *------------------------------------------------------------------------------
 *
 * _sendMouseEvent
 *
 *    Sends the current absolute mouse state to the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendMouseEvent = function () {
   var arr = [];
   arr.push8(this.msgPointerEvent);
   arr.push8(this._mouseButtonMask);
   arr.push16(this._mouseX);
   arr.push16(this._mouseY);
   this._sendBytes(arr);
   this._mouseActive = false;
};


/*
 *------------------------------------------------------------------------------
 *
 * _sendResolutionRequest
 *
 *    Sends the most recently requested resolution to the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendResolutionRequest = function () {
   var arr = [];
   arr.push8(this.msgVMWClientMessage);
   arr.push8(5);       // Resolution request 2 message sub-type
   arr.push16(8);      // Length
   arr.push16(this.requestedWidth);
   arr.push16(this.requestedHeight);
   this._sendBytes(arr);
};


/*
 *------------------------------------------------------------------------------
 *
 * _sendClientEncodingsMsg
 *
 *    Sends the server a list of supported image encodings.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendClientEncodingsMsg = function () {
   var i;
   var encodings = [this.encTightDiffComp,
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
 *------------------------------------------------------------------------------
 *
 * _sendFBUpdateRequestMsg
 *
 *    Sends the server a request for a new image, and whether
 *    the update is to be incremental.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendFBUpdateRequestMsg = function (incremental) {
   var message = [];
   message.push8(this.msgFBUpdateRequest);
   message.push8(incremental);
   message.push16(0);
   message.push16(0);
   message.push16(this._FBWidth);
   message.push16(this._FBHeight);
   this._sendBytes(message);
};


/*
 *------------------------------------------------------------------------------
 *
 * _sendAck
 *
 *    Sends the server an acknowledgement of rendering the frame.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendAck = function(renderMilliseconds) {
   var updateReqId = this.updateReqId || 1;
   var msg;
   if (this.useVMWAck) {
      /*
       * Add one millisecond to account for the enforced sleep
       * between frames, and another as a bit of a swag.
       */
      var time = (renderMilliseconds + 2) * 10;
      var arr = [];
      arr.push8(this.msgVMWClientMessage);
      arr.push8(4);           // ACK message sub-type
      arr.push16(8);          // Length
      arr.push8(updateReqId); // update id
      arr.push8(0);           // padding
      arr.push16(time);       // render time in tenths of millis
      this._sendBytes(arr);
   } else {
      this._sendFBUpdateRequestMsg(updateReqId);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _sendAudioAck
 *
 *    Sends the server an acknowledgement of an audio packet.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendAudioAck = function(timestampLo, timestampHi) {
   var arr = [];
   arr.push8(this.msgVMWClientMessage);
   arr.push8(this.msgVMWAudioAck);
   arr.push16(12); // length
   arr.push32(timestampLo);
   arr.push32(timestampHi);
   this._sendBytes(arr);
};


/*
 *
 * Cursor updates
 *
 */


/*
 *------------------------------------------------------------------------------
 *
 * _changeCursor
 *
 *    Generates an array containing a Windows .cur file and loads it
 *    as the browser cursor to be used when hovering above the canvas.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Changes the cursor in the browser.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._changeCursor = function(pixels, mask, hotx, hoty, w, h) {
   var cursorData = [];

   var RGBImageDataSize = w * h * 4;   // 32 bits per pixel image data
   var maskSize = Math.ceil((w * h) / 8.0);  // 1 bit per pixel of mask data.

   var cursorDataSize = (RGBImageDataSize + 40 + /* Bitmap Info Header Size */
                         maskSize * 2);          /* 2 masks XOR & AND */

   var x, y;
   /*
    * We need to build an array of bytes that looks like a Windows .cur:
    *   -> http://en.wikipedia.org/wiki/ICO_(file_format)
    *   -> http://en.wikipedia.org/wiki/BMP_file_format
    */
   cursorData.push16le(0);
   cursorData.push16le(2);     // .cur type
   cursorData.push16le(1);     // One image

   cursorData.push8(w);
   cursorData.push8(h);
   cursorData.push8(0);        // True Color cursor
   cursorData.push8(0);
   cursorData.push16le(hotx);  // Hotspot X location
   cursorData.push16le(hoty);  // Hostpot Y location

   // Total size of all image data including their headers (but
   // excluding this header).
   cursorData.push32le(cursorDataSize);

   // Offset (immediately past this header) to the BMP data
   cursorData.push32le(cursorData.length+4);

   // Bitmap Info Header
   cursorData.push32le(40);    // Bitmap Info Header size
   cursorData.push32le(w);
   cursorData.push32le(h*2);
   cursorData.push16le(1);
   cursorData.push16le(32);
   cursorData.push32le(0);     // Uncompressed Pixel Data
   cursorData.push32le(RGBImageDataSize  + (2 * maskSize));
   cursorData.push32le(0);
   cursorData.push32le(0);
   cursorData.push32le(0);
   cursorData.push32le(0);

   /*
    * Store the image data.
    * Note that the data is specified UPSIDE DOWN, like in a .bmp file.
    */
   for (y = h-1; y >= 0; y -= 1) {
      for (x = 0; x < w; x += 1) {
         /*
          * The mask is an array where each bit position indicates whether or
          * not the pixel is transparent. We need to convert that to an alpha
          * value for the pixel (clear or solid).
          */
         var arrayPos = y * Math.ceil(w/8) + Math.floor(x/8);
         var alpha = 0;
         if (mask.length > 0) {
            alpha = (mask[arrayPos] << (x % 8)) & 0x80 ? 0xff : 0;
         }

         arrayPos = ((w * y) + x) * 4;
         cursorData.push8(pixels[arrayPos]);
         cursorData.push8(pixels[arrayPos+1]);
         cursorData.push8(pixels[arrayPos+2]);
         if (mask.length > 0) {
            cursorData.push8(alpha);
         } else {
            cursorData.push8(pixels[arrayPos+3]);
         }
      }
   }

   /*
    * The XOR and AND masks need to be specified - but the data is unused
    * since the alpha channel of the cursor image is sufficient. So just
    * fill in a blank area for each.
    */
   for (y = 0; y < h; y += 1) {
      // The masks are single bit per pixel too
      for (x = 0; x < Math.ceil(w/8); x +=1) {
         cursorData.push8(0);
      }
   }

   for (y = 0; y < h; y += 1) {
      // The masks are single bit per pixel too
      for (x = 0; x < Math.ceil(w/8); x +=1) {
         cursorData.push8(0);
      }
   }

   var url = 'data:image/x-icon;base64,' + Base64.encodeFromArray(cursorData);
   this._currentCursorURI = 'url(' + url + ') ' + hotx + ' ' + hoty + ', default';
   this._updateCanvasCursor();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readOffscreenCopyRect
 *
 *    Parses payload of an offscreen copy rectangle packet.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readOffscreenCopyRect = function (rect) {
   rect.srcBuffer = this._readByte();
   rect.dstBuffer = this._readByte();
   rect.srcX = this._readInt16();
   rect.srcY = this._readInt16();
   this._nextRect();
};


/*
 *-----------------------------------------------------------------------------
 *
 * _readUpdateCacheData
 *
 *    Parses payload of an updateCache rectangle packet.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *-----------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readUpdateCacheData = function (rect) {
   "use strict";

   rect.data = this._readBytes(rect.dataLength);
   this._nextRect();
};

WMKS.VNCDecoder.prototype._readUpdateCacheInitData = function (rect) {
   "use strict";

   this._skipBytes(4);                         // VNCVMWMessageHeader
   this._skipBytes(4);                         // flags, not really used
   rect.updateCacheEntries = this._readInt16();
   this._skipBytes(4);                         // size in kb, not really used
   this._nextRect();
};


/*
 *-----------------------------------------------------------------------------
 *
 * _readUpdateCacheRect
 *
 *    Reads the cached update opcode and dispatches to the correct handler.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *-----------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readUpdateCacheRect = function (rect) {
   "use strict";

   rect.opcode = this._readByte();
   rect.slot = this._readInt16();
   rect.dataLength = this._readInt16();

   if (rect.opcode != this.updateCacheOpInit) {
      this._setReadCB(rect.dataLength, this._readUpdateCacheData, rect);
   } else {
      this._setReadCB(rect.dataLength, this._readUpdateCacheInitData, rect);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _readVMWDefineCursorData
 *
 *    Parses a VMware cursor definition payload.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Changes the cursor in the browser.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readVMWDefineCursorData = function (rect) {
   var y, x,
       andData = [], pixels = [], mask = [],
       hexMask, pixelIdx, maskIdx, channels;

   // If this is a color cursor
   if (rect.cursorType === 0) {
       if (rect.masklength > 0) {
          andData = this._readBytes(rect.masklength);
       }

       if (rect.pixelslength > 0) {
          pixels = this._readBytes(rect.pixelslength);
       }

      for (y = 0; y < rect.height; y++) {
         for (x = 0; x < rect.width; x++) {
            pixelIdx = x + y * rect.width;
            maskIdx = y * Math.ceil(rect.width / 8) + Math.floor(x / 8);
            // The mask is actually ordered 'backwards'
            hexMask = 1 << (7 - x % 8);

            // If the and mask is fully transparent
            if ((andData[pixelIdx * 4] === 255) &&
                (andData[pixelIdx * 4 + 1] === 255) &&
                (andData[pixelIdx * 4 + 2] === 255) &&
                (andData[pixelIdx * 4 + 3] === 255)) {
                // If the pixels at this point should be inverted then
                // make the image actually a simple black color.
                for (var channel = 0; channel < 4; channel++) {
                   if (pixels[pixelIdx * 4 + channel] !== 0) {
                     pixels[pixelIdx * 4 + channel] = 0;
                     mask[maskIdx] |= hexMask;
                   }
                }
                // Otherwise leave the mask alone
            } else {
                mask[maskIdx] |= hexMask;
            }
         }
      }
   } else if (rect.cursorType === 1) {      // An Alpha Cursor
       if (rect.pixelslength > 0) {
          pixels = this._readBytes(rect.pixelslength);

          // Recognise and correct a special case cursor - 1x1 fully
          // transparent cursor, which the server sends when the
          // cursor is invisible.  Some browsers render fully
          // transparent cursors as fully opaque, so add a tiny bit of
          // alpha.  This cursor should never be seen as the
          // cursorVisible state should kick in to hide it, but add
          // this as an additional guard against the "extra black dot"
          // cursor of various bug reports.
          //
          if (rect.pixelslength == 4 && pixels[3] == 0) {
             pixels[3] = 1;
          }
       }
   }

   this._changeCursor(pixels, mask,
                      rect.x,
                      rect.y,
                      rect.width,
                      rect.height);
   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readVMWDefineCursor
 *
 *    Parses a VMware cursor definition header.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readVMWDefineCursor = function (rect) {
   /*
    * Start with 2 bytes of type (and padding).
    */
   rect.cursorType = this._readByte();
   this._skipBytes(1);

   rect.pixelslength = 4 * rect.width * rect.height;

   if (rect.cursorType === 0) {
      rect.masklength = rect.pixelslength;
   } else {
      rect.masklength = 0;
   }

   this._setReadCB(rect.pixelslength + rect.masklength,
                   this._readVMWDefineCursorData, rect);
};


/*
 *------------------------------------------------------------------------------
 *
 * _updateCanvasCursor
 *
 *    Look at all cursor and browser state and decide what the canvas
 *    cursor style should be.
 *
 *    Note the following caveats:
 *       - MSIE does not support data-uri based cursors, only default or none.
 *       - Firefox on OSX must use "none, !important", not "none", with a
 *            bad bug otherwise (...)
 *       - Chrome and Safari should use "none", and get an extra black dot
 *            for "none, !important"
 *
 *    Apply the new style only if something has changed.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Changes the cursor in the browser.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._updateCanvasCursor = function() {
   var str;
   var currentElement;
   if (this._cursorVisible) {
      if (WMKS.BROWSER.isIE()) {
         // IE is not compatible with dataURI cursors
         str = "default";
      } else {
         str = this._currentCursorURI;
      }
   } else {
      if (WMKS.BROWSER.isFirefox() && WMKS.BROWSER.isMacOS()) {
         str = "none, !important";
      } else {
         // IE is not compatible with "none, !important"
         // Firefox on linux ignores "none, !important"
         str = "none";
      }
   }

   currentElement = this._mediaPlayer || this._canvas[0];
   // At times, we get the same cursor image that's already used, ignore it.
   if (currentElement.style.cursor !== str) {
      currentElement.style.cursor = str;
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _readVMWCursorState
 *
 *    Parses a VMware cursor state update (cursor visibility, etc.).
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Changes the cursor in the browser.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readVMWCursorState = function(rect) {
   var cursorState = this._readInt16();
   this._cursorVisible = !!(cursorState & 0x01);
   this._updateCanvasCursor();
   this.options.onCursorStateChanged(this._cursorVisible);
   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readVMWCursorPosition
 *
 *    Parses a VMware cursor position update.
 *    Ignores the payload as the client cursor cannot be moved in a browser.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readVMWCursorPosition = function (rect) {
   /*
    * We cannot warp or move the host/browser cursor
    */
   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readTypematicInfo
 *
 *    Parses a typematic info update.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readTypematicInfo = function(rect) {
   this.typematicState = this._readInt16(),
   this.typematicPeriod = this._readInt32(),
   this.typematicDelay = this._readInt32();
   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readLEDState
 *
 *    Parses an LED State update.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readLEDState = function(rect) {
   this._keyboardLEDs = this._readInt32();

   this.options.onKeyboardLEDsChanged(this._keyboardLEDs);

   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readFrameStamp
 *
 *    Parses a timestamp frame update.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readFrameStamp = function(rect) {
   this._frameTimestampLo = this._readInt32();
   this._frameTimestampHi = this._readInt32();
   this._nextRect();
};


/*
 *
 * Framebuffer updates
 *
 */


/*
 *------------------------------------------------------------------------------
 *
 * _fillRectWithColor
 *
 *    Fills a rectangular area in the canvas with a solid colour.
  *
 * Results:
 *    None.
 *
 * Side Effects:
 *    A coloured canvas.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._fillRectWithColor = function(canvas2dCtx, x, y,
                                                        width, height, color) {
   var newStyle;
   newStyle = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
   canvas2dCtx.fillStyle = newStyle;
   canvas2dCtx.fillRect(x, y, width, height);
};


/*
 *------------------------------------------------------------------------------
 *
 * _blitImageString
 *
 *    Blits a serialised image (as a string) onto the canvas.
 *    Ignores the Alpha channel information and blits it opaquely.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    A coloured canvas.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._blitImageString = function(canvas2dCtx, x, y,
                                                      width, height, str) {
   var img, i, data;
   img = canvas2dCtx.createImageData(width, height);
   data = img.data;
   for (i=0; i < (width * height * 4); i=i+4) {
      data[i    ] = str.charCodeAt(i + 2);
      data[i + 1] = str.charCodeAt(i + 1);
      data[i + 2] = str.charCodeAt(i + 0);
      data[i + 3] = 255; // Set Alpha
   }
   canvas2dCtx.putImageData(img, x, y);
};


/*
 *------------------------------------------------------------------------------
 *
 * _copyRectGetPut
 * _copyRectDrawImage
 * _copyRectDrawImageTemp
 *
 *    Copy a rectangle from one canvas/context to another.  The
 *    canvas/contexts are indicated by an index into this._canvas[]
 *    array.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._copyRectGetPut = function (srcIndex,
                                                      srcX, srcY,
                                                      width, height,
                                                      dstIndex,
                                                      dstX, dstY) {
   var img;
   img = this._canvas[srcIndex].ctx.getImageData(srcX, srcY,
                                                 width, height);

   this._canvas[dstIndex].ctx.putImageData(img, dstX, dstY);
   delete img;
};


WMKS.VNCDecoder.prototype._copyRectDrawImage = function (srcIndex,
                                                         srcX, srcY,
                                                         width, height,
                                                         dstIndex,
                                                         dstX, dstY) {
   this._canvas[dstIndex].ctx.drawImage(this._canvas[srcIndex],
                                        srcX, srcY,
                                        width, height,
                                        dstX, dstY,
                                        width, height);
};


WMKS.VNCDecoder.prototype._copyRectDrawImageTemp = function (srcIndex,
                                                             srcX, srcY,
                                                             width, height,
                                                             dstIndex,
                                                             dstX, dstY) {
   this._copyRectDrawImage(srcIndex,
                           srcX, srcY,
                           width, height,
                           2,
                           srcX, srcY);

   this._copyRectDrawImage(2,
                           srcX, srcY,
                           width, height,
                           dstIndex,
                           dstX, dstY);
};


/*
 *------------------------------------------------------------------------------
 *
 * _lighten
 *
 *    Blend a coloured rectangle onto the frontbuffer canvas.  Useful
 *    for tracking how different parts of the screen are drawn and
 *    debugging protocol operations.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._lighten = function(x, y, w, h, color) {
   "use strict";

   this._canvas[0].ctx.globalCompositeOperation = "lighten";
   this._canvas[0].ctx.fillStyle = color;
   this._canvas[0].ctx.fillRect(x, y, w, h);
   this._canvas[0].ctx.globalCompositeOperation = "source-over";
};


/*
 *------------------------------------------------------------------------------
 *
 * _decodeDiffComp
 *
 *    Decodes a diff-compressed jpeg string from the encoder.  This
 *    permits us to reuse portions of the previous jpeg image - in
 *    particular to copy the quantization and huffman tables which are
 *    frequently identical between successive images.
 *
 *    For more information about diff-compressed jpeg, see the
 *    description of this extension in bora/public/vnc.h.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._decodeDiffComp = function (data, oldData) {
   "use strict";

   var l = 0;
   var i = 0;
   var out = new Uint8Array(1024);
   var data2;

   // Construct a full jpeg rectangle from the first 1024 bytes of the
   // previous rectangle, plus the diff-compressed incoming data.
   //
   while (i < data.length && l <= out.length) {
      switch (data[i++]) {
      case this.diffCompCopyFromPrev:
         // Copy up to 255 bytes from the previous decompressed
         // rectangle.
         var nr = data[i++];
         out.set(oldData.subarray(l, l+nr), l);
         l += nr;
         break;
      case this.diffCompAppend:
         // Append up to 255 bytes from the incoming (compressed)
         // rectangle.
         var nr = data[i++];
         out.set(data.subarray(i, i+nr), l);
         i += nr;
         l += nr;
         break;
      case this.diffCompAppendRemaining:
         // Append the remainder of the incoming rectangle.  This is
         // the final opcode.
         data2 = new Uint8Array(l + data.length - i);
         data2.set(out.subarray(0, l), 0);

         // It is possible that i == data.length at this point, IE10 does not
         // like doing .subarray at the end of an array, so we must avoid it.
         if (i < data.length) {
            data2.set(data.subarray(i), l);
         }

         return data2;
      }
   }

   // This exit point can occur only for small rectangles less than
   // 1024 bytes in length which happen not to finish with an
   // AppendRemaining opcode.  This is legal but rare.
   //
   return out.subarray(0, l);
};


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

WMKS.VNCDecoder.prototype._readTightData = function (rect) {
   /*
    * Skip the preamble and read the actual JPEG data.
    */
   var data = this._readBytes(this.nextBytes),
       URL  = window.URL || window.webkitURL,
       type;

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

   if (rect.subEncoding === this.subEncDiffJpeg) {
      data = this._decodeDiffComp(data, this._lastJpegData);
   }

   if (rect.subEncoding !== this.subEncPNG) {
      this._lastJpegData = data;
      type = 'image/jpeg';
   } else {
      type = 'image/png';
   }

   if (URL) {
      rect.image.onload = this.onDecodeObjectURLComplete;
      rect.image.src = URL.createObjectURL(new Blob([data], {type: type}));
   } else {
      // Ensure data is in base64 string format
      data = Base64.encodeFromArray(data);
      rect.image.onload = this.onDecodeComplete;
      rect.image.src = 'data:' + type + ';base64,' + data;
   }

   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readTightPNG
 *
 *    Parses the head of a compressed FB update payload.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readTightPNG = function (rect) {

   rect.subEncoding = this._readByte();
   rect.subEncoding &= this.subEncMask;

   /*
    * if _mediaPlayer is set, widgetProto is prepared to use a MP4 encoding and we
    * need to notify it to remove video element since it won't be used any more.
    */
   if (this._mediaPlayer) {
      this.options.onEncodingChanged("PNG");
      // Remove all the reference to video element so browser can recycle it in time.
      this.options.mediaPlayer = null;
      this._mediaPlayer = null;
   }

   if (rect.subEncoding === this.subEncFill) {
      rect.color = [];
      rect.color[0] = this._readByte();
      rect.color[1] = this._readByte();
      rect.color[2] = this._readByte();
      rect.color[3] = 0xff;
      this.rectsDecoded++;
      this._nextRect();
   } else {
      var lengthSize = 1;
      var dataSize = this._readByte();
      if (dataSize & 0x80) {
         lengthSize = 2;
         dataSize &= ~0x80;
         dataSize += this._readByte() << 7;
         if (dataSize & 0x4000) {
            lengthSize = 3;
            dataSize &= ~0x4000;
            dataSize += this._readByte() << 14;
         }
      }

      this._setReadCB(dataSize, this._readTightData, rect);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _readH264MP4Rect
 *
 *    Parses the head of a MP4 FB update payload. If this is the first frame of
 *    MP4 stream, we will reset the media source object.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readH264MP4Rect = function(rect) {
   var opcode = this._readInt16();
   var streamId = this._readInt16();
   var dataSize = this._readInt32();

   // Stream is reset on the sever. We need to reset media source object.
   if (opcode === 1) {
      WMKS.LOGGER.log("MP4 encoding is selected and stream is reset.");
      this._mp4Decoder.init(this._mediaPlayer);
   }

   this._setReadCB(dataSize, this._readH264MP4Data, rect);
};


/*
 *------------------------------------------------------------------------------
 *
 * _readH264MP4Data
 *
 *       Parses a MP4 FB update payload and play the video if Media source object
 *    is ready. Otherwise, put the data to the cache.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readH264MP4Data = function(rect) {
   this._mp4Decoder.appendData(this._readBytes(this.nextBytes));
   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readCopyRect
 *
 *    Parses a CopyRect (blit) FB update.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readCopyRect = function (rect) {
   rect.srcX = this._readInt16();
   rect.srcY = this._readInt16();
   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readRaw
 *
 *    Reads a raw rectangle payload.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readRaw = function (rect) {
   rect.imageString = this._readString(this.nextBytes);
   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readDesktopSize
 *
 *    Parses a screen size update.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Calls the outer widget's onNewDesktopSize callback.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readDesktopSize = function (rect) {
   this._FBWidth = rect.width;
   this._FBHeight = rect.height;

   /*
    * Resize the canvas to the new framebuffer dimensions.
    */
   this.options.onNewDesktopSize(this._FBWidth, this._FBHeight);
   this._nextRect();
};


/*
 *------------------------------------------------------------------------------
 *
 * _readRect
 *
 *    Parses an FB update rectangle.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._readRect = function() {
   var i = this.rectsRead;

   this.rect[i] = {};
   this.rect[i].x        = this._readInt16();
   this.rect[i].y        = this._readInt16();
   this.rect[i].width    = this._readInt16();
   this.rect[i].height   = this._readInt16();
   this.rect[i].encoding = this._readInt32();

   if (this.rect[i].encoding !== this.encTightPNG) {
      this.rectsDecoded++;
   }

   switch (this.rect[i].encoding) {
   case this.encRaw:
      this._setReadCB(this.rect[i].width *
                      this.rect[i].height *
                      this._FBBytesPerPixel,
                      this._readRaw, this.rect[i]);
      break;
   case this.encCopyRect:
      this._setReadCB(4, this._readCopyRect, this.rect[i]);
      break;
   case this.encOffscreenCopyRect:
      this._setReadCB(6, this._readOffscreenCopyRect, this.rect[i]);
      break;
   case this.encUpdateCache:
      this._setReadCB(5, this._readUpdateCacheRect, this.rect[i]);
      break;
   case this.encTightPNG:
      this._setReadCB(4, this._readTightPNG, this.rect[i]);
      break;
   case this.encH264MP4:
      this._setReadCB(8, this._readH264MP4Rect);
      break;
   case this.encDesktopSize:
      this._readDesktopSize(this.rect[i]);
      break;
   case this.encVMWDefineCursor:
      this._setReadCB(2, this._readVMWDefineCursor, this.rect[i]);
      break;
   case this.encVMWCursorState:
      this._assumeServerIsVMware();
      this._setReadCB(2, this._readVMWCursorState, this.rect[i]);
      break;
   case this.encVMWCursorPosition:
      this._readVMWCursorPosition(this.rect[i]);
      break;
   case this.encVMWTypematicInfo:
      this._setReadCB(10, this._readTypematicInfo, this.rect[i]);
      break;
   case this.encVMWLEDState:
      this._setReadCB(4, this._readLEDState, this.rect[i]);
      break;
   case this.encVMWFrameStamp:
      this._setReadCB(8, this._readFrameStamp, this.rect[i]);
      break;
   default:
      return this.fail("Disconnected: unsupported encoding " +
                       this.rect[i].encoding);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _evictUpdateCacheEntry
 *
 *    Evict one entry from the update cache.  This is done in response
 *    to the payload of the Begin opcode as well as the destination
 *    slot of the Begin opcode.
 *
 * Results:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._evictUpdateCacheEntry = function(slot) {
   "use strict";

   if (this.updateCache[slot].image !== null) {
      this._releaseImage(this.updateCache[slot].image);
   }

   this.updateCache[slot] = {};
   this.updateCache[slot].image = null;
};


/*
 *----------------------------------------------------------------------------
 *
 * _executeUpdateCacheInit --
 *
 *      Handle the UPDATE_CACHE_OP_INIT subcommand.  This resets the
 *      cache, evicting all entries and resets the cache sizes and
 *      flags.  The sizes and flags must be a subset of those which
 *      the client advertised in the capability packet.
 *
 * Results:
 *      None.
 *
 * Side effects:
 *      Resets update cache.
 *
 *----------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._executeUpdateCacheInit = function(rect) {
   "use strict";

   var i;

   for (i = 0; i < this.updateCacheEntries; i++) {
      this._evictUpdateCacheEntry(i);
   }

   this.updateCache = [];
   this.updateCacheEntries = rect.updateCacheEntries;

   if (this.updateCacheEntries > this.options.cacheSizeEntries) {
      return this.fail("Disconnected: requested cache too large");
   }

   for (i = 0; i < this.updateCacheEntries; i++) {
      this.updateCache[i] = {};
      this.updateCache[i].image = null;
   }
};


/*
 *----------------------------------------------------------------------------
 *
 * _updateCacheInsideBeginEnd --
 *
 *      Returns true if the decoder has received in the current
 *      framebuffer update message a VNC_UPDATECACHE_OP_BEGIN message
 *      but not yet received the corresponding OP_END.
 *
 * Side effects:
 *      None.
 *
 *----------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._updateCacheInsideBeginEnd = function () {
   return this.decodeToCacheEntry !== -1;
};


/*
 *----------------------------------------------------------------------------
 *
 * _updateCacheInitialized --
 *
 *      Returns true if the decoder has been configured to have an
 *      active UpdateCache and the cache size negotiation has
 *      completed..
 *
 * Side effects:
 *      None.
 *
 *----------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._updateCacheInitialized = function () {
   return this.updateCacheSizeEntries !== 0;
};


/*
 *----------------------------------------------------------------------------
 *
 * _executeUpdateCacheBegin --
 *
 *      Handle the UPDATE_CACHE_OP_BEGIN subcommand.  Process the
 *      message payload, which is a mask of cache entries to evict.
 *      Evict any existing entry at the destination slot, and create a
 *      new entry there.
 *
 * Results:
 *      None.
 *
 * Side effects:
 *      Evicts elements of the update cache.
 *      Creates a new cache entry.
 *
 *----------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._executeUpdateCacheBegin = function(rect) {
   "use strict";

   var maskBitBuf;
   var maskState, maskCount;
   var i, j;

   if (!this._updateCacheInitialized() ||
       this._updateCacheInsideBeginEnd() ||
       rect.slot >= this.updateCacheEntries) {
      return this.fail("Disconnected: requested cache slot too large");
   }

   maskBitBuf = new WMKS.BitBuf(rect.data, rect.dataLength);
   maskState = !maskBitBuf.readBits(1);
   maskCount = 0;
   j = 0;

   do {
      maskCount = maskBitBuf.readEliasGamma();
      maskState = !maskState;

      if (maskState) {
         for (i = 0; i < maskCount && i < this.updateCacheEntries; i++) {
            this._evictUpdateCacheEntry(i + j);
         }
      }

      j += maskCount;
   } while (j < this.updateCacheEntries && !maskBitBuf.overflow);


   this.decodeToCacheEntry = rect.slot;
   this._evictUpdateCacheEntry(rect.slot);

   this.updateCache[this.decodeToCacheEntry].imageWidth = rect.width;
   this.updateCache[this.decodeToCacheEntry].imageHeight = rect.height;
};


/*
 *----------------------------------------------------------------------------
 *
 * _executeUpdateCacheEnd --
 *
 *      Handle the UPDATE_CACHE_OP_END subcommand.  Process the
 *      message payload, which is a serialized bitmask of screen
 *      regions to scatter the update image to.
 *
 * Results:
 *      None.
 *
 * Side effects:
 *      Draws to the canvas.
 *
 *----------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._executeUpdateCacheEnd = function(rect) {
   "use strict";

   var update = this.updateCache[this.decodeToCacheEntry];
   var state, count;
   var dstx = 0;
   var dsty = 0;
   var dstw = Math.ceil(this._FBWidth / 16);
   var dsth = Math.ceil(this._FBHeight / 16);
   var srcx = 0;
   var srcy = 0;
   var srcw = update.imageWidth / 16;
   var srch = update.imageHeight / 16;
   var availwidth;
   var bitbuf;

   if (!this._updateCacheInitialized() ||
       !this._updateCacheInsideBeginEnd() ||
       rect.slot != this.decodeToCacheEntry ||
       rect.slot >= this.updateCacheEntries) {
      return this.fail("Disconnected: requested cache slot invalid");
   }

   update.mask = rect.data;
   update.maskLength = rect.dataLength;

   bitbuf = new WMKS.BitBuf(update.mask, update.maskLength);
   state = !bitbuf.readBits(1);
   count = 0;

   do {
      if (count == 0) {
         count = bitbuf.readEliasGamma();
         state = !state;
      }

      availwidth = Math.min(srcw - srcx, dstw - dstx);
      availwidth = Math.min(availwidth, count);

      if (state) {
         // Don't worry if we don't have a full 16-wide mcu at the
         // screen edge.  The canvas will trim the drawImage
         // coordinates for us.
         //
         this._canvas[0].ctx.drawImage(update.image,
                                       srcx * 16,
                                       srcy * 16,
                                       availwidth * 16, 16,
                                       dstx * 16,
                                       dsty * 16,
                                       availwidth * 16, 16);

         srcx += availwidth;
         if (srcx == srcw) {
            srcx = 0;
            srcy++;
         }
      }

      dstx += availwidth;
      if (dstx == dstw) {
         dstx = 0;
         dsty++;
      }

      count -= availwidth;

   } while (dsty < dsth && !bitbuf._overflow);

   this.decodeToCacheEntry = -1;
};


/*
 *----------------------------------------------------------------------------
 *
 * _executeUpdateCacheReplay --
 *
 *      Handle the UPDATE_CACHE_OP_REPLAY subcommand.  Process the
 *      message payload, which is a serialized mask used to subset the
 *      bitmask provided at the time the cache entry being replayed
 *      was created.  Scatters the specified subset of the cached
 *      image to the canvas.
 *
 * Results:
 *      None.
 *
 * Side effects:
 *      Draws to the canvas.
 *
 *----------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._executeUpdateCacheReplay = function(rect) {
   "use strict";

   if (rect.slot >= this.updateCacheEntries) {
      return this.fail("Disconnected: requested cache slot invalid");
   }

   var dstx = 0;
   var dsty = 0;
   var dstw = Math.ceil(this._FBWidth / 16);
   var dsth = Math.ceil(this._FBHeight / 16);
   var availwidth;
   var update = this.updateCache[rect.slot];
   var srcx = 0;
   var srcy = 0;
   var srcw = update.imageWidth / 16;
   var srch = update.imageHeight / 16;

   var maskBitBuf = new WMKS.BitBuf(rect.data, rect.dataLength);
   var updateBitBuf = new WMKS.BitBuf(update.mask, update.maskLength);

   var updateState = !updateBitBuf.readBits(1);
   var updateCount = 0;

   var maskState = !maskBitBuf.readBits(1);
   var maskCount = 0;

   if (!this._updateCacheInitialized() ||
       this._updateCacheInsideBeginEnd() ||
       rect.slot >= this.updateCacheEntries) {
      return this.fail("");
   }

   do {
      if (updateCount == 0) {
         updateCount = updateBitBuf.readEliasGamma();
         updateState = !updateState;
      }
      if (maskCount == 0) {
         maskCount = maskBitBuf.readEliasGamma();
         maskState = !maskState;
      }

      availwidth = dstw - dstx;
      availwidth = Math.min(availwidth, updateCount);

      if (updateState) {
         availwidth = Math.min(availwidth, srcw - srcx);
         availwidth = Math.min(availwidth, maskCount);

         if (maskState) {
            // Don't worry if the right/bottom blocks are not
            // 16-pixel, the canvas will trim the drawImage dimesions
            // for us.
            this._canvas[0].ctx.drawImage(update.image,
                                          srcx * 16,
                                          srcy * 16,
                                          availwidth * 16, 16,
                                          dstx * 16,
                                          dsty * 16,
                                          availwidth * 16, 16);

            if (false) {
               this._lighten(dstx * 16,
                             dsty * 16,
                             availwidth * 16, 16,
                             "red");
            }
         }

         srcx += availwidth;
         if (srcx == srcw) {
            srcx = 0;
            srcy++;
         }

         maskCount -= availwidth;
      }

      dstx += availwidth;
      if (dstx == dstw) {
         dstx = 0;
         dsty++;
      }

      updateCount -= availwidth;

   } while (dsty < dsth &&
            !maskBitBuf._overflow &&
            !updateBitBuf._overflow);
};


/*
 *------------------------------------------------------------------------------
 *
+ * _handleRequestConnectVmxMsg
+ *
+ *    Callback to handle console proxy VMX info request message.
+ *
+ * Results:
+ *    None.
+ *
+ * Side Effects:
+ *    Sends the VMX string passed to the initial connect call.
+ *    Sets next parser callback.
+ *
+ *------------------------------------------------------------------------------
+ */
WMKS.VNCDecoder.prototype._handleVCDProxyVmxPathMessage = function () {
   var requestString = this._readString(17);
   if (requestString !== "connect info vmx\n") {
      return this.fail("Invalid connection vmx request: " + requestString);
   }

   this._sendString(this.options.VCDProxyHandshakeVmxPath);
   this._setReadCB(12, this._peekFirstMessage);
};

/*
 *------------------------------------------------------------------------------
 *
 * _executeUpdateCacheReplay
 *
 *    Dispatch the updateCache commands according to their opcode.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._executeUpdateCache = function(rect) {
   "use strict";

   switch (rect.opcode) {
   case this.updateCacheOpInit:
      this._executeUpdateCacheInit(rect);
      break;
   case this.updateCacheOpBegin:
      this._executeUpdateCacheBegin(rect);
      break;
   case this.updateCacheOpEnd:
      this._executeUpdateCacheEnd(rect);
      break;
   case this.updateCacheOpReplay:
      this._executeUpdateCacheReplay(rect);
      break;
   default:
      return this.fail("Disconnected: requested cache opcode invalid");
   }
};

/*
 *------------------------------------------------------------------------------
 *
 * _executeRectSingle
 *
 *    Execute the update command specified in a single rect.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates the canvas contents.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._executeRectSingle = function (rect) {
   var ctx = this._canvas[0].ctx;

   switch (rect.encoding) {
      case this.encRaw:
         this._blitImageString(ctx,
                               rect.x,
                               rect.y,
                               rect.width,
                               rect.height,
                               rect.imageString);
         rect.imageString = "";
         break;
      case this.encCopyRect:
         this._copyRectBlit(0,      // source index
                            rect.srcX,
                            rect.srcY,
                            rect.width,
                            rect.height,
                            0,      // dest index
                            rect.x,
                            rect.y);
         break;
      case this.encOffscreenCopyRect:
         this._copyRectOffscreenBlit(rect.srcBuffer,
                                     rect.srcX,
                                     rect.srcY,
                                     rect.width,
                                     rect.height,
                                     rect.dstBuffer,
                                     rect.x,
                                     rect.y);
         break;
      case this.encTightPNG:
         if (rect.subEncoding === this.subEncFill) {
            this._fillRectWithColor(ctx,
                                    rect.x,
                                    rect.y,
                                    rect.width,
                                    rect.height,
                                    rect.color);
         } else if (this.decodeToCacheEntry === -1) {
            ctx.drawImage(rect.image,
                          rect.image.destX,
                          rect.image.destY);

            this._releaseImage(rect.image);
            rect.image = null;
         } else {
            this.updateCache[this.decodeToCacheEntry].image = rect.image;
            rect.image = null;
         }
         break;
      case this.encDesktopSize:
      case this.encVMWDefineCursor:
      case this.encVMWCursorState:
      case this.encVMWCursorPosition:
         break;
      case this.encUpdateCache:
         this._executeUpdateCache(rect);
         break;
      default:
         break;
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _executeRects
 *
 *    When this is called, all data for all rectangles is available
 *    and all JPEG images have been loaded. We can noe perform all
 *    drawing in a single step, in the correct order.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates the canvas contents.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._executeRects = function () {
   /*
    * When this is called, all data for all rectangles is
    * available and all JPEG images have been loaded.  We can
    * now perform all drawing in a single step, in the correct order.
    */
   var i;

   if (this._state !== this.FBU_DECODING_STATE) {
      return this.fail("wrong state: " + this._state);
   }

   if (this.rectsDecoded !== this.rects ||
      this.rectsRead !== this.rects) {
      return this.fail("messed up state");
   }

   for (i = 0; i < this.rects; i++) {
      this._executeRectSingle(this.rect[i]);

      delete this.rect[i];
   }

   var now = (new Date()).getTime();
   this._sendAck(now - this.decodeStart);

   this.rects = 0;
   this.rectsRead = 0;
   this.rectsDecoded = 0;
   this.updateReqId = 0;

   if (this._receivedFirstUpdate === false) {
    this.options.onConnected();
    this._receivedFirstUpdate = true;
   }


   var self = this;
   this._state = this.FBU_RESTING_STATE;
   this._getNextServerMessage();


   /*
    * Resting like this is a slight drain on performance,
    * especially at higher framerates.
    *
    * If the client could just hit 50fps without resting (20
    * ms/frame), it will now manage only 47.6fps (21 ms/frame).
    *
    * At lower framerates the difference is proportionately
    * less, eg 20fps->19.6fps.
    *
    * It is however necessary to do something like this to
    * trigger the screen update, as the canvas double buffering
    * seems to use idleness as a trigger for swapbuffers.
    */

   this._msgTimer = setTimeout(this.msgTimeout, 1 /* milliseconds */);
};


/*
 *------------------------------------------------------------------------------
 *
 * _nextRect
 *
 *    Configures parser to process next FB update rectangle,
 *    or progresses to rendering.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._nextRect = function() {
   this.rectsRead++;
   if (this.rectsRead < this.rects) {
      this._setReadCB(12, this._readRect);
   } else {
      this._state = this.FBU_DECODING_STATE;
      if (this.rectsDecoded === this.rects) {
         this._executeRects();
      }
   }
};





/*
 *
 * Server message handling
 *
 */


/*
 *------------------------------------------------------------------------------
 *
 * _gobble
 *
 *    Throws away a sequence of bytes and calls next().
 *    Like _skipBytes(), but usable with _setReadCB().
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Skips a message chunk.
 *    Calls a dynamic callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._gobble = function (next) {
   this._skipBytes(this.nextBytes);
   next();
};


/*
 *------------------------------------------------------------------------------
 *
 * _getNextServerMessage
 *
 *    Sets up parser to expect the head of a new message from the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._getNextServerMessage = function () {
   this._setReadCB(1, this._handleServerMsg);
};



/*
 *------------------------------------------------------------------------------
 *
 * _framebufferUpdate
 *
 *    Parses header of new image being received.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Resets FB update parser.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._framebufferUpdate = function () {
   this.updateReqId = this._readByte();
   this.rects = this._readInt16();
   this.rectsRead = 0;
   this.rectsDecoded = 0;
   this.decodeStart = (new Date()).getTime();
   this._setReadCB(12, this._readRect);
};



/*
 *------------------------------------------------------------------------------
 *
 * _handleServerInitializedMsg
 *
 *    Callback to handle VNC server init'd message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets various instance-wide config vars that describe the connection.
 *    Processes the message.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleServerInitializedMsg = function () {
   var self = this;

   /*
    * Screen size
    */
   this._FBWidth  = this._readInt16();
   this._FBHeight = this._readInt16();

   /*
    * PIXEL_FORMAT
    * We really only need the depth/bpp and endian flag.
    */
   var bpp           = this._readByte();
   var depth         = this._readByte();
   var bigEndian     = this._readByte();
   var trueColor     = this._readByte();

   WMKS.LOGGER.log('Screen: ' + this._FBWidth + ' x ' + this._FBHeight +
                   ', bits-per-pixel: ' + bpp + ', depth: ' + depth +
                   ', big-endian-flag: ' + bigEndian +
                   ', true-color-flag: ' + trueColor);

   /*
    * Skip the 'color'-max values.
    */
   this._skipBytes(6);

   var redShift = this._readByte();
   var greenShift = this._readByte();
   var blueShift = this._readByte();

   WMKS.LOGGER.debug('red shift: ' + redShift +
                     ', green shift: ' + greenShift +
                     ', blue shift: ' + blueShift);

   /*
    * Skip the 3 bytes of padding
    */
   this._skipBytes(3);

   /*
    * Read the connection name.
    */
   var nameLength   = this._readInt32();

   this.options.onNewDesktopSize(this._FBWidth, this._FBHeight);

   /*
    * After measuring on many browsers, these appear to be universal
    * best choices for blits and offscreen blits respectively.
    */
   this._copyRectBlit = this._copyRectDrawImageTemp;
   this._copyRectOffscreenBlit = this._copyRectDrawImage;

   // keyboard.grab();

   if (trueColor) {
      this._FBBytesPerPixel = 4;
      this._FBDepth        = 3;
   } else {
      return this.fail('no colormap support');
   }

   var getFBName = function () {
      self._FBName = self._readString(nameLength);

      self._sendClientEncodingsMsg();
      self._sendFBUpdateRequestMsg(0);

      WMKS.LOGGER.log('Connected ' +
                      (self._encrypted? '(encrypted)' : '(unencrypted)') +
                      ' to: ' + self._FBName);

      self._serverInitialized = true;
      self._getNextServerMessage();
   };

   this._setReadCB(nameLength, getFBName);
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

WMKS.VNCDecoder.prototype._peekFirstMessage = function () {
   this.usedVNCHandshake = (this._receiveQueue[0].data.byteLength == 12);
   if (this.usedVNCHandshake) {
      this._setReadCB(12, this._handleProtocolVersionMsg);
   } else {
      this._setReadCB(24, this._handleServerInitializedMsg);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleSecurityResultMsg
 *
 *    Callback to handle VNC security result message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Processes the message.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleSecurityResultMsg = function () {
   var self = this;
   var reasonLength;
   var handleReason = function() {
      var reason = self._readString(reasonLength);
      self.options.onAuthenticationFailed();
      return self.fail(reason);
   };

   var handleReasonLength = function() {
      reasonLength = self._readInt32();
      self._setReadCB(reasonLength, handleReason);
   };


   switch (this._readInt32()) {
      case 0:  // OK
         /*
          * Send '1' to indicate the the host should try to
          * share the desktop with others.  This is currently
          * ignored by our server.
          */
         this._sendBytes([1]);
         this._setReadCB(24, this._handleServerInitializedMsg);
         return;
      case 1:  // failed
         this._setReadCB(4, handleReasonLength);
         return;
      case 2:  // too-many
         this.options.onAuthenticationFailed();
         return this.fail("Too many auth attempts");
      default:
         return this.fail("Bogus security result");
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleSecurityMsg
 *
 *    Callback to handle VNC security message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Processes the message.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleSecurityMsg = function () {
   var authenticationScheme = 0;
   var numTypes;
   var reasonLength;
   var self = this;

   var handleReason = function() {
      var reason = this._readString(reasonLength);
      self.options.onAuthenticationFailed();
      return self.fail(reason);
   };

   var handleReasonLength = function() {
      reasonLength = self._readInt32();
      self._setReadCB(reasonLength, handleReason);
   };

   var handleSecurityTypes = function() {
      var securityTypes = self._readBytes(numTypes);
      WMKS.LOGGER.log("Server security types: " + securityTypes);
      for (var i=0; i < securityTypes.length; i+=1) {
         if (securityTypes && (securityTypes[i] < 3)) {
            authenticationScheme = securityTypes[i];
         }
      }
      if (authenticationScheme === 0) {
         return self.fail("Unsupported security types: " + securityTypes);
      }
      self._sendBytes([authenticationScheme]);
      WMKS.LOGGER.log('Using authentication scheme: ' + authenticationScheme);
      if (authenticationScheme === 1) {
         // No authentication required - just handle the result state.
         self._setReadCB(4, self._handleSecurityResultMsg);
      } else {
         return self.fail("vnc authentication not implemented");
      }
   };

   numTypes = this._readByte();
   if (numTypes === 0) {
      this._setReadCB(4, handleReasonLength);
   } else {
      this._setReadCB(numTypes, handleSecurityTypes);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleProtocolVersionMsg
 *
 *    Callback to handle VNC handshake message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends own ID string back.
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleProtocolVersionMsg = function () {
   var serverVersionPacket = this._readString(12);
   if (serverVersionPacket !== "RFB 003.008\n") {
      return this.fail("Invalid Version packet: " + serverVersionPacket);
   }
   this._sendString("RFB 003.008\n");
   this._setReadCB(1, this._handleSecurityMsg);
};


/*
 *------------------------------------------------------------------------------
 *
 * _sendClientCaps
 *
 *    Send our VNCVMW client caps to the server.
 *    Right now the only one we send is VNCVMW_CLIENTCAP_HEARTBEAT (0x100).
 *
 * Results:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendClientCaps = function() {
   if (this._serverInitialized) {
      var arr = [];
      var caps = (this.clientCapHeartbeat |
                  this.clientCapAudioAck |
                  this.clientCapSetReconnectToken);
      if (this.options.enableVorbisAudioClips) {
        caps |= this.clientCapVorbisAudioClips;
      } else if (this.options.enableOpusAudioClips) {
        caps |= this.clientCapOpusAudioClips;
      } else if (this.options.enableAacAudioClips) {
        caps |= this.clientCapAacAudioClips;
      }

      if (this.options.enableVMWSessionClose) {
        caps |= this.clientCapSessionClose;
      }

      if (this.serverSupportsMKSVChanClipboard && this.vvcSession) {
        caps |= this.clientCapUseMKSVChanClipboard;
      }
      arr.push8(this.msgVMWClientMessage);
      arr.push8(3);                        // Client caps message sub-type
      arr.push16(8);                       // Length
      arr.push32(caps);                    // Capability mask
      this._sendBytes(arr);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _sendSessionClose
 *
 *    Send our VNCVMW session close request to the server.
 *
 * Results:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendSessionClose = function(closeReason) {
   if (this._serverInitialized &&
       this.useVMWSessionClose &&
       this.options.enableVMWSessionClose) {
      WMKS.LOGGER.log("Send session close to server.");
      var arr = [];
      arr.push8(this.msgVMWClientMessage);
      arr.push8(this.msgVMWSessionClose);
      arr.push16(8);
      arr.push32(closeReason);
      this._sendBytes(arr);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _sendUpdateCacheInfo
 *
 *    Send our VMWUpdateCache cache sizes and capabilities to the server.
 *
 * Results:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._sendUpdateCacheInfo = function() {
   "use strict";

   var arr = [];
   var flags = (this.updateCacheCapReplay |
                this.updateCacheCapDisableOffscreenSurface);
   var cacheSizeEntries = this.options.cacheSizeEntries;
   var cacheSizeKB = this.options.cacheSizeKB;
   WMKS.LOGGER.trace('sendUpdateCacheInfo');
   arr.push8(this.msgVMWClientMessage);
   arr.push8(11);                        // VNCVMWUpdateCacheInfoID
   arr.push16(14);                       // Length
   arr.push32(flags);
   arr.push16(cacheSizeEntries);
   arr.push32(cacheSizeKB);
   this._sendBytes(arr);
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleServerCapsMsg
 *
 *    Parses a VNC VMW server caps message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Might request a change to the client resolution.
 *    Will trigger the sending of our client capabilities.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleServerCapsMsg = function () {
   var caps = this._readInt32();
   this.useVMWKeyEvent = !!(caps & this.serverCapKeyEvent);
   /*
    * serverCapKeyEvent2Unicode, serverCapKeyEvent2JSKeyCode indicates that
    * unicode and raw JS keyCode inputs are handled by the server and
    * options.useUnicodeKeyboardInput indicates that the client
    * should use unicode if possible. The flag allowVMWKeyEventUnicode is set
    * when the above 3 value are true.
    */
   this.allowVMWKeyEvent2UnicodeAndRaw =
      this.options.useUnicodeKeyboardInput &&
      !!(caps & this.serverCapKeyEvent2Unicode) &&
      !!(caps & this.serverCapKeyEvent2JSKeyCode);

   this.useVMWAck      = !!(caps & this.serverCapUpdateAck);
   this.useVMWRequestResolution = !!(caps & this.serverCapRequestResolution);
   this.useVMWAudioAck = !!(caps & this.serverCapAudioAck);
   this.useVMWSessionClose = !!(caps & this.serverCapSessionClose);
   this.serverSupportsMKSVChanClipboard = !!(caps & this.serverCapHasMKSVChanClipboard);

   /*
    * If we have already been asked to send a resolution request
    * to the server, this is the point at which it becomes legal
    * to do so.
    */
   if (this.useVMWRequestResolution &&
      this.requestedWidth > 0 &&
      this.requestedHeight > 0) {
      this.onRequestResolution(this.requestedWidth,
                               this.requestedHeight);
   }

   if (caps & this.serverCapClientCaps) {
      this._sendClientCaps();
   }

   if (caps & this.serverCapUpdateCacheInfo) {
      this._sendUpdateCacheInfo();
   }

   if ((caps & this.serverCapDisablingCopyUI) ||
       (caps & this.serverCapDisablingPasteUI)) {
      var noCopyUI = 0;
      var noPasteUI = 0;
      if (caps & this.serverCapDisablingCopyUI) {
         noCopyUI = 1;
      }
      if (caps & this.serverCapDisablingPasteUI) {
         noPasteUI = 1;
      }
      this.options.onUpdateCopyPasteUI(noCopyUI, noPasteUI);
   }

   this._getNextServerMessage();
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleServerHeartbeatMsg
 *
 *    Parses a VNC VMW server heartbeat message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Calls the user-provided callback for heartbeat events.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleServerHeartbeatMsg = function () {
   var interval = this._readInt16();
   this.options.onHeartbeat(interval);
   this._getNextServerMessage();
};

/*
 *------------------------------------------------------------------------------
 *
 * _handleSessionCloseMsg
 *
 *    Parses a VNC VMW server session close message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Calls the user-provided callback for session close events.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleSessionCloseMsg = function () {
   var closeReason = this._readInt32();
   this.options.onBeforeDisconnected(closeReason);
   this._getNextServerMessage();
};

/*
 *------------------------------------------------------------------------------
 *
 * _handleServerSetReconnectToken
 *
 *    Parses a VNC VMW server setReconnectToken message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Calls the user-provided callback for setReconnectToken events.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleServerSetReconnectTokenMsg = function (len) {
   var token = this._readString(len);
   this.options.onSetReconnectToken(token);
   this._getNextServerMessage();
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleServerAudioMsg
 *
 *    Parses a VNC VMW server audio message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Reads the audio data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleServerAudioMsg = function () {
   var length = this._readInt32();
   var sampleRate = this._readInt32();
   var numChannels = this._readInt32();
   var sampleSize = this._readInt32();
   var containerSize = this._readInt32();
   var timestampL = this._readInt32();
   var timestampH = this._readInt32();
   var flags = this._readInt32();

   var audioInfo = {sampleRate: sampleRate,
                    numChannels: numChannels,
                    containerSize: containerSize,
                    sampleSize: sampleSize,
                    length: length,
                    audioTimestampLo: timestampL,
                    audioTimestampHi: timestampH,
                    frameTimestampLo: this._frameTimestampLo,
                    frameTimestampHi: this._frameTimestampHi,
                    flags: flags,
                    data: null};

   this._setReadCB(length, this._handleServerAudioMsgData, audioInfo);
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleServerAudioMsgData
 *
 *    Reads VNC VMW audio data.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Calls the user-provided callback for audio events.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleServerAudioMsgData = function (audioInfo) {
   audioInfo.data = this._readBytes(audioInfo.length);
   /*
    * Web client and native client should have the same behavior on
    * audio ack (native client: VNCDecodeReadAudio). Old servers and
    * new servers behave differently though because new servers check
    * the client audioack capability flag. Here is the detail:
    *
    * Old servers:
    *
    * ServerCap (useVMWAudioAck) can be true of false. The audioInfo.flags
    * is always set to zero. Hence audioflagRequestAck flag is neglected for
    * old servers. We send audio acks purely depending on whether the server
    * supports audioack or not.
    *
    * New servers:
    *
    * ServerCap (useVMWAudioAck) is always set to true. The audioInfo.flags
    * contains the audiotype in the most significant 8 bits. So this flag
    * is supposed to be non-zero. If the audioflagRequestAck bit is set,
    * we send audio ack. Otherwise we don't send audio ack.
    *
    * A special case for new server is client does not specify audiotype, In
    * this rare case, we always send audio ack.
    */
   if (this.useVMWAudioAck &&
       (audioInfo.flags == 0 ||
       (audioInfo.flags & this.audioflagRequestAck))) {
      this._sendAudioAck(audioInfo.audioTimestampLo,
                         audioInfo.audioTimestampHi);
   }
   this.options.onAudio(audioInfo);
   this._getNextServerMessage();
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleServerCutText
 *
 *    Parses a server cut text message.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Calls the user-provided callback for cut text (copy) events.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleServerCutText = function (length) {
   var txt = this._readStringUTF8(length);
   this.options.onCopy(txt);
   this._getNextServerMessage();
};


/*
 *------------------------------------------------------------------------------
 *
 * _handleServerMsg
 *
 *    Parses a VNC message header and dispatches it to the correct callback.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Parses first byte of a message (type ID).
 *    Sets next parser callback.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._handleServerMsg = function () {
   var length, c, red, green, blue;
   var self = this;
   var msgType = this._readByte();

   switch (msgType) {
   case this.msgFramebufferUpdate:
      this._setReadCB(3, this._framebufferUpdate);
      break;
   case this.msgSetColorMapEntries:
      var getNumColors = function () {
         self._skipBytes(3);
         var numColors = self._readInt16();
         // XXX: just ignoring incoming colors
         self._setReadCB(6 * numColors, self._gobble, self._getNextServerMessage);
      };
      this._setReadCB(5, getNumColors);
      break;
   case this.msgRingBell:
      this._getNextServerMessage();
      break;
   case this.msgServerCutText:
      var getServerCutTextHead = function () {
         self._readBytes(3);  // Padding
         length = self._readInt32();
         if (length > 0) {
            self._setReadCB(length, self._handleServerCutText, length);
         } else {
            self._getNextServerMessage();
         }
      };

      this._setReadCB(8, getServerCutTextHead);
      break;
   case this.msgVMWSrvMessage:
      var getVMWSrvMsgHead = function () {
         var id = self._readByte();
         var len = self._readInt16();

         // VMWServerCaps
         if (id === this.msgVMWSrvMessage_ServerCaps) {
            if (len !== 8) {
               self.options.onProtocolError();
               return self.fail('invalid length message for id: ' + id + ', len: ' + len);
            }
            self._setReadCB(len - 4, self._handleServerCapsMsg);

         // VMWHeartbeat
         } else if (id === this.msgVMWSrvMessage_Heartbeat) {
            if (len !== 6) {
               self.options.onProtocolError();
               return self.fail('invalid length message for id: ' + id + ', len: ' + len);
            }
            self._setReadCB(len - 4, self._handleServerHeartbeatMsg);

         // VMWSetReconnectToken
         } else if (id === this.msgVMWSrvMessage_SetReconnectToken) {
            self._setReadCB(len - 4, self._handleServerSetReconnectTokenMsg,
                            len - 4);

         // VMWAudio
         } else if (id === this.msgVMWSrvMessage_Audio) {
            if (len !== 36) {
               self.options.onProtocolError();
               return self.fail('invalid length message for id: ' + id + ', len: ' + len);
            }
            self._setReadCB(len - 4, self._handleServerAudioMsg);

         // VMWSessionClose
         } else if (id === this.msgVMWSrvMessage_SessionClose) {
            if (len !== 8) {
               self.options.onProtocolError();
               return self.fail('invalid length message for id: ' + id + ', len: ' + len);
            }
            self._setReadCB(len - 4, self._handleSessionCloseMsg);

         // Unhandled message type -- just gobble it and move on.
         } else {
            var bytesLeft = len - 4;
            if (bytesLeft === 0) {
               self._getNextServerMessage();
            } else {
               self._setReadCB(bytesLeft, self._gobble, self._getNextServerMessage);
            }
         }
      };

      this._setReadCB(3, getVMWSrvMsgHead);
      break;

   default:
      this.options.onProtocolError();
      return this.fail('Disconnected: illegal server message type ' + msgType);
   }

};



/*
 *------------------------------------------------------------------------------
 *
 * _processMessages
 *
 *    VNC message loop.
 *    Dispatches data to the specified callback(s) until nothing is left.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Calls dynamically specified callbacks.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype._processMessages = function () {
   while (this._state === this.VNC_ACTIVE_STATE &&
         this._receiveQueueBytesUnread() >= this.nextBytes) {
      var nrBytes = this.nextBytes;
      var before = this._receiveQueueBytesUnread();
      this.nextFn(this.nextArg);
      var after = this._receiveQueueBytesUnread();
      if (nrBytes < before - after) {
         return this.fail("decode overrun " + nrBytes + " vs " +
                          (before - after));
      }
   }
};





/** @public */

/*
 *
 * Event handlers called from the UI
 *
 */


/*
 *------------------------------------------------------------------------------
 *
 * onMouseMove
 *
 *    Updates absolute mouse state internally and on the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.onMouseMove = function (x, y) {
   this._mouseX = x;
   this._mouseY = y;

   if (this._serverInitialized) {
      this._mouseActive = true;
      if (this._mouseTimer === null) {
         this._sendMouseEvent();
         this._mouseTimer = setTimeout(this.mouseTimeout,
                                       this.mouseTimeResolution);
      }
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * onMouseButton
 *
 *    Updates absolute mouse state internally and on the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.onMouseButton = function (x, y, down, bmask) {
   this._mouseX = x;
   this._mouseY = y;
   if (down) {
      this._mouseButtonMask |= bmask;
   } else {
      this._mouseButtonMask &= ~bmask;
   }
   if (this._serverInitialized) {
      this._mouseActive = true;
      this._sendMouseEvent();
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * onKeyVScan
 *
 *    Sends a VMware VScancode key event to the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.onKeyVScan = function (keysym, down) {
   if (this._serverInitialized) {
      var arr = [];
      arr.push8(this.msgVMWClientMessage);
      arr.push8(this.msgVMWKeyEvent);   // Key message sub-type
      arr.push16(8);  // Length
      arr.push16(keysym);
      arr.push8(down);
      arr.push8(0);   /// padding
      this._sendBytes(arr);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * onVMWKeyUnicode
 *
 *    Sends the keycode to the server as is from the browser.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.onVMWKeyUnicode = function (key, down, raw) {
   if (this._serverInitialized) {
      var arr = [];
      arr.push8(this.msgVMWClientMessage);
      arr.push8(this.msgVMWKeyEvent2);    // VMW unicode key message sub-type
      arr.push16(10);   // length
      arr.push32(key);
      arr.push8(down);
      arr.push8(raw);
      this._sendBytes(arr);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * onMouseWheel
 *
 *    Sends a VMware mouse wheel event to the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.onMouseWheel = function(x, y, dx, dy) {
   if (this._serverInitialized) {
      var arr = [];
      arr.push8(this.msgVMWClientMessage);
      arr.push8(this.msgVMWPointerEvent2);    // Pointer event 2 message sub-type
      arr.push16(19);  // Length
      arr.push8(1);    // isAbsolute
      arr.push32(x);
      arr.push32(y);
      arr.push32(0);
      arr.push8(dy);
      arr.push8(dx);
      this._sendBytes(arr);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * onRequestResolution
 *
 *    Schedules a rate-limited VMware resolution request from client
 *    to server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.onRequestResolution = function(width, height) {
   if (this._serverInitialized &&
       this.useVMWRequestResolution &&
       (width !== this.requestedWidth || height !== this.requestedHeight)) {

      this.resolutionRequestActive = true;

      /*
       * Cancel any previous timeout and start the clock ticking
       * again.  This means that opaque window resizes will not
       * generate intermediate client->server messages, rather we will
       * wait until the user has stopped twiddling for half a second
       * or so & send a message then.
       */
      clearTimeout(this.resolutionTimer);
      this.resolutionTimer = setTimeout(this.resolutionTimeout,
                                        this.resolutionDelay);
      this.requestedWidth = width;
      this.requestedHeight = height;
   }
};


/*
 *
 * Connection handling
 *
 */


/*
 *------------------------------------------------------------------------------
 *
 * disconnect
 *
 *    Tears down the WebSocket and discards internal state.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    See above.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.disconnect = function () {
   "use strict";

   if (this._state !== this.DISCONNECTED) {
      this._state = this.DISCONNECTED;
      if (this._mp4Decoder) {
         this._mp4Decoder.reset();
         this._mp4Decoder = null;
      }
      this._receiveQueueReset();
      this.rects = 0;
      this._receivedFirstUpdate = false;

      if (this._websocket) {
         // User initialized closed.
         this._sendSessionClose(23);
         this._websocket.onopen    = null;
         this._websocket.onclose   = null;
         this._websocket.onmessage = null;
         this._websocket.onerror   = null;
         this._websocket.close();
         delete this._websocket;
      }
      this._serverInitialized = false;
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * connect
 *
 *    Initialises the client and connects to the server.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Resets state and connects to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.connect = function (destinationUrl) {
   var self = this;

   this.setRenderCanvas(this.options.canvas);
   this._mediaPlayer = this.options.mediaPlayer;

   /*
    * This closure is run whenever the handler indicates it's
    * completed its decoding pass. We use it to indicate to the
    * server that we've decoded this request if this is the last
    * rect in the update.
    */
   this.onDecodeComplete = function () {
      self.rectsDecoded++;
      if (self.rectsDecoded === self.rects && self.rectsRead === self.rects) {
         self._state = self.FBU_DECODING_STATE;
         self._executeRects();
      }
   };

   this.onDecodeObjectURLComplete = function() {
      URL.revokeObjectURL(this.src);
      self.onDecodeComplete();
   };

   this.msgTimeout = function() {
      self._state = self.VNC_ACTIVE_STATE;
      self._processMessages();
   };

   this.mouseTimeout = function() {
      self._mouseTimer = null;
      if (self._mouseActive) {
         self._sendMouseEvent();
         self._mouseTimer = setTimeout(self.mouseTimeout, self.mouseTimeResolution);
      }
   };

   /*
    * Timer callback to limit the rate we send resolution-request
    * packets to the server.  No more than once a second is plenty.
    */
   this.resolutionTimeout = function() {
      if (self.resolutionRequestActive) {
         self._sendResolutionRequest();
         self.resolutionRequestActive = false;
      }
   };

   if (this.options.VCDProxyHandshakeVmxPath) {
      this._setReadCB(17, this._handleVCDProxyVmxPathMessage);
   } else {
      this._setReadCB(12, this._peekFirstMessage);
   }

   this._url = destinationUrl;
   this._receiveQueueReset();

   this.wsOpen = function (evt) {
      self._state = self.VNC_ACTIVE_STATE;
      if (this.protocol !== "binary" &&
          this.protocol !== "vmware-vvc") {
         return this.fail("no agreement on protocol");
      }

      if (this.protocol === "vmware-vvc") {
         self._setupVVC();
         WMKS.LOGGER.log('WebSocket is using VMware Virtual Channels');
         this.protocol = "binary";
      }

      if (this.protocol === "binary") {
         this.binaryType = "arraybuffer";
         WMKS.LOGGER.log('WebSocket HAS binary support');
      }

      // Note: this is after _setupVVC() in case the UI wants to add vvc listeners.
      self.options.onConnecting(self.vvc, self.vvcSession);

      WMKS.LOGGER.log('WebSocket created protocol: ' + this.protocol);
   };

   this.wsClose = function (evt) {
      self.options.onDisconnected(evt.reason, evt.code);
   };

   this.wsMessage = function (evt) {
      if (typeof evt.data !== "string") {
         // This should always be the case, as the protocol is now
         // always binary.
         self._receiveQueue.push(evt);
         self._receiveQueueLength += evt.data.byteLength;
      } else {
         return self.fail("non-binary message");
      }
      self._processMessages();
   };

   this.wsError = function (evt) {
      self.options.onError(evt);
   };

   this.protocolList = ["binary"];

   if (this.options.enableVVC) {
      this.protocolList.push("vmware-vvc");
   }

   this._setupConnection = function () {
      self._websocket = WMKS.WebSocket(self._url, self.protocolList);
      self._websocket.onopen = self.wsOpen;
      self._websocket.onclose = self.wsClose;
      self._websocket.onmessage = self.wsMessage;
      self._websocket.onerror = self.wsError;
   };

   this._setupVVC = function() {
      self.vvc = new VVC();
      self.vvcSession = self.vvc.openSession(self._websocket);

      self.vvcSession.onerror = function(status) {
         self.vvcSession.close();
      };

      self.vvcSession.ontransportclose = function(evt) {
         self.wsClose(evt);
      };

      self.vvcSession.ontransporterror = function(evt) {
         self.wsError(evt);
      };

      var listener = self.vvc.createListener(self.vvcSession, "blast-*");

      listener.onpeeropen = function(session, channel) {
         if (channel.name === "blast-mks") {
            channel.onclose = function(evt) {
               session.close();
               self._websocket = null;
               self.disconnect();
            };

            channel.onerror = function(evt) {
               session.close();
               self._websocket = null;
               self.disconnect();
            };

            self._websocket   = channel;
            channel.onmessage = self.wsMessage;
            session.acceptChannel(channel);
         } else if (channel.name === "blast-audio") {
            channel.onclose = function(evt) {
               session.close();
            };

            channel.onerror = function(evt) {
               session.close();
            };

            channel.onmessage = self.wsMessage;
            session.acceptChannel(channel);
         }
      };
   }

   this._retryConnectionTimeout = function() {
      if (self._state === self.DISCONNECTED) {
         WMKS.LOGGER.log("Connection timeout. Retrying now.");
         if (self._websocket) {
            self._websocket.onclose = function() {};
            self._websocket.close();
            self._websocket = null;
         }
         self._setupConnection();
      }
      self._retryConnectionTimer = null;
   };

   if (this.options.enableUint8Utf8) {
      addUint8Utf8(this);
   }

   this._setupConnection();

   if (this.options.retryConnectionInterval > 0) {
      // only retry once here.
      WMKS.LOGGER.log("Check connection status after " +
                       this.options.retryConnectionInterval + "ms.");
      this._retryConnectionTimer =
         setTimeout(this._retryConnectionTimeout,
                    this.options.retryConnectionInterval);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * setRenderCanvas
 *
 *    Set the canvas that is used to render the image data. Used by the
 *    analyzer to redirect pixel data to a backbuffer.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    This canvas is also used as the source for blits, so it should be set
 *    early on and not modified externally afterwards.
 *
 *------------------------------------------------------------------------------
 */

WMKS.VNCDecoder.prototype.setRenderCanvas = function (rc) {
   this._canvas[0] = rc;
   this._canvas[0].ctx = rc.getContext('2d');

   if (!this._canvas[0].ctx.createImageData) {
      throw("no canvas imagedata support");
   }
};
