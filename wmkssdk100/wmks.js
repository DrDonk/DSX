(function() {

function stringFromArray (data) {
   var length = data.length,
      tmp = new Array(Math.ceil(length / 8)),
      i, j;

   for (i = 0, j = 0; i < length; i += 8, j++) {
      tmp[j] = String.fromCharCode(data[i],
                                     data[i + 1],
                                     data[i + 2],
                                     data[i + 3],
                                     data[i + 4],
                                     data[i + 5],
                                     data[i + 6],
                                     data[i + 7]);
   }

   return tmp.join('').substr(0, length);
};


function arrayFromString (str, useUint8Array) {
   var length = str.length,
      array = useUint8Array ? new Uint8Array(length) : new Array(length),
      i;

   for (i = 0; i+7 < length; i += 8) {
      array[i] = str.charCodeAt(i);
      array[i + 1] = str.charCodeAt(i + 1);
      array[i + 2] = str.charCodeAt(i + 2);
      array[i + 3] = str.charCodeAt(i + 3);
      array[i + 4] = str.charCodeAt(i + 4);
      array[i + 5] = str.charCodeAt(i + 5);
      array[i + 6] = str.charCodeAt(i + 6);
      array[i + 7] = str.charCodeAt(i + 7);
   }

   for (; i < length; i++) {
      array[i] = str.charCodeAt(i);
   }

   return array;
};


var Base64 = {
decodeToArray: function (data, useUint8Array) {
      return arrayFromString(window.atob(data), useUint8Array);
   },

decodeToString: function (data) {
      return window.atob(data);
   },

encodeFromArray: function (data) {
      return window.btoa(stringFromArray(data));
   },

encodeFromString: function (data) {
      return window.btoa(data);
   }
};

/*
 *------------------------------------------------------------------------------
 *
 * wmks\core.js
 *
 *    This file initializes the WMKS root namespace and some of the generic
 *    functionality is defined accordingly.
 *
 *    This contains the following:
 *    1. Global constants (WMKS.CONST)
 *       Specific constants go a level deeper. (Ex: WMKS.CONST.TOUCH, etc.)
 *    2. Generic utility / helper functions.
 *       a. WMKS.LOGGER:   Logging with different log levels.
 *       b. AB.BROWSER:    Detects various browser types and features.
 *       c. WMKS.UTIL:     Utility helper functions.
 *
 *    NOTE: Namespace should be upper case.
 *
 *------------------------------------------------------------------------------
 */

WMKS = {};

/**
 *------------------------------------------------------------------------------
 *
 * WMKS.LOGGER
 *
 *    The logging namespace that defines a log utility. It has:
 *    1. Five logging levels
 *    2. Generic log function that accepts a log level (defaults to LOG_LEVEL).
 *    3. Log level specific logging.
 *    4. Log only when requested log level is above or equal to LOG_LEVEL value.
 *    5. Dynamically set logging levels.
 *
 *------------------------------------------------------------------------------
 */

WMKS.LOGGER = new function() {
   'use strict';

   this.LEVEL = {
      TRACE: 0,
      DEBUG: 1,
      INFO:  2,
      WARN:  3,
      ERROR: 4
   };

   // The default log level is set to INFO.
   var _logLevel = this.LEVEL.INFO,
       _logLevelDesc = [' [Trace] ', ' [Debug] ', ' [Info ] ', ' [Warn ] ', ' [Error] '];

   // Logging functions for different log levels.
   this.trace = function(args) { this.log(args, this.LEVEL.TRACE); };
   this.debug = function(args) { this.log(args, this.LEVEL.DEBUG); };
   this.info =  function(args) { this.log(args, this.LEVEL.INFO);  };
   this.warn =  function(args) { this.log(args, this.LEVEL.WARN);  };
   this.error = function(args) { this.log(args, this.LEVEL.ERROR); };

   /*
    *---------------------------------------------------------------------------
    *
    * log
    *
    *    The common log function that uses the default logging level.
    *    Use this when you want to see this log at all logging levels.
    *
    *    IE does not like if (!console), so check for undefined explicitly.
    *    Bug: 917027
    *
    *---------------------------------------------------------------------------
    */

   this.log =
      (typeof console === 'undefined' || typeof console.log === 'undefined')?
         $.noop :
         function(logData, level) {
            level = (level === undefined)? this.LEVEL.INFO : level;
            if (level >= _logLevel && logData) {
               // ISO format has ms precision, but lacks IE9 support.
               // Hence use UTC format for IE9.
               console.log((WMKS.BROWSER.isIE()?
                              new Date().toUTCString() : new Date().toISOString())
                           + _logLevelDesc[level] + logData);
            }
         };

   /*
    *---------------------------------------------------------------------------
    *
    * setLogLevel
    *
    *    This public function is used to set the logging level. If the input is
    *    invalid, then the default logging level is used.
    *
    *---------------------------------------------------------------------------
    */

   this.setLogLevel = function(newLevel) {
      if (typeof newLevel === 'number' && newLevel >= 0 && newLevel < _logLevelDesc.length) {
         _logLevel = newLevel;
      } else {
         this.log('Invalid input logLevel: ' + newLevel);
      }
   };
};


/**
 *------------------------------------------------------------------------------
 *
 * WMKS.BROWSER
 *
 *    This namespace object contains helper function to identify browser
 *    specific details such as isTouchDevice, isIOS, isAndroid, etc.
 *
 *    Browser version detection is available through the object "version" like
 *    so:
  *    * WMKS.BROWSER.version.full (String)
 *      - Full version string of the browser.
 *        e.g For Chrome 35.6.1234 this would be "35.6.1234"
 *    * WMKS.BROWSER.version.major (Integer)
 *      - Major version of the browser.
 *        e.g For Chrome 35.6.1234 this would be 35
 *    * WMKS.BROWSER.version.minor (Integer)
 *      - Minor version of the browser.
 *        e.g For Chrome 35.6.1234 this would be 6
 *    * WMKS.BROWSER.version.float (Float)
 *      - Major and minor version of the browser as a float.
 *        e.g For Chrome 35.6.1234 this would be 35.6
 *------------------------------------------------------------------------------
 */

WMKS.BROWSER = new function() {
   var ua = navigator.userAgent.toLowerCase(),
       vs = navigator.appVersion.toString(),
       trueFunc = function() { return true; },
       falseFunc = function() { return false; };

   // In the wake of $.browser being deprecated, use the following:
   this.isIE = (ua.indexOf('msie') !== -1 || ua.indexOf('trident') !== -1 || ua.indexOf('edge') !== -1)?
                  trueFunc : falseFunc;

   this.isOpera = (ua.indexOf('opera/') !== -1)? trueFunc : falseFunc;
   this.isWebkit = this.isChrome = this.isSafari = this.isBB = falseFunc;

   // Check for webkit engine.
   if (!this.isIE() && ua.indexOf('applewebkit') !== -1) {
      this.isWebkit = trueFunc;
      // Webkit engine is used by chrome, safari and blackberry browsers.
      if (ua.indexOf('chrome') !== -1) {
         this.isChrome = trueFunc;
      } else if (ua.indexOf('bb') !== -1) {
         // Detect if its a BlackBerry browser or higher on OS BB10+
         this.isBB = trueFunc;
      } else if (ua.indexOf('safari') !== -1) {
         this.isSafari = trueFunc;
      }
   }

   // See: https://developer.mozilla.org/en/Gecko_user_agent_string_reference
   // Also, Webkit/IE11 say they're 'like Gecko', so we get a false positive here.
   this.isGecko = (!this.isWebkit() && !this.isIE() && ua.indexOf('gecko') !== -1)
      ? trueFunc : falseFunc;

   this.isFirefox = (ua.indexOf('firefox') !== -1 || ua.indexOf('iceweasel') !== -1)?
                     trueFunc : falseFunc;

   // Flag indicating low bandwidth, not screen size.
   this.isLowBandwidth = (ua.indexOf('mobile') !== -1)? trueFunc : falseFunc;

   // Detect specific mobile devices. These are *not* guaranteed to also set
   // isLowBandwidth. Some however do when presenting over WiFi, etc.
   this.isIOS = ((ua.indexOf('iphone') !== -1) || (ua.indexOf('ipod') !== -1) ||
                 (ua.indexOf('ipad') !== -1))? trueFunc : falseFunc;

   /* typically also sets isLinux */
   this.isAndroid = (ua.indexOf('android') !== -1)? trueFunc : falseFunc;

   // Detect IE mobile versions.
   this.isIEMobile = (ua.indexOf('IEMobile') !== -1)? trueFunc : falseFunc;

   // Flag indicating that touch feature exists. (Ex: includes Win8 touch laptops)
   this.hasTouchInput = ('ontouchstart' in window
                        || navigator.maxTouchPoints
                        || navigator.msMaxTouchPoints)? trueFunc : falseFunc;

   // TODO: Include windows/BB phone as touchDevice.
   this.isTouchDevice = (this.isIOS() || this.isAndroid() || this.isBB())?
                        trueFunc : falseFunc;

   // PC OS detection.
   this.isChromeOS = (ua.indexOf('cros') !== -1)? trueFunc : falseFunc;
   this.isWindows = (ua.indexOf('windows') !== -1)? trueFunc : falseFunc;
   this.isLinux = (ua.indexOf('linux') !== -1)? trueFunc : falseFunc;
   this.isMacOS = (ua.indexOf('macos') !== -1 || ua.indexOf('macintosh') > -1)?
                  trueFunc : falseFunc;

   var getValue = function(regex, index) {
      var match = ua.match(regex);
      return (match && match.length > index && match[index]) || '';
   };
   this.version = { full : "" };
   if(this.isSafari()){
      this.version.full = getValue(/Version[ \/]([0-9\.]+)/i, 1);
   } else if(this.isChrome()){
      this.version.full = getValue(/Chrome\/([0-9\.]+)/i, 1);
   } else if(this.isFirefox()){
      this.version.full = getValue(/(?:Firefox|Iceweasel)[ \/]([0-9\.]+)/i, 1);
   } else if(this.isOpera()){
      this.version.full = getValue(/Version[ \/]([0-9\.]+)/i, 1) || getValue(/(?:opera|opr)[\s\/]([0-9\.]+)/i, 1);
   } else if(this.isIE()){
      this.version.full = getValue(/(?:\b(MS)?IE\s+|\bTrident\/7\.0;.*\s+rv:|\bEdge\/)([0-9\.]+)/i, 2);
   }
   var versionParts = this.version.full.split('.');

   this.version.major = parseInt(versionParts.length > 0 ? versionParts[0] : 0, 10);
   this.version.minor = parseInt(versionParts.length > 1 ? versionParts[1] : 0, 10);
   this.version.float = parseFloat(this.version.full);

   /*
    *---------------------------------------------------------------------------
    *
    * isCanvasSupported
    *
    *    Tests if the browser supports the use of <canvas> elements properly
    *    with the ability to retrieve its draw context.
    *
    *---------------------------------------------------------------------------
    */

   this.isCanvasSupported = function() {
      try {
         var canvas = document.createElement('canvas');
         var result = !!canvas.getContext; // convert to Boolean, invert again.
         canvas = null; // was never added to DOM, don't need to remove
         return result;
      } catch(e) {
         return false;
      }
   };

};


/**
 *------------------------------------------------------------------------------
 *
 * WMKS.CONST
 *
 *    Constant values under CONST namespace that's used across WMKS.
 *
 *------------------------------------------------------------------------------
 */

WMKS.CONST = {
   // Touch events can use the following keycodes to mimic mouse events.
   CLICK: {
      left:       0x1,
      middle:     0x2,
      right:      0x4
   },

   FORCE_RAW_KEY_CODE: {
      8:          true,    // backspace
      9:          true,    // tab
      13:         true     // newline
   }
};


/**
 *------------------------------------------------------------------------------
 *
 * WMKS.UTIL
 *
 *    This namespace object contains common helper function.
 *
 *------------------------------------------------------------------------------
 */

WMKS.UTIL = {
   /*
    *---------------------------------------------------------------------------
    *
    * createCanvas
    *
    *    This function creates a canvas element and adds the absolute
    *    position css to it if the input flag is set.
    *
    *---------------------------------------------------------------------------
    */

   createCanvas: function(addAbsolutePosition) {
      var css = {};
      if (addAbsolutePosition) {
         css.position = 'absolute';
      }
      return $('<canvas/>').css(css);
   },

   /*
    *---------------------------------------------------------------------------
    *
    * createVideo
    *
    *    This function creates a video element and adds the absolute
    *    position css to it if the input flag is set.
    *
    *---------------------------------------------------------------------------
    */

   createVideo: function(addAbsolutePosition) {
      var css = {};
      if (addAbsolutePosition) {
         css.position = 'absolute';
      }
      return $('<video/>').css(css);
   },

   /*
    *---------------------------------------------------------------------------
    *
    * getLineLength
    *
    *    Gets the length of the line that starts at (0, 0) and ends at
    *    (dx, dy) and returns the floating point number.
    *
    *---------------------------------------------------------------------------
    */

   getLineLength: function(dx, dy) {
      return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
   },

   /*
    *---------------------------------------------------------------------------
    *
    * isHighResolutionSupported
    *
    *    Indicates if high-resolution mode is available for this browser. Checks
    *    for a higher devicePixelRatio on the browser.
    *
    *---------------------------------------------------------------------------
    */

   isHighResolutionSupported: function() {
      return window.devicePixelRatio && window.devicePixelRatio > 1;
   },

   /*
    *---------------------------------------------------------------------------
    *
    * isFullscreenNow
    *
    *    Utility function to inform if the browser is in full-screen mode.
    *
    *---------------------------------------------------------------------------
    */

   isFullscreenNow: function() {
      return document.fullscreenElement ||
             document.mozFullScreenElement ||
             document.msFullscreenElement ||
             document.webkitFullscreenElement
             ? true : false;
   },

   /*
    *---------------------------------------------------------------------------
    *
    * isFullscreenEnabled
    *
    *    Utility function that indicates if fullscreen feature is enabled on
    *    this browser.
    *
    *    Fullscreen mode is disabled on Safari as it does not support keyboard
    *    input in fullscreen for "security reasons". See bug 1296505.
    *
    *---------------------------------------------------------------------------
    */

   isFullscreenEnabled: function() {
      return !WMKS.BROWSER.isSafari() &&
             (document.fullscreenEnabled ||
             document.mozFullScreenEnabled ||
             document.msFullscreenEnabled ||
             document.webkitFullscreenEnabled)
             ? true : false;
   },

   /*
    *---------------------------------------------------------------------------
    *
    * toggleFullScreen
    *
    *    This function toggles the fullscreen mode for this browser if it is
    *    supported. If not, it just ignores the request.
    *
    *---------------------------------------------------------------------------
    */

   toggleFullScreen: function(showFullscreen, element) {
      var currentState = WMKS.UTIL.isFullscreenNow(),
          ele = element || document.documentElement;

      if (!WMKS.UTIL.isFullscreenEnabled()) {
         WMKS.LOGGER.warn('This browser does not support fullScreen mode.');
         return;
      }
      if (currentState === showFullscreen) {
         // already in the desired state.
         return;
      }

      // If currently in Fullscreen mode, turn it off.
      if (currentState) {
         if (document.exitFullscreen) {
            document.exitFullscreen();
         } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
         } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
         } else if(document.msExitFullscreen) {
            document.msExitFullscreen();
         }
      } else {
         // Flip to full-screen now.
         if (ele.requestFullscreen) {
            ele.requestFullscreen();
         } else if (ele.mozRequestFullScreen) {
            ele.mozRequestFullScreen();
         } else if (ele.webkitRequestFullscreen) {
            ele.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
         } else if (ele.msRequestFullscreen) {
            ele.msRequestFullscreen();
         }
      }
   }

};

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

/*
 * wmks/websocketInit.js
 *
 *   Contains a helper function to instantiate WebSocket object.
 *
 */




/*
 *------------------------------------------------------------------------------
 *
 * WMKSWebSocket
 *
 *    Create an alternate class that consumes WebSocket and provides a
 *    non-native code constructor we can use to stub out in Jasmine (a
 *    testing framework).
 *
 * Results:
 *    Newly constructed WebSocket.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.WebSocket = function(url, protocol) {
   return new window.WebSocket(url, protocol);
};

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

/*
 *------------------------------------------------------------------------------
 * wmks/ImageManagerWMKS.js
 *
 *    This class abstracts Image caching solution in an optimal way. It takes
 *    care of returning the image in a clean, and memory leak proof manner.
 *    It exposes 2 functions  to get and release images. The get function
 *    returns an Image object either from an unused cache or by creating a new one.
 *    The return function, depending on the max allowed cache size decides to
 *    either add the image to the cache or get rid of it completely.
 *
 *------------------------------------------------------------------------------
 */

function ImageManagerWMKS(imageCacheSize) {
  'use strict';
   var _cacheSize = imageCacheSize;  // Max number of images cached.
   var _cacheArray = [];             // Cache to hold images.

   /*
    *---------------------------------------------------------------------------
    *
    * _getImage
    *
    *    Pushes the current image to the cache if it is not full,
    *    and then deletes the image.
    *
    *---------------------------------------------------------------------------
    */

   var _getImageFromCache = function() {
      if (_cacheArray.length > 0) {
         return _cacheArray.shift();
      } else {
         return new Image();
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _deleteImage
    *
    *    This private function takes an array containing a single image and
    *    deletes the image. The reason for using an array containing the image
    *    instead of 'delete image' call is to comply with javascript strict mode.
    *
    *---------------------------------------------------------------------------
    */

   var _deleteImage = function(imgArray) {
      delete imgArray[0];
      imgArray[0] = null;
      imgArray = null;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _cacheImageOrDelete
    *
    *    Private function that resets event handlers if any. Sets src to an
    *    empty image. Pushes the current image to the cache if it is not full,
    *    else deletes the image.
    *
    *---------------------------------------------------------------------------
    */

   var _cacheImageOrDelete = function(image) {
      // Reset onload and onerror event handlers if any.
      image.onload = image.onerror = null;

      /*
       * Issues with webkit image caching:
       * 1. Setting image.src to null is insufficient to turn off image caching
       *    in chrome (webkit).
       * 2. An empty string alone is not sufficient since browsers may treat
       *    that as meaning the src is the current page (HTML!) which will
       *    lead to a warning on the browsers javascript console.
       * 3. If we set it to an actual string with an empty data URL, this helps
       *    the first time, however when we try to decode the same image again
       *    and again later on, the onload will not be called and we have a
       *    problem.
       * 4. So finally, we use an empty data URL, and append a timestamp to the
       *    data URL so that the browser treats it as a new image every time.
       *    This keeps image cache consistent. PR: 1090976       *
       */
      image.src = "data:image/jpeg;base64," + Base64.encodeFromString(""+$.now());

      if (_cacheArray.length <= _cacheSize) {
         _cacheArray.push(image);
      } else {
         // Image deleting in strict mode causes error. Hence the roundabout way.
         _deleteImage([image]);
      }
   };

   /*
    *---------------------------------------------------------------------------
    *
    * getImage
    *
    *    Public function that invokes a private function _getImageFromCache()
    *    to get an image.
    *
    *---------------------------------------------------------------------------
    */
   this.getImage = function() {
      return _getImageFromCache();
   };

   /*
    *---------------------------------------------------------------------------
    *
    * releaseImage
    *
    *    Public function that invokes a private function _cacheImageOrDelete()
    *    to add the image to a cache when the cache is not full or delete the
    *    image.
    *
    *---------------------------------------------------------------------------
    */
   this.releaseImage = function(image) {
      if (!image) {
         return;
      }
      _cacheImageOrDelete(image);
   };
};
/*********************************************************
 * Copyright (C) 2015 VMware, Inc. All rights reserved.
 *********************************************************/

/*
 * wmks/mp4Decoder.js
 *
 *   WebMKS MP4 decoder prototype.
 *
 */

function MP4Decoder() {
   this._mediaSource = null;
   this._sourceBuffer = null;
   this._tempQueue = [];
   this._mediaPlayer = null;
   MP4Decoder.instanceNumber++;
   this._name = "MP4Decoder" + MP4Decoder.instanceNumber;
};

MP4Decoder.instanceNumber = 0;
MP4Decoder.byteStreamFormat = 'video/mp4; codecs="avc1.640030"';

MP4Decoder.prototype.toString = function() {
   return this._name;
};


/*
 *------------------------------------------------------------------------------
 *
 * _init
 *
 *    Generate a Media Source object and associate it with video DOM element.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype.init = function(mediaPlayer, urlObject, mediaSourceObject) {
   var self = this,
       URL = urlObject || window.URL || window.webkitURL,
       MediaSource = mediaSourceObject || window.MediaSource || window.WebKitMediaSource;

   this.reset();

   this._mediaPlayer = mediaPlayer;
   this._mediaSource = new MediaSource();
   // Attach a media source object to HTMLMediaElement.
   this._mediaPlayer.src = URL.createObjectURL(this._mediaSource);
   this._mediaSource.addEventListener('sourceopen',
   function(e) {
      return self._onMediaSourceOpen(e);
   }, false);
   this._mediaSource.addEventListener('webkitsourceopen',
   function(e) {
      return self._onMediaSourceOpen(e);
   }, false);
};


/*
 *------------------------------------------------------------------------------
 *
 * _onMediaSourceOpen
 *
 *       After media source is open, create a source buffer with MP4 decoder and
 *    attach it to media source object. If there is any MP4 data in the buffer,
 *    add it to source buffer so that media source can play it.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype._onMediaSourceOpen = function (e) {
   var self = this;

   WMKS.LOGGER.log(this + " media source status is changed to open.");
   this._sourceBuffer = this._mediaSource.addSourceBuffer(
      MP4Decoder.byteStreamFormat);

   /*
    * Listen to update event. It will fire after current buffer data is
    * handled by media source object.
    */
   this._sourceBuffer.addEventListener('update', function () {
      self._flushPayloads();
   });

   // If we receive any MP4 during MediaSource initialization process, decode it now.
   this._flushPayloads();
   return;
};


/*
 *------------------------------------------------------------------------------
 *
 * _flushPayloads
 *
 *    Append all the data in our temp buffer to sourceBuffer object.
 *
 * Side Effects:
 *    Display MP4 video.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype._flushPayloads = function () {
   if (!this._sourceBuffer) {
      WMKS.LOGGER.log(this + "source buffer is not ready yet.");
      return;
   }

   while (this._tempQueue.length > 0 && !this._sourceBuffer.updating) {
      this._sourceBuffer.appendBuffer(this._tempQueue.shift());
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * reset
 *
 *    Reset all the resources used by MP4 Decoder object.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype.reset = function() {
   WMKS.LOGGER.log(this + " is reset.");
   if (this._mediaSource) {
      if (this._sourceBuffer) {
         this._mediaSource.removeSourceBuffer(this._sourceBuffer);
         this._sourceBuffer = null;
      }

      /*
       * Only end the stream if media source is open. Otherwise
       * Chrome browser will throw exception.
       */
      if (this._mediaSource.readyState === "open") {
         this._mediaSource.endOfStream();
      }
      this._mediaSource = null;
   }

   if (this._mediaPlayer) {
      this._mediaPlayer.src = "";
      this._mediaPlayer = null;
   }
   this._tempQueue = [];
};


/*
 *------------------------------------------------------------------------------
 *
 * appendData
 *
 *    Append MP4 data to media source object. If media source is not ready, put
 *    it into temporary buffer.
 *
 * Side Effects:
 *    Display MP4 video.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype.appendData = function(payload) {
   if (this._sourceBuffer !== null &&
       this._mediaSource.readyState === "open" &&
       !this._sourceBuffer.updating) {
      this._sourceBuffer.appendBuffer(payload);
   } else {
      this._tempQueue.push(payload);
   }

   if (this._mediaPlayer && this._mediaPlayer.paused) {
      this._mediaPlayer.play();
   }
};/*
 * Some code adapted from:
 * https://github.com/brandonaaron/jquery-mousewheel
 */

/* ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2013, Brandon Aaron (http://brandon.aaron.sh)
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ***** END LICENSE BLOCK ***** */

 /*
 * wmks/mousewheel.js
 *
 *    Event registration for mouse wheel support.
 *
 * jQuery doesn't provide events for mouse wheel movement. This script
 * registers some events we can hook into to detect mouse wheel events
 * in a somewhat cross-browser way.
 *
 * The only information we really need in WebMKS is the direction it scrolled,
 * and not the deltas. This is good, because there is no standard at all
 * for mouse wheel events across browsers when it comes to variables and
 * values, and it's nearly impossible to normalize.
 */

(function() {


var WHEEL_EVENTS = ( 'onwheel' in document || document.documentMode >= 9 ) ?
                   ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'];
var toFix  = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'];

if ( $.event.fixHooks ) {
   for ( var i = toFix.length; i; ) {
      $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
   }
}

/*
 *------------------------------------------------------------------------------
 *
 * onMouseWheelEvent
 *
 *    Handles a mouse wheel event. The resulting event will have wheelDeltaX
 *    and wheelDeltaY values.
 *
 * Results:
 *    The returned value from the handler(s).
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

function onMouseWheelEvent(event) {
   var deltaX   = 0,
       deltaY   = 0,
       dispatch = $.event.dispatch || $.event.handle;

   // Old school scrollwheel delta
   if ( 'detail'      in event ) { deltaY = event.detail * -1;      }
   if ( 'wheelDelta'  in event ) { deltaY = event.wheelDelta;       }
   if ( 'wheelDeltaY' in event ) { deltaY = event.wheelDeltaY;      }
   if ( 'wheelDeltaX' in event ) { deltaX = event.wheelDeltaX * -1; }

   // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
   if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
      deltaX = deltaY * -1;
      deltaY = 0;
   }

   // New school wheel delta (wheel event)
   if ( 'deltaY' in event ) { deltaY = event.deltaY * -1; }
   if ( 'deltaX' in event ) { deltaX = event.deltaX;      }

   // No change actually happened, no reason to go any further
   if ( deltaY === 0 && deltaX === 0 ) { return; }

   event = $.event.fix(event);
   event.type = 'mousewheel';
   delete event.wheelDelta;
   event.wheelDeltaX = deltaX;
   event.wheelDeltaY = deltaY;

   return dispatch.call(this, event);
}


/*
 *------------------------------------------------------------------------------
 *
 * $.event.special.mousewheel
 *
 *    Provides a "mousewheel" event in jQuery that can be binded to a callback.
 *    This handles the different browser events for wheel movements.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

$.event.special.mousewheel = {
   setup: function() {
      if (this.addEventListener) {
         var i;

         for (i = 0; i < WHEEL_EVENTS.length; i++) {
            this.addEventListener(WHEEL_EVENTS[i], onMouseWheelEvent, false);
         }
      } else {
         this.onmousewheel = onMouseWheelEvent;
      }
   },

   tearDown: function() {
      if (this.removeEventListener) {
         var i;

         for (i = 0; i < WHEEL_EVENTS.length; i++) {
            this.removeEventListener(WHEEL_EVENTS[i], onMouseWheelEvent, false);
         }
      } else {
         this.onmousewheel = onMouseWheelEvent;
      }
   }
};


})();

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
// Use the following for js-lint.
/*global WMKS:false, $:false */

/*
 *------------------------------------------------------------------------------
 *
 * wmks/keyboardManager.js
 *
 *   WebMKS related keyboard management is handled here.
 *   There are 2 types of inputs that can be sent.
 *
 *   1. VMware VScanCodes that are handled by the hypervisor.
 *   2. KeyCodes + unicode based messages for Blast+NGP.
 *
 *   The message type to be sent is determined by flags in vncDecoder:
 *      useVMWKeyEvent            // VMware VScanCode key inputs are handled.
 *      useVMWKeyEventUnicode     // unicode key inputs are handled.
 *
 *   Input handling is quite different for desktop browsers with physical
 *   keyboard vs soft keyboards on touch devices. To deal with these we use
 *   separate event handlers for keyboard inputs.
 *
 *------------------------------------------------------------------------------
 */


/*
 * List of keyboard constants.
 */
WMKS.CONST.KB = {

   ControlKeys: [
   /*
    * backspace, tab, enter, shift, ctrl, alt, pause, caps lock, escape,
    * pgup, pgdown, end, home, left, up, right, down, insert, delete,
    * win-left(or meta on mac), win-right, menu-select(or meta-right), f1 - f12,
    * num-lock, scroll-lock
    */
      8, 9, 13, 16, 17, 18, 19, 20, 27,
      33, 34, 35, 36, 37, 38, 39, 40, 45, 46,
      91, 92, 93, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123,
      144, 145
   ],

   /*
    * If you change this, change 'vals' in syncModifiers.
    * shift, ctrl, alt, win-left, win-right
    */
   Modifiers:        [16, 17, 18, 91, 92],

   /*
    * List of characters to discard on an onKeyDown on Windows with Firefox
    * 192 = VK_OEM_3
    */
   Diacritics:       [192],

   KEY_CODE: {
      Shift:         16,
      Ctrl:          17,
      Alt:           18,
      Meta:          91,               // Mac left CMD key.
      Enter:         13,
      CapsLock:      20
   },

   SoftKBRawKeyCodes:      [8, 9, 13], // backspace, tab, newline
   keyInputDefaultValue:   ' ',        // Default value for the input textbox.


   ANSIShiftSymbols:    "~!@#$%^&*()_+{}|:\"<>?",  // ANSI US layout keys that require shift
   ANSINoShiftSymbols:  "`-=[]\\;',./1234567890",  // ANSI US layout keys that do not require shift

   WindowsKeys: {
      left:  91,  // win-left(or meta on Mac, search on ChromeOS)
      right: 92   // win-right
   },

   VScanMap: {}
};

// Map of all ANSI special symbols
WMKS.CONST.KB.ANSISpecialSymbols = WMKS.CONST.KB.ANSIShiftSymbols + WMKS.CONST.KB.ANSINoShiftSymbols;

WMKS.KeyboardManager = function(options) {
   'use strict';
   if (!options || !options.vncDecoder) {
      return null;
   }

   this._vncDecoder = options.vncDecoder;
   // Any raw key that needs to be ignored.
   this.ignoredRawKeyCodes = options.ignoredRawKeyCodes;
   this.fixANSIEquivalentKeys = options.fixANSIEquivalentKeys;
   this.mapMetaToCtrlForKeys = options.mapMetaToCtrlForKeys;

   this.keyDownKeyTimer = null;
   this.keyDownIdentifier = null;
   this.pendingKey = null;
   this.activeModifiers = [];
   this.keyToUnicodeMap = {};
   this.keyToRawMap = {};
   // Use different map with mappings for all unicode --> vScanCode.
   this.UnicodeToVScanMap = WMKS.CONST.KB.VScanMap[options.keyboardLayoutId];

   this._windowsKeyManager = {
      // Windows key simulation is enabled or not.
      enabled: options.enableWindowsKey,
      // Windows key is simulated when Ctrl + Windows are pressed.
      windowsOn: false,
      // left Windows key is down or not.
      leftWindowsDown: false,
      // right Windows key is down or not.
      rightWindowsDown: false,
      // modified keyCode map.
      modifiedKeyMap: {
         Pause : 19 // The keyCode of Pause key should be 19
      },
      modifiedKey: null,

      /*
       * reset
       *
       * It's important to do reset when the browser loses focus.
       * Otherwise, some key release events are not captured when
       * the browser loses focuse. In consequence, the states are incorrect.
       */
      reset: function() {
        this.windowsOn = false;
        this.leftWindowsDown = false;
        this.rightWindowsDown = false;
        this.modifiedKey = null;
      },

      /*
       * keyboardHandler
       *
       * Handles Windows keydown and keyup event.
       */
      keyboardHandler: function(e) {
         if (e.keyCode === WMKS.CONST.KB.WindowsKeys.left) {
            // Left Windows key is down or up.
            this.leftWindowsDown = e.type === 'keydown';
            if (!this.leftWindowsDown) {
               // Left Windows key is released.
               this.windowsOn = false;
            }
         } else if (e.keyCode === WMKS.CONST.KB.WindowsKeys.right) {
            // Right Windows key is down or up.
            this.rightWindowsDown = e.type === 'keydown';
            if (!this.rightWindowsDown) {
               // Right Windows key is released.
               this.windowsOn = false;
            }
         }
      },

      /*
       * modifyKey
       *
       * Invoked by _extractKeyCodeFromEvent. Modify some keyCode value
       * when Windows key is held.
       */
      modifyKey: function(keyCode) {
         /*
          * Fix bug 1436247 - Windows+Pause doesn't work
          * The keyCode of Pause key should be 19. However, when Ctrl key is pressed,
          * Pause's keyCode is modified to 3. To fix this issue, at detecting keyCode
          * 3 while Ctrl and Windows are pressed, convert it to 19 directly.
          */
         if (keyCode === 3) {
            // Pause key with Ctrl emits 3.
            if (this.windowsOn) {
               // When Windows key is pressed, restore Pause key to 19.
               keyCode = this.modifiedKeyMap['Pause'];
               this.modifiedKey = 3;
            } else if (this.modifiedKey === 3) {
               // Pause key is released.
               keyCode = this.modifiedKeyMap['Pause'];
               this.modifiedKey = null;
            }
         }

         return keyCode;
      }
   };

   /*
    *---------------------------------------------------------------------------
    *
    * _extractKeyCodeFromEvent
    *
    *    Attempts to extract the keycode from a given key{down,up} event.  The
    *    value extracted may be a unicode value instead of a normal vk keycode.
    *    If this is the case then the 'isUnicode' property will be set to true.
    *    Additionally, in the unicode case, the caller should not expect a
    *    corresponding keyPress event.
    *
    * Results:
    *    If extraction succeeds, returns an object with 'keyCode' and
    *    'isUnicode' properties, null otherwise.
    *
    *---------------------------------------------------------------------------
    */

   this._extractKeyCodeFromEvent = function(e) {
      var keyCode = 0, isUnicode = false;

      if (e.keyCode) {
         keyCode = e.keyCode;
      } else if (e.which) {
         keyCode = e.which;
      } else if (e.keyIdentifier && e.keyIdentifier.substring(0, 2) === 'U+') {
         /*
          * Safari doesn't give us a keycode nor a which value for some
          * keypresses. The only useful piece of a data is a Unicode codepoint
          * string (something of the form U+0000) found in the keyIdentifier
          * property. So fall back to parsing this string and sending the
          * converted integer to the agent as a unicode value.
          * See bugs 959274 and 959279.
          */
         keyCode = parseInt('0x' + e.keyIdentifier.slice(2), 16);
         if (keyCode) {
            isUnicode = true;
         } else {
            WMKS.LOGGER.log('assert: Unicode identifier=' + e.keyIdentifier
                          + ' int conversion failed, keyCode=' + keyCode);
            return null;
         }
      } else if (e.keyCode === 0 && WMKS.BROWSER.isFirefox() && e.key) {
         /*
          * On Firefox, for some special key such as ü ö ä, the keyCode of
          * onKeyUp and keyDown is 0, but there is a value in key property.
          * See bug 1166133.
           */
         keyCode = 0;
      }else {
         /*
          * On browser except firefox in Japanese, for the special key left to 1 key, the keyCode of
          * onKeyUp and keyDown is 0, and there is no value in key property.
           */
         if (this.UnicodeToVScanMap === WMKS.CONST.KB.VScanMap["ja-JP_106/109"] && !WMKS.BROWSER.isFirefox() && e.keyCode === 0) {
            keyCode = 165;
         } else {
            WMKS.LOGGER.trace('assert: could not read keycode from event, '
                       + 'keyIdentifier=' + e.keyIdentifier);
            return null;
         }
      }

      if (!isUnicode && this._windowsKeyManager.enabled) {
         keyCode = this._windowsKeyManager.modifyKey(keyCode);
      }

      return {
         keyCode: keyCode,
         isUnicode: isUnicode
      };
   };


   /*
    *---------------------------------------------------------------------------
    *
    * onKeyDown
    *
    *    The first step in our input strategy. Capture a raw key. If it is a
    *    control key, send a keydown command immediately. If it is not, memorize
    *    it and return without doing anything. We pick it up in onKeyPress
    *    instead and bind the raw keycode to the Unicode result. Then, in
    *    onKeyUp, resolve the binding and send the keyup for the Unicode key
    *    when the scancode is received.
    *
    * Results:
    *    true if the key is non-raw (let the event through, to allow keypress
    *    to be dispatched.) false otherwise.
    *
    *---------------------------------------------------------------------------
    */

   this.onKeyDown = function(e) {
      var keyCodeRes,
          keyCode = 0,
          isUnicode = false,
          self = this;

      keyCodeRes = this._extractKeyCodeFromEvent(e);
      if (!keyCodeRes) {
         WMKS.LOGGER.log('Extraction of keyCode from keyUp event failed.');
         return false; // don't send a malformed command.
      }
      keyCode = keyCodeRes.keyCode;
      isUnicode = keyCodeRes.isUnicode;

      //WMKS.LOGGER.log("onKeyDown: keyCode=" + keyCode);

      // Sync modifiers because we don't always get correct events.
      this._syncModifiers(e);

      if (keyCode === 0) {
         WMKS.LOGGER.log("onKeyDown: Do not send 0 to server.");
         return true;
      }

      /*
       * Most control characters are 'dangerous' if forwarded to the underlying
       * input mechanism, so send the keys immediately without waiting for
       * keypress.
       */
      if ($.inArray(keyCode, WMKS.CONST.KB.Modifiers) !== -1) {
         // Handled above via syncModifiers
         e.returnValue = false;
         return false;
      }

      if (WMKS.CONST.KB.ControlKeys.indexOf(keyCode) !== -1) {
         e.returnValue = false;
         return this._handleControlKeys(keyCode);
      }


      /*
       * Send the keydown event right now if we were given a unicode codepoint
       * in the keyIdentifier field of the event.  There won't be a
       * corresponding key press event so we can confidently send it right now.
       */
      if (isUnicode) {
         WMKS.LOGGER.log('Send unicode down from keyIdentifier: ' + keyCode);
         self.sendKey(keyCode, false, true);
         e.returnValue = false;
         return false;
      }

      /*
       * Expect a keypress before control is returned to the main JavaScript.
       * The setTimeout(..., 0) is a failsafe that will activate only if the
       * main JavaScript loop is reached. When the failsafe activates, send
       * the raw key and hope it works.
       */
      if (this.keyDownKeyTimer !== null) {
         WMKS.LOGGER.log('assert: nuking an existing keyDownKeyTimer');
         clearTimeout(this.keyDownKeyTimer);
      }

      this.keyDownKeyTimer = setTimeout(function() {
         // WMKS.LOGGER.log('timeout, sending raw keyCode=' + keyCode);
         self.sendKey(keyCode, false, false);
         self.keyDownKeyTimer = null;
         self.pendingKey = null;
      }, 0);
      this.pendingKey = keyCode;

      // Safari has the keyIdentifier on the keydown calls (chrome is on keypress)
      // Save for reference in onKeyPress
      if (e.originalEvent && e.originalEvent.keyIdentifier) {
         this.keyDownIdentifier = e.originalEvent.keyIdentifier;
      }

      /*
       * If Alt or Ctrl or Win (by themselves) are held, inhibit the keypress by
       * returning false.
       * This prevents the browser from handling the keyboard shortcut
       */
      e.returnValue = !(this.activeModifiers.length === 1 &&
         (this.activeModifiers[0] === WMKS.CONST.KB.KEY_CODE.Alt ||
         this.activeModifiers[0] === WMKS.CONST.KB.KEY_CODE.Ctrl ||
         this.activeModifiers[0] === WMKS.CONST.KB.WindowsKeys.left ||
         this.activeModifiers[0] === WMKS.CONST.KB.WindowsKeys.right));
      return e.returnValue;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _handleControlKeys
    *
    *    This function takes care of the control keys and handling these.
    *
    *---------------------------------------------------------------------------
    */

   this._handleControlKeys = function(keyCode) {
      // var isCapsOn = this._vncDecoder._keyboardLEDs & 4;
      // WMKS.LOGGER.log('Led: ' + led + ', Caps: ' + isCapsOn);

      /*
       * Caps lock is an unusual key and generates a 'down' when the
       * caps lock light is going from off -> on, and then an 'up'
       * when the caps lock light is going from on -> off. The problem
       * is compounded by a lack of information between the guest & VMX
       * as to the state of caps lock light. So the best we can do right
       * now is to always send a 'down' for the Caps Lock key to try and
       * toggle the caps lock state in the guest.
       */
      if (keyCode === WMKS.CONST.KB.KEY_CODE.CapsLock && WMKS.BROWSER.isMacOS()) {
         // TODO: Confirm if this works.
         this.sendKey(keyCode, false, false);
         this.sendKey(keyCode, true, false);
         return;
      }
      this.sendKey(keyCode, false, false);
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _syncModifiers
    *
    *    Parse the altKey, shiftKey, metaKey and ctrlKey attributes of an event
    *     to synthesize event keystrokes. The keydown and keyup events are not
    *    reliably sent by all browsers but these attributes are always set,
    *    so key off of these to send keydown and keyup events for those keys.
    *
    *---------------------------------------------------------------------------
    */

   this._syncModifiers = function(e) {
      var thisMod, thisVal, i, idx;
      // This must be in the order of WMKS.CONST.KB.Modifiers
      var vals = [e.shiftKey, e.ctrlKey, e.altKey, e.metaKey, false];
      // var names = ['shift', 'ctrl', 'alt', 'meta']; // used with logging.

      // Do check for AltGr and set ctrl and alt if set
      if (e.altGraphKey === true) {
         vals[1] = vals[2] = true;
      }

      /*
       * On OSX if the meta key (aka CMD) key is pressed along with one of
       * either A, C, V, or X we map the CMD key to CTRL, allowing
       * the Mac user to use CMD-V for CTRL-V etc.
       */
      if (e.metaKey === true && this.mapMetaToCtrlForKeys.indexOf(e.keyCode) !== -1) {
         vals[1] = true;  // turn on CTRL
         vals[3] = false; // turn off CMD
      }

      /*
       * When Windows key simulation is enabled, pressing Ctrl+Win
       * on Windows or Ctrl+CMD on OSX simulates a Windows key.
       */
      if (this._windowsKeyManager.enabled) {
         this._windowsKeyManager.keyboardHandler(e);

         if (e.ctrlKey === true) {
            // Ctrl key is down.
            if (this._windowsKeyManager.leftWindowsDown  ||
               this.activeModifiers.indexOf(WMKS.CONST.KB.WindowsKeys.left) !== -1) {
               // Left Windows key is down.
               vals[1] = false;  // turn off Ctrl
               vals[3] = true;   // turn on left Windows
               // Ctrl + Windows are pressed.
               this._windowsKeyManager.windowsOn = true;
            } else if (this._windowsKeyManager.rightWindowsDown ||
               this.activeModifiers.indexOf(WMKS.CONST.KB.WindowsKeys.right) !== -1) {
               // Right Windows key is down.
               vals[1] = false;  // turn off Ctrl
               vals[4] = true;   // turn on right Windows
               // Ctrl + Windows are pressed.
               this._windowsKeyManager.windowsOn = true;
            }
         }
      }

      for (i = 0; i < WMKS.CONST.KB.Modifiers.length; i++) {
         thisMod = WMKS.CONST.KB.Modifiers[i];
         thisVal = vals[i];

         idx = this.activeModifiers.indexOf(thisMod);
         if (thisVal && idx === -1) {
            //WMKS.LOGGER.log(names[i] + ' down');
            this.activeModifiers.push(thisMod);
            this.sendKey(thisMod, false, false);
         } else if (!thisVal && idx !== -1) {
            //WMKS.LOGGER.log(names[i] + ' up');
            this.activeModifiers.splice(idx, 1);
            this.sendKey(thisMod, true, false);
         }
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * cancelModifiers
    *
    *    Clear all modifiers currently in a 'keydown' state. Used as a cleanup
    *    for onBlur or to clear the modifier state upon close of the
    *    extendedKeypad widget.
    *
    *    applyToSoftKB - When set and is a touch device, perform this action.
    *
    *---------------------------------------------------------------------------
    */

   this.cancelModifiers = function(applyToSoftKB) {
      var i;
      /*
       * On blur events invoke cancelModifiers for desktop browsers. This is not
       * desired in case of softKB (touch devices, as we constantly change focus
       * from canvas to the hidden textbox (inputProxy) - PR 1084858.
       */
      if (WMKS.BROWSER.isTouchDevice() && !applyToSoftKB) {
         return;
      }
      for (i = 0; i < this.activeModifiers.length; i++) {
         this.sendKey(this.activeModifiers[i], true, false);
      }
      this.activeModifiers.length = 0;

      if (this._windowsKeyManager.enabled) {
         // Reset Windows key status.
         this._windowsKeyManager.reset();
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * updateModifiers
    *
    *    This function update the state of the modifiers based on the input.
    *    If the modifier key is down, we add it to the modifier list else remove
    *    it from the list and send the appropriate key info to the protocol.
    *
    *    NOTE: Currently used by extendedKeypad widget.
    *
    *---------------------------------------------------------------------------
    */

   this.updateModifiers = function(modKey, isUp) {
      this.sendKey(modKey, isUp, false);
      if (isUp) {
         this.activeModifiers.splice(this.activeModifiers.indexOf(modKey), 1);
      } else {
         this.activeModifiers.push(modKey);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * onKeyPress
    *
    *    Desktop style onKeyPress handler. See onKeyDown for how our keyboard
    *    input mechanism works.
    *
    *---------------------------------------------------------------------------
    */

   this.onKeyPress = function(e) {
      var keyCode,
          isRaw = false,
          shiftMismatch = false,
          noShiftMismatch = false,
          keyCodeMismatch = false,
          isSpecialSymbol = false,
          key = ""; // String version of the key pressed

      /*
       * If on a Mac, and ONLY Alt is held, prefer the raw key code.
       * This is because Alt-* on a US Mac keyboard produces many international
       * characters, which I would prefer to ignore for the sake of letting
       * keyboard shortcuts work naturally.
       */
      if (WMKS.BROWSER.isMacOS() && this.activeModifiers.length === 1 &&
          this.activeModifiers[0] === WMKS.CONST.KB.KEY_CODE.Alt) {
         WMKS.LOGGER.log('Preferring raw keycode with Alt held (Mac)');
         return false;
      } else if (e.charCode && e.charCode >= 0x20) {
         /*
          * Low order characters are control codes, which we need to send raw.
          * 0x20 is SPACE, which is the first printable character in Unicode.
          */
         keyCode = e.charCode;
         isRaw = false;
      } else if (e.keyCode) {
         keyCode = e.keyCode;
         isRaw = true;
      } else {
         WMKS.LOGGER.log('assert: could not read keypress event');
         return false;
      }

      if (this.keyDownKeyTimer !== null) {
         clearTimeout(this.keyDownKeyTimer);
         this.keyDownKeyTimer = null;
      }

      //WMKS.LOGGER.log("onKeyPress: keyCode=" + keyCode);

      if (isRaw && WMKS.CONST.KB.ControlKeys.indexOf(keyCode) !== -1) {
         // keypress for a keydown that was sent as a control key. Ignore.
         return false;
      }

      /*
       * Update the modifier state before we send a character which may conflict
       * with a stale modifier state
       */
      this._syncModifiers(e);

      if (this.pendingKey !== null) {
         if (isRaw) {
            this.keyToRawMap[this.pendingKey] = keyCode;
         } else {
            this.keyToUnicodeMap[this.pendingKey] = keyCode;
         }
      }


      if (this.fixANSIEquivalentKeys && e.originalEvent) {
         if (e.originalEvent.key) {
            key = e.originalEvent.key;
         } else if (!WMKS.BROWSER.isWindows() || !WMKS.BROWSER.isChrome()) {
            if (e.originalEvent.keyIdentifier === "" && this.keyDownIdentifier) {
               // Parse Unicode as hex
               key = String.fromCharCode(parseInt(this.keyDownIdentifier.replace("U+", ""), 16));
            } else if(e.originalEvent.keyIdentifier) {
               // Parse Unicode as hex
               key = String.fromCharCode(parseInt(e.originalEvent.keyIdentifier.replace("U+", ""), 16));
            }
         }
         if (key) {
            keyCodeMismatch = (key.charCodeAt(0) !== keyCode);
            shiftMismatch = (WMKS.CONST.KB.ANSIShiftSymbols.indexOf(key) !== -1 &&
               this.activeModifiers.indexOf(WMKS.CONST.KB.KEY_CODE.Shift) === -1);
            noShiftMismatch = (WMKS.CONST.KB.ANSINoShiftSymbols.indexOf(key) !== -1 &&
               this.activeModifiers.indexOf(WMKS.CONST.KB.KEY_CODE.Shift) !== -1);
            isSpecialSymbol = (WMKS.CONST.KB.ANSISpecialSymbols.indexOf(key) !== -1);
         }
      }
      this.keyDownIdentifier = null;


      if (this.fixANSIEquivalentKeys && key && isSpecialSymbol &&
          (keyCodeMismatch || shiftMismatch || noShiftMismatch)) {
         if (noShiftMismatch) {
            // Should not have shift depressed for this key code, turn it off
            this.sendKey(WMKS.CONST.KB.KEY_CODE.Shift, true, false);
         }
         this.handleSoftKb(key.charCodeAt(0), true);
         if (noShiftMismatch) {
            // Turn shift back on after sending keycode.
            this.sendKey(WMKS.CONST.KB.KEY_CODE.Shift, false, false);
         }
      } else {
         this.sendKey(keyCode, false, !isRaw);
      }

      /*
       * Keycodes 50 and 55 are deadkeys when AltGr is pressed. Pressing them a
       * second time produces two keys (either ~ or `). Send an additional up
       * keystroke so that the second keypress has both a down and up event.
       * PR 969092
       */
      if (((this.pendingKey === 50 && keyCode === 126) ||
           (this.pendingKey === 55 && keyCode === 96)) &&
          !isRaw) {
         WMKS.LOGGER.debug("Sending extra up for Unicode " + keyCode
            + " so one isn't missed.");
         this.sendKey(keyCode, true, !isRaw);
      }

      this.pendingKey = null;
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * onKeyUp
    *
    *    Called to handle the keyboard "key up" event and send the appropriate
    *    key stroke to the server.
    *
    *---------------------------------------------------------------------------
    */

   this.onKeyUp = function(e) {
      var keyCode, keyCodeRes, unicode, raw, isUnicode = false;

      if (e.preventDefault) {
         e.preventDefault();
      } else {
         e.returnValue = false;
      }

      this.keyDownIdentifier = null;

      keyCodeRes = this._extractKeyCodeFromEvent(e);
      if (!keyCodeRes) {
         WMKS.LOGGER.debug('Extraction of keyCode from keyUp event failed.');
         return false; // don't send a malformed command.
      }
      keyCode = keyCodeRes.keyCode;
      isUnicode = keyCodeRes.isUnicode;

      //WMKS.LOGGER.log("onKeyUp: keyCode=" + keyCode);

      /*
       * Sync modifiers for we don't always get correct event.
       */
      this._syncModifiers(e);

      if (keyCode === 0) {
         WMKS.LOGGER.log("onKeyUp: Do not send 0 to server.");
         return true;
      }

      if ($.inArray(keyCode, WMKS.CONST.KB.Modifiers) !== -1) {
         // Handled above via syncModifiers
         return false;
      }

      /*
       * Only process keyup operations at once for certain keys.
       * Inhibit default because these will never result in a keypress event.
       */
      if (isUnicode) {
         WMKS.LOGGER.log('Sending unicode key up from keyIdentifier: ' + keyCode);
         this.sendKey(keyCode, true, true);
      } else if (this.keyToUnicodeMap.hasOwnProperty(keyCode)) {
         unicode = this.keyToUnicodeMap[keyCode];
         this.sendKey(unicode, true, true);
         // the user may change keymaps next time, don't persist this mapping
         delete this.keyToUnicodeMap[keyCode];
      } else if (this.keyToRawMap.hasOwnProperty(keyCode)) {
         raw = this.keyToRawMap[keyCode];
         this.sendKey(raw, true, false);
         delete this.keyToRawMap[keyCode];
      } else {
         this.sendKey(keyCode, true, false);
      }

      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * onKeyUpSoftKb
    *
    *    Event handler for soft keyboards. We do not have much going on here.
    *
    *---------------------------------------------------------------------------
    */

   this.onKeyUpSoftKb = function(e) {
      // for all browsers on soft keyboard.
      e.stopPropagation();
      e.preventDefault();
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * onKeyDownSoftKb
    *
    *    Special IOS onkeydown handler which only pays attention to certain keys
    *    and sends them directly. Returns false to prevent the default action,
    *    true otherwise.
    *
    *---------------------------------------------------------------------------
    */
   this.onKeyDownSoftKb = function(e) {
      var keyCode = e.keyCode || e.which;

      if (keyCode && WMKS.CONST.KB.SoftKBRawKeyCodes.indexOf(keyCode) !== -1) {
         // Non-Unicode but apply modifiers.
         this.handleSoftKb(keyCode, false);
         return false;
      }

      /*
       * Return value is true due to the following:
       * 1. For single-use-caps / Caps-Lock to work, we need to return true
       *    for all keys.
       * 2. Certain unicode characters are visible with keypress event
       *    alone. (keyCode value is 0)
       */
      return true;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * onKeyPressSoftKb
    *
    *    Returns latin1 & Unicode keycodes.
    *    Works for all basic input that you can do with a soft keyboard.
    *
    *    NOTE: Chrome on Android behaves differently. Hence we rely on
    *    onInputTextSoftKb() to handle the input event.
    *
    *---------------------------------------------------------------------------
    */

   this.onKeyPressSoftKb = function(e) {
      var keyCode = e.keyCode || e.which;
      if (WMKS.BROWSER.isAndroid() && WMKS.BROWSER.isChrome()) {
         // Android on Chrome, special case, ignore it.
         return true;
      }
      // Reset the text field first.
      $(e.target).val(WMKS.CONST.KB.keyInputDefaultValue);

      // Send both keydown and key up events.
      this.handleSoftKb(keyCode, true);

      /* If we use preventDefault() or return false, the single-use-caps does
       * not toggle back to its original state. Hence rely on the fact that
       * text-2-speech contains more than 1 character input */
      return true;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * onInputTextSoftKb
    *
    *    Event handler for input event on the input-proxy. This intercepts
    *    microphone text input as well as keyPress events. We have to make sure
    *    only the microphone inputs are processed.
    *
    *    The following logic is used to differentiate.
    *    1. If input value is the same as defaultValue, no input, ignore it.
    *    2. If input value has only a single char, then its mostly preceded by
    *       onKeyPressSoftKb(), so ignore it.
    *    3. There is more than 1 character, must be from speech-2-text. Process
    *       this one further.
    *
    * NOTE: Android chrome does not emit useful keyCodes, hence we use the value
    *       that's entered into the textbox and decode it to send as a message.
    *       http://code.google.com/p/chromium/issues/detail?id=118639
    *
    *---------------------------------------------------------------------------
    */

   this.onInputTextSoftKb = function(e) {
      // We have received speech-to-text input or something.
      var input = $(e.target),
          val = input.val(),
          defaultInputSize = WMKS.CONST.KB.keyInputDefaultValue.length;

      /*
       * TODO: It causes speech-to-text doesn't work on iOS.
       * Ignore input event due to bug 1080567. Keypress triggers
       * both keypress event as well as input event. It sends
       * duplicate texts to the remote desktop.
       */
      if (WMKS.BROWSER.isIOS()) {
         // In any case, clean-up this data, so we do not repeat it.
         input.val(WMKS.CONST.KB.keyInputDefaultValue);
         return false;
      }

      // Remove the default value from the input string.
      if (defaultInputSize > 0) {
         val = val.substring(defaultInputSize);
      }
      // WMKS.LOGGER.debug('input val: ' + val);

      /*
       * 1. We have to verify if speech-to-text exists, we allow that.
       * 2. In case of Android, keyPress does not provide valid data, hence
       *    all input is handled here.
       * 3. For all other cases, do not process, its handled in onKeyPress.
       */
      if (val.length > 1) {
         /*
          * There are 2+ chars, hence speech-to-text or special symbols on
          * android keyboard, let it in as is. If its speech-to-text, first
          * char is generally uppercase, hence flip that.
          */
         val = val.charAt(0).toLowerCase() + val.slice(1);
         this.processInputString(val);
      } else if (WMKS.BROWSER.isAndroid() && WMKS.BROWSER.isChrome()) {
         // We could get uppercase and lower-case values, use them as is.
         this.processInputString(val);
      }

      // In any case, clean-up this data, so we do not repeat it.
      input.val(WMKS.CONST.KB.keyInputDefaultValue);
      return true;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * processInputString
    *
    *    This function accepts a string of input characters and processes them.
    *    It decodes each character to its keyCode, and then sends each one of
    *    that in the order it was passed.
    *
    *    Returns the last key that was decoded from the input value.
    *
    *---------------------------------------------------------------------------
    */

   this.processInputString = function(str, processNewline) {
      var i, key = false;
      for (i = 0; i < str.length; i++) {
         if (processNewline && str.charAt(i) === '\n') {
            // Found a newline, handle this differently by sending the enter key.
            this.sendKey(WMKS.CONST.KB.KEY_CODE.Enter, false, false);
            this.sendKey(WMKS.CONST.KB.KEY_CODE.Enter, true, false);
            continue;
         }
         key = str.charCodeAt(i);
         if (!isNaN(key)) {
            // Send each key in if its a valid keycode.
            this.handleSoftKb(key, true);
         }
      }
      // Return the last keyCode from this input. When a single character is
      // passed, the last is essentially the keycode for that input character.
      return key;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * handleSoftKb
    *
    *    Process keyCode inputs from Soft keyboards. In case of unicode input
    *    we need to to check if the key provided needs to send an additional
    *    shift as well. VScanCodes assume Shift is sent.
    *
    *    Ex: keyCode 65, 97 are both mapped to 0x1e and hence for soft
    *        keyboards, we need to compute the extra shift key.
    *
    *    activeModifiers are used differently by Soft Keyboard compared to the
    *    desktop browser keyboards. The state of the activeModifiers are not
    *    managed by sending the keystrokes, but are explicitly turned on / off
    *    from the touch inputs.
    *
    *    The needsShift is specifically used for sending VScanCodes. This one
    *    sends an extra Shift key. However, if the activeModifier is already
    *    has the shiftKey down, we need to flip it, to revert this. Hence the
    *    needShift and activeModifiers shift work hand in hand.
    *
    *---------------------------------------------------------------------------
    */

   this.handleSoftKb = function(key, isUnicode) {
      var implicitShift, shiftSentAlready;

      /*
       * In case of unicode, determine if the shift key is implicit.
       * Ex: keyCode 97(char 'A') = 65(char 'a') + Shift (implicit)
       * We need this for sending VScanCode, as VScanCodes do not handle unicode
       * and we have to wrap the input key with a shift.
       */
      implicitShift = (isUnicode && WMKS.CONST.KB.UnicodeWithShift[key]);

      if (implicitShift) {
         // Determine if shift was already sent via extendedKeypad.
         shiftSentAlready =
            ($.inArray(WMKS.CONST.KB.KEY_CODE.Shift, this.activeModifiers) !== -1);

         if (!shiftSentAlready && !this._isUnicodeInputSupported()) {
            // Send shift down before sending the keys.
            this.sendKey(WMKS.CONST.KB.KEY_CODE.Shift, false, false);
         }
         // Send the key-down and up.
         this.sendKey(key, false, isUnicode);
         this.sendKey(key, true, isUnicode);

         // Determine if we need to send a shift down / up.
         if (!shiftSentAlready && !this._isUnicodeInputSupported()) {
            this.sendKey(WMKS.CONST.KB.KEY_CODE.Shift, true, false);
         } else if (shiftSentAlready && this._isUnicodeInputSupported()) {
            // WMKS.LOGGER.debug('Send extra shift down to keep the modifier state');
            this.sendKey(WMKS.CONST.KB.KEY_CODE.Shift, false, false);
         }
      } else {
         // Send the key-down and up.
         this.sendKey(key, false, isUnicode);
         this.sendKey(key, true, isUnicode);
      }
   };


   /**
    *---------------------------------------------------------------------------
    *
    * isBrowserCapsLockOn
    *
    * Utility function used to detect if CAPs lock is on. Based on the
    * Javascript inputs we attempt to detect if the browser CapsLock is on.
    * We can only detect this on desktop browsers that sends shift key
    * separately. We can for sure say if its CapsLock enabled. But we cannot
    * say if the capsLock is not enabled, as non-unicode does not pass that
    * info.
    *
    *---------------------------------------------------------------------------
    */

   this.isBrowserCapsLockOn = function(keyCode, isUnicode, shiftKeyDown) {
      return !WMKS.BROWSER.isTouchDevice()
         && isUnicode
         && ((WMKS.CONST.KB.UnicodeOnly[keyCode] && shiftKeyDown)
         || (WMKS.CONST.KB.UnicodeWithShift[keyCode] && !shiftKeyDown));
   };


   /*
    *---------------------------------------------------------------------------
    *
    * sendKey
    *
    *    Single point of action for sending keystrokes to the protocol.
    *    Needs to know whether it's a down or up operation, and whether
    *    keyCode is a Unicode character index (keypress) or a raw one (keydown).
    *
    *    Depending on what type key message is sent, the appropriate lookups are
    *    made and sent.
    *
    *    This function is also the final frontier for limiting processing of
    *    key inputs.
    *
    *---------------------------------------------------------------------------
    */

   this.sendKey = function(key, isUp, isUnicode) {
      // Check if VMW key event can be used to send key inputs.
      if (!this._vncDecoder.useVMWKeyEvent) {
         return;
      }

      // Final frontier for banning keystrokes.
      if (!isUnicode && this.ignoredRawKeyCodes.indexOf(key) !== -1) {
         return;
      }

      // WMKS.LOGGER.log((isUnicode? '+U' : '') + key + (isUp? '-up' : '-d'));
      if (this._vncDecoder.allowVMWKeyEvent2UnicodeAndRaw) {
         // Blast uses the unicode mode where we send unicode / raw keyCode.
         this._vncDecoder.onVMWKeyUnicode(key, !isUp, !isUnicode);
      } else {
         // Send VMware VScanCodes.
         this._sendVScanCode(key, isUp, isUnicode);
      }
   };

   /**
    *---------------------------------------------------------------------------
    *
    * _sendVScanCode
    *
    *    This function handles the complexity of sending VScanCodes to the
    *    server. This function looks up 2 different tables to convert unicode
    *    to VScanCodes.
    *       1. Unicode to VScanCode
    *       2. Raw JS KeyCodes to VScanCodes.
    *
    *    TODO: Cleanup keyboardMapper and keyboardUtils once key repeats
    *          and CAPs lock are handled as expected.
    *
    *---------------------------------------------------------------------------
    */

   this._sendVScanCode = function(key, isUp, isUnicode) {
      var vScanCode = null;
      if (isUnicode || key === 13) {
         vScanCode = this.UnicodeToVScanMap[key];
      }
      if (!vScanCode) {
         // Since vScanCode is not valid, reset the flag.
         vScanCode = WMKS.keyboardUtils._jsToVScanTable[key];
         /**
          * Support Ctrl+C/V in WSX and vSphere NGC.
          * Both in WSX and vSphere NGC, send vScanCode to the server.
          * However, _jsToVScanTable lacks mapping for the characters
          * a-z, hence, when pressing Ctrl+C, c is not mapped and sent.
          * In this scenario, map c using the UnicodeToVScanMap and
          * send the code to the server.
          */
         if (!vScanCode) {
            // Mapping to VScanCode using the unicode mapping table.
            vScanCode = this.UnicodeToVScanMap[key];
         }
      }
      if (!!vScanCode) {
         // WMKS.LOGGER.debug('key: ' + key + ' onKeyVScan: ' + vScanCode
         //   + (isUp? '-up' : '-d'));
         // performMapping keyCode to VMware VScanCode and send it.
         this._vncDecoder.onKeyVScan(vScanCode, !isUp);
      } else {
         WMKS.LOGGER.debug('unknown key: ' + key + (isUp? '-up' : '-d'));
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * clearState
    *
    *    Single point of action for sending keystrokes to the protocol. Nice for
    *    debugging. Needs to know whether it's a down or up operation, and
    *    whether the keyCode is a unicode character index (keypress) or a
    *    raw one (keydown).
    *
    *---------------------------------------------------------------------------
    */

   this.clearState = function() {
      // Clear any keyboard specific state that's held.

      // Clear modifiers.
      this.activeModifiers.length = 0;

      // clear all modifier keys on start
      this.sendKey(WMKS.CONST.KB.KEY_CODE.Alt, true, false);
      this.sendKey(WMKS.CONST.KB.KEY_CODE.Ctrl, true, false);
      this.sendKey(WMKS.CONST.KB.KEY_CODE.Shift, true, false);
      // Send meta only if its Mac OS.
      if (WMKS.BROWSER.isMacOS()) {
         this.sendKey(WMKS.CONST.KB.KEY_CODE.Meta, true, false);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * enableWindowsKey
    *
    *    Enable/disable the simulation of Windows key.
    *    Press Ctrl+Win on Windows or Ctrl+CMD on Mac to simulate Windows key.
    *
    *---------------------------------------------------------------------------
    */

   this.enableWindowsKey = function(value) {
      this._windowsKeyManager.enabled = value;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * setIgnoredRawKeyCodes
    *
    *    Set ignore raw keyCodes set.
    *
    *---------------------------------------------------------------------------
    */

   this.setIgnoredRawKeyCodes = function(value) {
      this.ignoredRawKeyCodes = value;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _isUnicodeInputSupported
    *
    *    This is a wrapper function that determines if the unicode input is
    *    handled by the server.
    *
    *    NOTE: true for Blast, false for WSX, NGC, etc.
    *
    *---------------------------------------------------------------------------
    */

   this._isUnicodeInputSupported = function() {
      return this._vncDecoder.allowVMWKeyEvent2UnicodeAndRaw;
   };
};


/**
 * WMKS.CONST.KB.UnicodeOnly
 * WMKS.CONST.KB.UnicodeWithShift
 * WMKS.CONST.KB.UnicodeToVScanMap
 *
 * The following are 2 sets of mapping that contain a key-value pair of unicode
 * to VScanCode map. Its split the mapping into two maps to enable detection
 * of whether the unicode is just a VScanCode or a combo of VScanCode with the
 * shift key down. This distinction is necessary in case of soft keyboards.
 *
 * These 2 maps are then merged into 1 final map UnicodeToVScanMap, that will
 * be used in the lookup code to send vScanCodes.
 */
WMKS.CONST.KB.UnicodeOnly = {

   // Space, enter, backspace
   32 : 0x39,
   13 : 0x1c,
   //8 : 0x0e,

   // Keys a-z
   97  : 0x1e,
   98  : 0x30,
   99  : 0x2e,
   100 : 0x20,
   101 : 0x12,
   102 : 0x21,
   103 : 0x22,
   104 : 0x23,
   105 : 0x17,
   106 : 0x24,
   107 : 0x25,
   108 : 0x26,
   109 : 0x32,
   110 : 0x31,
   111 : 0x18,
   112 : 0x19,
   113 : 0x10,
   114 : 0x13,
   115 : 0x1f,
   116 : 0x14,
   117 : 0x16,
   118 : 0x2f,
   119 : 0x11,
   120 : 0x2d,
   121 : 0x15,
   122 : 0x2c,

   // keyboard number keys (across the top) 1,2,3... -> 0
   49 : 0x02,
   50 : 0x03,
   51 : 0x04,
   52 : 0x05,
   53 : 0x06,
   54 : 0x07,
   55 : 0x08,
   56 : 0x09,
   57 : 0x0a,
   48 : 0x0b,

   // Symbol keys ; = , - . / ` [ \ ] '
   59 : 0x27, // ;
   61 : 0x0d, // =
   44 : 0x33, // ,
   45 : 0x0c, // -
   46 : 0x34, // .
   47 : 0x35, // /
   96 : 0x29, // `
   91 : 0x1a, // [
   92 : 0x2b, // \
   93 : 0x1b, // ]
   39 : 0x28  // '

};

WMKS.CONST.KB.UnicodeWithShift = {
   // Keys A-Z
   65 : 0x001e,
   66 : 0x0030,
   67 : 0x002e,
   68 : 0x0020,
   69 : 0x0012,
   70 : 0x0021,
   71 : 0x0022,
   72 : 0x0023,
   73 : 0x0017,
   74 : 0x0024,
   75 : 0x0025,
   76 : 0x0026,
   77 : 0x0032,
   78 : 0x0031,
   79 : 0x0018,
   80 : 0x0019,
   81 : 0x0010,
   82 : 0x0013,
   83 : 0x001f,
   84 : 0x0014,
   85 : 0x0016,
   86 : 0x002f,
   87 : 0x0011,
   88 : 0x002d,
   89 : 0x0015,
   90 : 0x002c,

   // Represents number 1, 2, ... 0 with Shift.
   33 : 0x0002, // !
   64 : 0x0003, // @
   35 : 0x0004, // #
   36 : 0x0005, // $
   37 : 0x0006, // %
   94 : 0x0007, // ^
   38 : 0x0008, // &
   42 : 0x0009, // *
   40 : 0x000a, // (
   41 : 0x000b, // )

   // Symbol keys with shift ----->  ; = , - . / ` [ \ ] '
   58  : 0x0027, // :
   43  : 0x000d, // +
   60  : 0x0033, // <
   95  : 0x000c, // _
   62  : 0x0034, // >
   63  : 0x0035, // ?
   126 : 0x0029, // ~
   123 : 0x001a, // {
   124 : 0x002b, // |
   125 : 0x001b, // }
   34  : 0x0028  // "
};

WMKS.CONST.KB.VScanMap['en-US'] = $.extend({},
                                           WMKS.CONST.KB.UnicodeOnly,
                                           WMKS.CONST.KB.UnicodeWithShift);

/*
 * wmks/keyboardUtils.js
 *
 *   WebMKS keyboard event decoder and key remapper.
 *
 */

WMKS.keyboardUtils = {};



WMKS.keyboardUtils._keyInfoTemplate = {
   jsScanCode: 0,
   vScanCode: 0,
};



/*
 *------------------------------------------------------------------------------
 *
 * keyDownUpInfo
 *
 *    Parses a keydown/keyup event.
 *
 * Results:
 *    { jsScanCode,  The JavaScript-reposted scancode, if any. Arbitrary.
 *      vScanCode }  The VMX VScancode for the key on a US keyboard, if any.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.keyboardUtils.keyDownUpInfo = function(event) {
   var evt = event || window.event;
   var ki = this._keyInfoTemplate;

   if (evt.type === 'keydown' || evt.type === 'keyup') {
      /*
       * Convert JS scancode to VMware VScancode
       */
      ki.jsScanCode = evt.keyCode;
      ki.vScanCode = this._jsToVScanTable[ki.jsScanCode];

      /*
       * Workaround ie9/ie10 enter key behaviour.  We receive
       * keydown/keyup events but no keypress events for the enter
       * key.  On the other hand Firefox and Chrome give us
       * keydown/keyup *plus* keypress events for this key.  Short of
       * using a timer, don't see a way to catch both cases without
       * introducing a browser dependency here.
       */
      if (WMKS.BROWSER.isIE() && WMKS.BROWSER.version.major <= 10 && ki.jsScanCode == 13) {
         ki.vScanCode = 28;
      }
   }

   return ki;
};


/*
 *------------------------------------------------------------------------------
 *
 * keyPressInfo
 *
 *    Parses a keypress event.
 *
 * Results:
 *    The Unicode character generated during the event, or 0 if none.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.keyboardUtils.keyPressInfo = function(event) {
   var evt = event || window.event;
   var uChar = 0;

   if (evt.type === 'keypress') {
      uChar = evt.which;

      /*
       * Handle Backspace, Tab, ESC via keyDown instead.
       */
      if (uChar == 8 || uChar == 9 || uChar == 27) {
         uChar = 0;
      }
   }

   return uChar;
};





/*
 * JS scancode to VMware VScancode conversion table
 */
WMKS.keyboardUtils._jsToVScanTable = {
   // Space, enter, tab, escape, backspace
   //32 : 0x039,
   //13 : 0x01c,
   9 : 0x00f,
   27 : 0x001,
   8 : 0x00e,

   // shift, control, alt, Caps Lock, Num Lock
   16 : 0x02a,     // left shift
   17 : 0x01d,     // left control
   18 : 0x038,     // left alt
   20 : 0x03a,
   144 : 0x045,

   // Arrow keys (left, up, right, down)
   37 : 0x14b,
   38 : 0x148,
   39 : 0x14d,
   40 : 0x150,

   // Special keys (Insert, delete, home, end, page up, page down, F1 - F12)
   45 : 0x152,
   46 : 0x153,
   36 : 0x147,
   35 : 0x14f,
   33 : 0x149,
   34 : 0x151,
   112 : 0x03b,
   113 : 0x03c,
   114 : 0x03d,
   115 : 0x03e,
   116 : 0x03f,
   117 : 0x040,
   118 : 0x041,
   119 : 0x042,
   120 : 0x043,
   121 : 0x044,
   122 : 0x057,
   123 : 0x058,

   // Special Keys (Left Apple/Command, Right Apple/Command, Left Windows, Right Windows, Menu)
   224 : 0x038,
   // ? : 0x138,
   91 : 0x15b,
   92 : 0x15c,
   93 : 0, //?

   42 : 0x054,  // PrintScreen / SysRq
   19 : 0x100,  // Pause / Break

   /*
    * Commented out since these are locking modifiers that easily get
    * out of sync between server and client and thus cause unexpected
    * behaviour.
    */
   //144 : 0x045,  // NumLock
   //20 : 0x03a,  // CapsLock
   //145 : 0x046,  // Scroll Lock
};
/*globals WMKS */

WMKS.keyboardMapper = function(options) {
   if (!options.vncDecoder) {
      return null;
   }

   this._vncDecoder = options.vncDecoder;

   this._keysDownVScan = [];
   this._keysDownUnicode = [];

   this.VSCAN_CAPS_LOCK_KEY = 58;
   this.VSCAN_CMD_KEY = 347;

   // The current repeating typematic key
   this._typematicKeyVScan = 0;
   this._typematicDelayTimer = null;

   return this;
};


WMKS.keyboardMapper.prototype.doKeyVScan = function(vscan, down) {
   if (!this._vncDecoder.useVMWKeyEvent) {
      return;
   }

   /*
    * Caps lock is an unusual key and generates a 'down' when the
    * caps lock light is going from off -> on, and then an 'up'
    * when the caps lock light is going from on -> off. The problem
    * is compounded by a lack of information between the guest & VMX
    * as to the state of caps lock light. So the best we can do right
    * now is to always send a 'down' for the Caps Lock key to try and
    * toggle the caps lock state in the guest.
    */
   if (vscan === this.VSCAN_CAPS_LOCK_KEY && (navigator.platform.indexOf('Mac') !== -1)) {
       this._vncDecoder.onKeyVScan(vscan, 1);
       this._vncDecoder.onKeyVScan(vscan, 0);
       return;
   }

   /*
    * Manage an array of VScancodes currently held down.
    */
   if (down) {
      if (this._keysDownVScan.indexOf(vscan) <= -1) {
         this._keysDownVScan.push(vscan);
      }
      this.beginTypematic(vscan);
   } else {
      this.cancelTypematic(vscan);
      /*
       * If the key is in the array of keys currently down, remove it.
       */
      var index = this._keysDownVScan.indexOf(vscan);
      if (index >= 0) {
         this._keysDownVScan.splice(index, 1);
      }
   }

   /*
    * Send the event.
    */
   this._vncDecoder.onKeyVScan(vscan, down);
};


WMKS.keyboardMapper.prototype.doKeyUnicode = function(uChar, down) {
   if (!this._vncDecoder.useVMWKeyEvent) {
      return;
   }

   /*
    * Manage an array of Unicode chars currently "held down".
    */
   if (down) {
      this._keysDownUnicode.push(uChar);
   } else {
      /*
       * If the key is in the array of keys currently down, remove it.
       */
      var index = this._keysDownUnicode.indexOf(uChar);
      if (index >= 0) {
         this._keysDownUnicode.splice(index, 1);
      }
   }


   var modvscan = this._tableUnicodeToVScan[uChar];

   /*
    * Press the final key itself.
    */
   if (modvscan) {
      if (down) {
         this.beginTypematic(modvscan & 0x1ff);
      } else {
         this.cancelTypematic(modvscan & 0x1ff);
      }
      this._vncDecoder.onKeyVScan(modvscan & 0x1ff, down);
   }
};


WMKS.keyboardMapper.prototype.doReleaseAll = function() {
   var i;

   for (i = 0; i < this._keysDownUnicode.length; i++) {
      this.doKeyUnicode(this._keysDownUnicode[i], 0);
   }
   if (this._keysDownUnicode.length > 0) {
      console.log("Warning: Could not release all Unicode keys.");
   }

   for (i = 0; i < this._keysDownVScan.length; i++) {
      this.cancelTypematic(this._keysDownVScan[i]);
      this._vncDecoder.onKeyVScan(this._keysDownVScan[i], 0);
   }
   this._keysDownVScan = [];
};


/*
 *------------------------------------------------------------------------------
 *
 * beginTypematic
 *
 *    Begin the typematic process for a new key going down. Cancel any pending
 *    timers, record the new key going down and start a delay timer.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.keyboardMapper.prototype.beginTypematic = function (vscan) {
   /*
    * Don't begin typematic if the cmd key is down, we don't get
    * a key up for the alpha key if it was down whilst the cmd key
    * was also down. So there's no cancel of typematic.
    */
   if (this._keysDownVScan.indexOf(this.VSCAN_CMD_KEY) >= 0) {
      return;
   }

   // Cancel any typematic delay timer that may have been previously started
   this.cancelTypematicDelay();
   // And cancel any typematic periodic timer that may have been started
   this.cancelTypematicPeriod();
   if (this._vncDecoder.typematicState === 1) {
      // Begin the delay timer, when this fires we'll
      // start auto-generating down events for this key.
      this.startTypematicDelay(vscan);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * cancelTypematic
 *
 *    Cancel the typematic process for a key going up. If the key going up is our
 *    current typematic key then cancel both delay and periodic timers (if they exist).
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.keyboardMapper.prototype.cancelTypematic = function (vscan) {
    if (this._typematicKeyVScan === vscan) {
       this.cancelTypematicDelay();
       this.cancelTypematicPeriod();
    }
};


/*
 *------------------------------------------------------------------------------
 *
 * cancelTypematicDelay
 *
 *    Cancel a typematic delay (before auto-repeat) .
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.keyboardMapper.prototype.cancelTypematicDelay = function() {
   if (this._typematicDelayTimer !== null) {
      clearTimeout(this._typematicDelayTimer);
   }
   this._typematicDelayTimer = null;
};


/*
 *------------------------------------------------------------------------------
 *
 * cancelTypematicPeriod
 *
 *    Cancel a typematic periodic timer (the auto-repeat timer) .
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.keyboardMapper.prototype.cancelTypematicPeriod = function() {
    if (this._typematicPeriodTimer !== null) {
        clearInterval(this._typematicPeriodTimer);
    }
    this._typematicPeriodTimer = null;
};


/*
 *------------------------------------------------------------------------------
 *
 * startTypematicDelay
 *
 *    Start the typematic delay timer, when this timer fires, the specified
 *    auto-repeat will begin and send the recorded typematic key vscan code.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.keyboardMapper.prototype.startTypematicDelay = function(vscan) {
   var self = this;
   this._typematicKeyVScan = vscan;
   this._typematicDelayTimer = setTimeout(function () {
     self._typematicPeriodTimer = setInterval(function() {
        self._vncDecoder.onKeyVScan(self._typematicKeyVScan, 1);
     }, self._vncDecoder.typematicPeriod / 1000);
   }, this._vncDecoder.typematicDelay / 1000);
};


/*
 * Unicode to VMware VScancode conversion tables
 */

//WMKS.keyboardMapper.prototype._modShift = 0x1000;
//WMKS.keyboardMapper.prototype._modCtrl  = 0x2000;
//WMKS.keyboardMapper.prototype._modAlt   = 0x4000;
//WMKS.keyboardMapper.prototype._modWin   = 0x8000;

WMKS.keyboardMapper.prototype._tableUnicodeToVScan = {
   // Space, enter, backspace
   32 : 0x39,
   13 : 0x1c,
   //8 : 0x0e,

   // Keys a-z
   97  : 0x1e,
   98  : 0x30,
   99  : 0x2e,
   100 : 0x20,
   101 : 0x12,
   102 : 0x21,
   103 : 0x22,
   104 : 0x23,
   105 : 0x17,
   106 : 0x24,
   107 : 0x25,
   108 : 0x26,
   109 : 0x32,
   110 : 0x31,
   111 : 0x18,
   112 : 0x19,
   113 : 0x10,
   114 : 0x13,
   115 : 0x1f,
   116 : 0x14,
   117 : 0x16,
   118 : 0x2f,
   119 : 0x11,
   120 : 0x2d,
   121 : 0x15,
   122 : 0x2c,

   // keyboard number keys (across the top) 1,2,3... -> 0
   49 : 0x02,
   50 : 0x03,
   51 : 0x04,
   52 : 0x05,
   53 : 0x06,
   54 : 0x07,
   55 : 0x08,
   56 : 0x09,
   57 : 0x0a,
   48 : 0x0b,

   // Symbol keys ; = , - . / ` [ \ ] '
   59 : 0x27, // ;
   61 : 0x0d, // =
   44 : 0x33, // ,
   45 : 0x0c, // -
   46 : 0x34, // .
   47 : 0x35, // /
   96 : 0x29, // `
   91 : 0x1a, // [
   92 : 0x2b, // \
   93 : 0x1b, // ]
   39 : 0x28,  // '


   // Keys A-Z
   65 : 0x001e,
   66 : 0x0030,
   67 : 0x002e,
   68 : 0x0020,
   69 : 0x0012,
   70 : 0x0021,
   71 : 0x0022,
   72 : 0x0023,
   73 : 0x0017,
   74 : 0x0024,
   75 : 0x0025,
   76 : 0x0026,
   77 : 0x0032,
   78 : 0x0031,
   79 : 0x0018,
   80 : 0x0019,
   81 : 0x0010,
   82 : 0x0013,
   83 : 0x001f,
   84 : 0x0014,
   85 : 0x0016,
   86 : 0x002f,
   87 : 0x0011,
   88 : 0x002d,
   89 : 0x0015,
   90 : 0x002c,

   33 : 0x0002, // !
   64 : 0x0003, // @
   35 : 0x0004, // #
   36 : 0x0005, // $
   37 : 0x0006, // %
   94 : 0x0007, // ^
   38 : 0x0008, // &
   42 : 0x0009, // *
   40 : 0x000a, // (
   41 : 0x000b, // )

   58  : 0x0027, // :
   43  : 0x000d, // +
   60  : 0x0033, // <
   95  : 0x000c, // _
   62  : 0x0034, // >
   63  : 0x0035, // ?
   126 : 0x0029, // ~
   123 : 0x001a, // {
   124 : 0x002b, // |
   125 : 0x001b, // }
   34  : 0x0028, // "
};
/* global $:false, WMKS:false */

/*
 *------------------------------------------------------------------------------
 * wmks/touchHandler.js
 *
 *    This class abstracts touch input management and decouples this
 *    functionality from the widgetProto.
 *
 *    All variables are defined as private variables. Functions that do not
 *    need to be exposed should be private too.
 *
 *------------------------------------------------------------------------------
 */

/*
 *------------------------------------------------------------------------------
 *
 * WMKS.CONST.TOUCH
 *
 *    Enums and constants for touchHandlers. These comprise of constants for
 *    various gestures and types of gestures, etc.
 *
 *------------------------------------------------------------------------------
 */

WMKS.CONST.TOUCH = {
   FEATURE: {                             // List of optional touch features.
      SoftKeyboard:     0,
      ExtendedKeypad:   1,
      Trackpad:         2
   },
   // Tolerances for touch control
   tapMoveCorrectionDistancePx: 10,
   additionalTouchIgnoreGapMs: 1200,
   touchMoveSampleMinCount:   2,
   minKeyboardToggleTime:     50,         // Minimum time between keyboard toggles.
   leftDragDelayMs:           300,
   OP: {                                  // Touch event/gesture types.
      none:                   'none',
      scroll:                 'scroll',
      drag:                   'drag',
      move:                   'move',
      tap_twice:              'double-click',
      tap_1finger:            'click',
      tap_3finger:            'tap-3f'
   },
   SCROLL: {
      minDeltaDistancePx:     20          // Min distance to scroll before sending a scroll message.
   },
   DOUBLE_TAP: {                          // Constants for tolerance between double taps.
      tapGapInTime:           250,        // Allowed ms delay b/w the 2 taps.
      tapGapBonusTime:        200,        // Allowed extra ms delay based on tapGapBonus4TimeRatio value wrt tap proximity.
      tapGapBonus4TimeRatio:  0.4,        // Allowed ratio of tap proximity b/w taps vs tapGapInTime to activate tapGapBonusTime.
      tapGapInDistance:       40          // Allowed px distance b/w the 2 taps.
   }
};


WMKS.TouchHandler = function(options) {
   'use strict';
   if (!options || !options.canvas ||
       !options.widgetProto || !options.keyboardManager) {
      WMKS.LOGGER.warn('Invalid params set for TouchHandler.');
      return null;
   }

   var _widget = options.widgetProto,
       _keyboardManager = options.keyboardManager,
       _KEYBOARD = {
         visible: false,             // Internal flag to identify keyboard state.
         lastToggleTime: 0           // Last keyboard toggle timestamp used to detect spurious requests.
       },
       _repositionElements = [],     // Elements needing reposition upon rotation.
       _canvas = options.canvas,     // Canvas where all the action happens.
       _onToggle = options.onToggle; // Toggle callback function.

   // Timers
   var _dragTimer = null,
       _TAP_STATE = {               // Touch state machine.
         currentTouchFingers: -1,   // Indicates number of touch fingers
         firstTouch: null,
         currentTouch: null,
         touchArray: [],
         tapStartTime: null,        // Used to detect double tap
         touchMoveCount: 0,
         skipScrollCount: 0,
         scrollCount: 0,
         zoomCount: 0,
         opType: WMKS.CONST.TOUCH.OP.none
       };

      // List of jQuery objects that are used frequently.
   var _ELEMENTS = {
         inputProxy        : null,
         cursorIcon        : null,
         clickFeedback     : null,
         dragFeedback      : null,
         pulseFeedback     : null,
         scrollFeedback    : null,
         keypad            : null,
         trackpad          : null
       };


   /*
    *---------------------------------------------------------------------------
    *
    * _verifyQuickTouches
    *
    *    We noticed that the touch events get fired extremely quickly when there
    *    is touchstart, touchstart, touchmove, and the browser itself does not
    *    detect the second touchstart before the touchmove, instead it shows 1
    *    touchstartand the first touchmove indicates 1 finger with a move of
    *    over 50px. We decode the touchmoved location to the second touchstart
    *    location.
    *
    *    Ex: Following log indicates this scenario:
    *    3:41:54.566Z [Debug] touchstart#: 1 (e.targetTouches.length)
    *    3:41:54.568Z [Debug] touchstart#: 1 (e.targetTouches.length)
    *    3:41:54.584Z [Debug] single tap drag dist: 147.8715658942, scale: 0.90927...
    *    3:41:54.586Z [Info ] touchmove count: 1 touch#: 1 (e.targetTouches.length)
    *    3:41:54.600Z [Debug] onGestureEnd: 0.9092.. <-- gestureEnd happens only
    *                         if there were 2 touchstarts in the first place.
    *
    *---------------------------------------------------------------------------
    */

   this._verifyQuickTouches = function(e, dist, touchMoveCount) {
      // Only make use of this state if the opType is not defined, there
      // is a change in scale, this is the first touchmove and the distance b/w
      // firsttouch and the touchmove's event location is really huge.
      if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.none
            && dist > 50 && touchMoveCount === 1) {
         WMKS.LOGGER.debug('Special case - touchmove#: ' + touchMoveCount
            + ', targetTouches#: ' + e.targetTouches.length
            + ', dist: ' + dist + ', scale: ' + e.scale);
         return true;
      }
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _initDragEventAndSendFeedback
    *
    *    This is the initialization event that happens when we detect a gesture
    *    as a drag. It does the following:
    *    1. Sends a mouse down where the touch initially happened.
    *    2. Shows drag ready feedback.
    *
    *---------------------------------------------------------------------------
    */

   this._initDragEventAndSendFeedback = function(firstTouch) {
      if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.drag) {
         // Send the left mousedown at the touch location & send drag feedback
         var pos = this._applyZoomCorrectionToTouchXY(firstTouch);
         _widget.sendMouseButtonMessage(pos, true, WMKS.CONST.CLICK.left);
         // Show drag icon above implying the drag is ready to use.
         this._showFeedback(_ELEMENTS.dragFeedback, firstTouch);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _initTwoFingerTouch
    *
    *    This is the initialization event that happens when we detect a gesture
    *    as a drag. It does the following:
    *    1. Sends a mouse down where the touch initially happened.
    *    2. Shows drag ready feedback.
    *
    *---------------------------------------------------------------------------
    */

   this._initTwoFingerTouch = function(firstTouch, secondTouch) {
      /* WMKS.LOGGER.debug('Touch1: ' + firstTouch.screenX + ','
         + firstTouch.screenY + ' touch 2: ' + secondTouch.screenX + ','
         + secondTouch.screenY + ' opType: ' + _TAP_STATE.opType); */
      if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.none) {
         _TAP_STATE.currentTouchFingers = 2;
         /*
          * Now, 2 finger tap just happened. This could be one of the following:
          *    1. Scroll - (To detect use angle b/w lines upon touchmove).
          *    2. Zoom/pinch - Handled by the default handler (detect as above).
          *    3. right-click (When its neither of the above).
          *
          * Store the original 2 finger location and the leftmost location.
          * NB: Use location of the leftmost finger to position right click.
          * TODO: lefty mode
          */
         _TAP_STATE.touchArray.push(firstTouch);
         _TAP_STATE.touchArray.push(secondTouch);
         _TAP_STATE.firstTouch = WMKS.UTIL.TOUCH.copyTouch(
            WMKS.UTIL.TOUCH.leftmostOf(firstTouch, secondTouch));
         _TAP_STATE.currentTouch = WMKS.UTIL.TOUCH.copyTouch(_TAP_STATE.firstTouch);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _sendScrollEventMessage
    *
    *    This function handles the computation of the vertical scroll distance.
    *    If the distance is more than the threshold, then sends the appropriate
    *    message to the server.
    *
    *---------------------------------------------------------------------------
    */

   this._sendScrollEventMessage = function(touch) {
      var dx = 0, dy = 0, deltaX, deltaY, wheelDeltas, firstPos;
      if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.scroll) {
         deltaX = touch.clientX - _TAP_STATE.currentTouch.clientX;
         deltaY = touch.clientY - _TAP_STATE.currentTouch.clientY;

         wheelDeltas = this._calculateMouseWheelDeltas(deltaX, deltaY);
         dx = wheelDeltas.wheelDeltaX;
         dy = wheelDeltas.wheelDeltaY;

         // Only send if at least one of the deltas has a value.
         if (dx !== 0 || dy !== 0) {
            firstPos = this._applyZoomCorrectionToTouchXY(_TAP_STATE.touchArray[0]);
            _widget.sendScrollMessage(firstPos, dx, dy);

            // Update clientX, clientY values as we only need them.
            if (dx !== 0) {
               _TAP_STATE.currentTouch.clientX = touch.clientX;
            }

            if (dy !== 0) {
               _TAP_STATE.currentTouch.clientY = touch.clientY;
            }
         }
      }
      // TODO: Improve scroll by using residual scroll data when delta < minDeltaDistancePx.
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _calculateMouseWheelDeltas
    *
    *    This function calculates the wheelDeltaX and wheelDeltaY values
    *    according to the scroll delta distance.
    *
    *---------------------------------------------------------------------------
    */

   this._calculateMouseWheelDeltas = function(deltaX, deltaY) {
      var dx = 0,
          dy = 0,
          absDeltaX = Math.abs(deltaX),
          absDeltaY = Math.abs(deltaY),
          scrollX = absDeltaX > WMKS.CONST.TOUCH.SCROLL.minDeltaDistancePx,
          scrollY = absDeltaY > WMKS.CONST.TOUCH.SCROLL.minDeltaDistancePx,
          angle;

      /*
       * We don't want to send movements for every pixel we move.
       * So instead, we pick a threshold, and only scroll that amount.
       * This won't be perfect for all applications.
       */
      if (scrollX && scrollY) {
         /*
          * If the scroll angle is smaller than 45 degree,
          * do horizontal scroll; otherwise, do vertical scroll.
          */
         if (absDeltaY < absDeltaX) {
            // Horizontal scroll only.
            scrollY = false;
         } else {
            // Vertical scroll only.
            scrollX = false;
         }
      }

      if (scrollX) {
         dx = deltaX > 0 ? 1 : -1;
      }

      if (scrollY) {
         dy = deltaY > 0 ? -1 : 1;
      }

      if (_widget.options.reverseScrollY) {
         dy = dy * -1;
      }

      return {wheelDeltaX : dx, wheelDeltaY : dy};
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _updatePreScrollState
    *
    *    This function verifies if there was a residual scroll event, and if so.
    *    sends that after computing the directing of the scroll.
    *
    *---------------------------------------------------------------------------
    */

   this._updatePreScrollState = function(touch) {
      var deltaY = touch.clientY - _TAP_STATE.currentTouch.clientY;
      _TAP_STATE.scrollCount++;
      if (deltaY < 0) {
         _TAP_STATE.skipScrollCount--;
      } else {
         _TAP_STATE.skipScrollCount++;
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _sendResidualScrollEventMessage
    *
    *    This function verifies if there was a residual scroll event, and if so.
    *    sends that after computing the directing of the scroll.
    *
    *---------------------------------------------------------------------------
    */

   this._sendResidualScrollEventMessage = function() {
      // Detech if there is a leftover scroll event to be sent.
      if (_TAP_STATE.skipScrollCount !== 0 && _TAP_STATE.currentTouch) {
         var pos, sendScroll;

         // Server pays attention only to the sign of the scroll direction.
         sendScroll = (_TAP_STATE.skipScrollCount < 0) ? -1 : 1;

         WMKS.LOGGER.debug('Sending a residual scroll message.');
         WMKS.LOGGER.debug('Cur touch: ' + _TAP_STATE.currentTouch.pageX
            + ' , ' + _TAP_STATE.currentTouch.pageY);

         _TAP_STATE.skipScrollCount = 0;
         pos = this._applyZoomCorrectionToTouchXY(_TAP_STATE.currentTouch);
         // TODO KEERTHI: Fix this for horizontal scrolling as well.
         // dx for horizontal, dy for vertical.
         _widget.sendScrollMessage(pos, sendScroll, 0);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _isDoubleTap
    *
    *    Function to check if the tap is part of a double tap. The logic to
    *    determine is:
    *    1. There is always another tap earlier to this one.
    *    2. The time and proximity b/w 2 taps happen within the threshold values
    *    set in the constants: C.DOUBLE_TAP
    *    3. Based on heuristics we found that some double taps took longer than
    *    the threshold value but more accurate. Hence extend the time b/w double
    *    taps if the proximity of these 2 taps are under the
    *    tapGapBonus4TimeRatio(0.4) of the acceptable limit (tapGapInDistance).
    *    4. Make sure the double tap is always different from the two finger
    *    tap and the thresholds are within acceptable limits.
    *---------------------------------------------------------------------------
    */

   this._isDoubleTap = function(event, now) {
      var dist, duration;
      // Check if this is the second tap and there is a time delay from the first.
      if (_TAP_STATE.currentTouch === null || _TAP_STATE.tapStartTime === null
         || _TAP_STATE.opType !== WMKS.CONST.TOUCH.OP.none) {
         return false;
      }
      // Compute time difference and click position distance b/w taps.
      dist = WMKS.UTIL.TOUCH.touchDistance(_TAP_STATE.currentTouch, event.targetTouches[0]);
      duration = (now - _TAP_STATE.tapStartTime);
      // WMKS.LOGGER.debug('is tap_two (ms): ' + duration + ' & offset (px): ' + dist);

      // Check if the second tap occurred within the same vicinity as the first.
      if (dist < WMKS.CONST.TOUCH.DOUBLE_TAP.tapGapInDistance) {
         // If duration b/w taps is within acceptable limit
         if (duration < WMKS.CONST.TOUCH.DOUBLE_TAP.tapGapInTime) {
            // WMKS.LOGGER.debug('double tap correction activated.');
            return true;
         }
         // If the taps were extremely accurate < 40% tap gap, add the extra bonus tap gap time
         if ((dist / WMKS.CONST.TOUCH.DOUBLE_TAP.tapGapInDistance) < WMKS.CONST.TOUCH.DOUBLE_TAP.tapGapBonus4TimeRatio
                 && duration < (WMKS.CONST.TOUCH.DOUBLE_TAP.tapGapInTime + WMKS.CONST.TOUCH.DOUBLE_TAP.tapGapBonusTime)) {
            // WMKS.LOGGER.trace('Duration eligible for bonus with tapGapBonus4TimeRatio: '
            //      + (dist / WMKS.CONST.TOUCH.DOUBLE_TAP.tapGapInDistance));
            // WMKS.LOGGER.debug('double tap bonus correction activated.');
            return true;
         }
      }
      return false;
   };

   /*
    *---------------------------------------------------------------------------
    *
    * _onTouchStart
    *
    *    Called when a touch operation begins.
    *    A state machine is initiated which knows the number of fingers used for
    *    this touch operation in the case where it uses one finger.
    *
    *    For every touchstart, we perform the following logic:
    *    1. If the touch fingers = 1:
    *       a) Check if this touchstart is part of a double-click. If so, set
    *       the state machine info accordingly.
    *       b) If not, then update the state machine accordingly.
    *       c) for both case above, initialize a drag timer function with a
    *           delay threshold and upon triggering, initialize and set
    *           operation as a drag.
    *    2. If touch fingers = 2:
    *       a) Detect if we had earlier detected a 1 finger touchstart. In this
    *          case if the second touch happens quite late (After a set
    *          threshold) then we just ignore it. If not, then transform into
    *          a 2 finger touchstart.
    *          NOTE: This clears out the old 1 finger touchstart state.
    *       b) Initialize the 2 finger touch start as this could be a zoom /
    *          scroll/ right-click.
    *    3. The 3 finger touch start is detected, and if no operation is
    *       previously detected, then flag that state and toggle the keyboard.
    *
    *---------------------------------------------------------------------------
    */

   this._onTouchStart = function(e) {
      var pos, timeGap, self = this, now = $.now();

      // WMKS.LOGGER.debug('Start#: ' + e.targetTouches.length);
      // Unless two fingers are involved (native scrolling) prevent default
      if (e.targetTouches.length === 1) {
         /*
          * If it involves one finger, it may be:
          * - left click (touchstart and touchend without changing position)
          * - left drag (touchstart, activation timeout, touchmove, touchend)
          * - right click with staggered fingers (touchstart, touchstart, touchend)
          * - pan and scan (default behavior)
          * Allow the default behavior, but record the touch just in case it
          * becomes a click or drag.
          *
          * Also, check for a double click. See isDoubleTap() for details.
          */

         if (this._isDoubleTap(e, now)) {
            _TAP_STATE.firstTouch =
               WMKS.UTIL.TOUCH.copyTouch(_TAP_STATE.currentTouch);
            _TAP_STATE.opType = WMKS.CONST.TOUCH.OP.tap_twice;
         } else {
            _TAP_STATE.firstTouch =
               WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[0]);
            _TAP_STATE.currentTouch =
               WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[0]);
         }

         _TAP_STATE.currentTouchFingers = 1;
         _TAP_STATE.tapStartTime = now;

         // ontouchmove destroys this timer. The finger must stay put.
         if (_dragTimer !== null) {
            clearTimeout(_dragTimer);
         }

         _dragTimer = setTimeout(function() {
            _dragTimer = null;

            // Update opType and init the drag event.
            _TAP_STATE.opType = WMKS.CONST.TOUCH.OP.drag;
            self._initDragEventAndSendFeedback(_TAP_STATE.firstTouch);
         }, WMKS.CONST.TOUCH.leftDragDelayMs);

         // Must return true, else pinch to zoom and pan and scan will not work
         return true;
      } else if (e.targetTouches.length === 2) {
         // If touchstart happen a while after one another, wrap up the original op.
         if (_TAP_STATE.currentTouchFingers === 1) {
            // Now the second tap happens after a while. Check if its valid
            timeGap = now - _TAP_STATE.tapStartTime;
            if (timeGap > WMKS.CONST.TOUCH.additionalTouchIgnoreGapMs) {
               if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.drag) {
                  // Drag was in progress and we see a new touch.
                  // Hence end this and start a new one.
                  pos = this._applyZoomCorrectionToTouchXY(e.targetTouches[0]);
                  _widget.sendMouseButtonMessage(pos, true, WMKS.CONST.CLICK.left);
                  this._resetTouchState();
               }
            }
         }

         // Setup for 2 finger gestures.
         this._initTwoFingerTouch(WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[0]),
            WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[1]));
         // Always allow default behavior, this allows the user to pinch to zoom
         return true;
      } else if (e.targetTouches.length === 3) {
         // Three fingers, toggle keyboard only if no gesture is detected.
         if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.none) {
            _TAP_STATE.opType = WMKS.CONST.TOUCH.OP.tap_3finger;
            this.toggleKeyboard();
            // Set touch fingers value, so touchend knows to clear state.
            _TAP_STATE.currentTouchFingers = 3;
         }
         return false;
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _onTouchMove
    *
    *    This function handler is invoked when touchmove is detected. Here we do
    *    the following:
    *    1. Keep a track of how many touchmove events happen.
    *    2. Clear out if any dragTimer as we see a touchmove.
    *    3. If we have already detected an opType, then we just apply the
    *       touchmove to that operation. Even if touch fingers changes midflight,
    *       ignore them, as the use has already started using the operation
    *       and hence should continue with that.
    *    4. If no operation is detected and the touch fingers changes midflight,
    *       then it could be the following:
    *       a) Downgrade (2 --> 1 finger): If there is no scale value(distance
    *          b/w touches didn't change), then its a right-click.
    *       b) Upgrade (1 --> 2 finger): This is technically the same as a
    *          2-finger touchstart at this point. NOTE: If there is a downgrade,
    *          there wont be an upgrade.( It never goes from 2 --> 1 and then
    *          1 --> 2 later).
    *       c) If neither of the above, then its something we don't handle, must
    *          be a zoom/pinch. Hence let the default behavior kick in.
    *    5. When the touch fingers is 1, then it could be one of the following:
    *       a) Wobbly fingers that we need to ignore move distance < threshold (10px).
    *       b) Quick fingers, that's described in the function that detects it.
    *          This can happen with a very specific set of data, and if so, detect
    *          this as an initialization to 2 finger touchstart event.
    *       c) If neither of the above, then panning is assumed, and leave this
    *          to the browser to handle.
    *    6. If the touch fingers = 2, then attempt to detect a scroll / zoom.
    *       This is done based on computing the angle b/w the lines created from
    *       the touch fingers starting point to their touchmoved destination.
    *       Based on the angle, we determine if its a scroll or not. Sample
    *       multiple times before making the decision.
    *
    *    During the computation, we use various touch state entities to manage
    *    the overall state and assists in detecting the opType.
    *
    *---------------------------------------------------------------------------
    */

   this._onTouchMove = function(e) {
      var dist, pos;

      // Reset the drag timer if there is one.
      if (_dragTimer !== null) {
         clearTimeout(_dragTimer);
         _dragTimer = null;
      }

      // Increment touchMove counter to keep track of move event count.
      _TAP_STATE.touchMoveCount++;

      /* if (_TAP_STATE.touchMoveCount < 10) {
         WMKS.LOGGER.debug('move#: ' + _TAP_STATE.touchMoveCount
            + ' touch#: ' + e.targetTouches.length);
      } */

      /*
       * 1. Current touchFingers can be -1, allow default browser behavior.
       * 2. If the opType is defined, allow those gestures to complete.
       * 3. Now see if we can determine any gestures.
       */
      if (_TAP_STATE.currentTouchFingers === -1) {
         return true;
      } else if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.scroll) {
         // Scroll is detected, stick to it irrespective of the change in touch
         // fingers, etc.
         // WMKS.LOGGER.trace('continue scroll.. fingers change midflight.');
         this._sendScrollEventMessage(e.targetTouches[0]);
         return false;
      } else if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.drag) {
         // Drag is now moved. Send mousemove.
         _TAP_STATE.currentTouch = WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[0]);
         this.moveCursor(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
         pos = this._applyZoomCorrectionToTouchXY(e.targetTouches[0]);

         _widget.sendMouseMoveMessage(pos);
         // Inhibit the default so pan does not occur
         return false;
      } else if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.tap_3finger) {
         /*
          * keyboard is already toggled but we retain the state as is here
          * to avoid touch fingers changing midflight causing a state change
          * to something else.
          */
         return false;
      } else if (_TAP_STATE.currentTouchFingers !== e.targetTouches.length) {
         // WMKS.LOGGER.debug('# of fingers changed midflight ('
         //   + _TAP_STATE.currentTouchFingers + '->' + e.targetTouches.length
         //   + '), scale: ' + e.scale + ', type: ' + _TAP_STATE.opType);
         if (_TAP_STATE.currentTouchFingers === 2 && e.targetTouches.length === 1) {
            if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.none && e.scale === 1) {
               // Touch ended early, is not a pinch/zoom(scale = 1).
               // Flag as a right click & clear state.
               WMKS.LOGGER.debug('touch: 2 -> 1 & !scroll, hence right-click.');
               this._sendTwoTouchEvent(_TAP_STATE.firstTouch,
                                       _TAP_STATE.firstTouch,
                                       WMKS.CONST.CLICK.right, e);
               this._resetTouchState();
               return false;
            }
         } else if (_TAP_STATE.currentTouchFingers === 1 && e.targetTouches.length === 2) {
            // No touchstart before this, so handle it as a 2 finger init here.
            WMKS.LOGGER.debug('touch: 1 -> 2, init 2fingertap if no opType: ' + _TAP_STATE.opType);
            this._initTwoFingerTouch(WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[0]),
               WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[1]));
            // Since we do not know if this is a zoom/scroll/right-click, return true for now.
            return true;
         } else {
            WMKS.LOGGER.debug('touch: 2 -> 1: infer as PINCH/ZOOM.');
            this._resetTouchState();
            return true;
         }
      } else if (_TAP_STATE.currentTouchFingers === 1) {
         // e.targetTouches.length = 1 based on above condition check.
         dist = WMKS.UTIL.TOUCH.touchDistance(e.targetTouches[0], _TAP_STATE.currentTouch);
         // If we have quick fingers convert into 2 finger touch gesture.
         if(this._verifyQuickTouches(e, dist, _TAP_STATE.touchMoveCount)) {
            // Initialize setup for 2 finger gestures.
            this._initTwoFingerTouch(WMKS.UTIL.TOUCH.copyTouch(_TAP_STATE.firstTouch),
               WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[0]));

            // This occurred in touchmove, so not a right click, hence a scroll.
            _TAP_STATE.opType = WMKS.CONST.TOUCH.OP.scroll;
            return false;
         }
         else if (dist < WMKS.CONST.TOUCH.tapMoveCorrectionDistancePx){
            // If move is within a threshold, its may be a click by wobbly fingers.
            // Left click should not becomes a pan if within the threshold.
            return true;
         } else {
            /**
             * TODO: It would be nice to avoid the trackpad completely by
             * replacing trackpad functionality with a trackpad/relative mode.
             * This differs from the original/absolute touch mode by is relative
             * nature of the cursor location and the touch location. The
             * relative mode acts as a huge trackpad.
             */
           this._resetTouchState();
           return true;
         }
      } else if (_TAP_STATE.currentTouchFingers === 2) {
         // Determine type of operation if its not set, or the state is not cleaned up.
         if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.none) {
            if (_TAP_STATE.touchArray.length === 0 || _TAP_STATE.touchArray.length !== 2) {
               // If the the original touches were not captured, classify this as zoom/pinch.
               this._resetTouchState();
               return true;
            }

            // Initially scale = 1 is common, ignore event as this does not add any value.
            if (e.scale === 1 && _TAP_STATE.touchMoveCount < 5) {
               // No move detected so far, hence skip this touchmove, return true.
               return true;
            }

            /*
             * Compute the angle b/w the 2 lines. Each line is computed off of 2
             * touch points (_TAP_STATE.touchArray & e.TargetTouches). The angle
             * for each line (in radians) ranges from -Phi to +Phi (3.1416).
             * The difference in angle can tell us if the 2 finger swipes
             * are closer (scroll) to each other or farther away(zoom/pinch).
             */
            var angle = WMKS.UTIL.TOUCH.touchAngleBwLines(
                  _TAP_STATE.touchArray[0], e.targetTouches[0],
                  _TAP_STATE.touchArray[1], e.targetTouches[1]);
            angle = Math.abs(angle);
            // WMKS.LOGGER.debug(_TAP_STATE.touchMoveCount + ', scale:'
            //    + e.scale + ', angle: ' + angle);
            if (angle === 0) {
               // One of the touch fingers did not move, missing angle, do nothing.
               return true;
            } else if (angle < 1 || angle > 5.2) {
               // This is a scroll. Coz the smaller angle is under 1 radian.

               // Update scrollCount & scrollSkipCount before we finalize as a scroll.
               this._updatePreScrollState(e.targetTouches[0]);

               // If the minimum sampling count isn't met, sample again to be accurate.
               if (_TAP_STATE.scrollCount >= WMKS.CONST.TOUCH.touchMoveSampleMinCount) {
                  // Now we are sure this is a scroll with 2 data samples.
                  this._showFeedback(_ELEMENTS.scrollFeedback, _TAP_STATE.firstTouch,
                     { 'position': 'left', 'offsetLeft': -50, 'offsetTop': -25 });
                  _TAP_STATE.opType = WMKS.CONST.TOUCH.OP.scroll;
                  _TAP_STATE.currentTouch = WMKS.UTIL.TOUCH.copyTouch(e.targetTouches[0]);
                  // WMKS.LOGGER.debug('This is a scroll.');
                  return false;
               }
            } else {
               // The smaller angle b/w the 2 lines are > about 1 radian, hence a pinch/zoom.
               _TAP_STATE.zoomCount++;

               // If the minimum sampling count isn't met, sample again to be accurate.
               if (_TAP_STATE.zoomCount >= WMKS.CONST.TOUCH.touchMoveSampleMinCount) {
                  // Now we are sure this is a zoom/pinch.
                  // WMKS.LOGGER.debug('This is a zoom / pinch');
                  this._resetTouchState();
                  return true;
               }
            }
            return true;
         }
      }
      // For cases we don't deal with let default handle kick in.
      return true;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _onTouchEnd
    *
    *    Called when a touch operation ends. The following happens here:
    *    1. If the touch state does not exist we do nothing & allow the default
    *       handling to kick in.
    *    2. If an opType has been detected, we terminate its state and
    *       send appropriate termination signals if any.
    *    3. If no opType is detected, then it could be a a single finger
    *       left click or a 2 finger right click. In each case, send the
    *       appropriate signal and in case of left click, store the time when
    *       the click was initiated, so that double click could be detected.
    *
    *---------------------------------------------------------------------------
    */

   this._onTouchEnd = function(e) {
      var pos, touches;

      // Reset the drag timer if there is one.
      if (_dragTimer !== null) {
         clearTimeout(_dragTimer);
         _dragTimer = null;
      }
      if (_TAP_STATE.currentTouchFingers === -1) {
         return true;
      } else if (e.targetTouches.length === 0) {

         // Check if it is almost a scroll but user stopped scrolling after we detected.
         if (_TAP_STATE.skipScrollCount !== 0) {
            // WMKS.LOGGER.debug('Flag as scroll as there is a residual scroll data.');
            // Sometimes its already a scroll, won't hurt.
            _TAP_STATE.opType = WMKS.CONST.TOUCH.OP.scroll;
         }

         // Check against the known opTypes and at the last the unknown ones.
         switch(_TAP_STATE.opType) {
            case WMKS.CONST.TOUCH.OP.scroll:
               // WMKS.LOGGER.debug('scroll complete, send residual scroll & clear state.');
               this._sendResidualScrollEventMessage(e);
               this._resetTouchState();
               return false;
            case WMKS.CONST.TOUCH.OP.tap_twice:
               // WMKS.LOGGER.debug('Send tap twice with feedback: ' + _TAP_STATE.opType);
               this._sendTwoTouchEvent(_TAP_STATE.firstTouch, _TAP_STATE.currentTouch,
                                      WMKS.CONST.CLICK.left, e);
               this._resetTouchState();
               return false;
            case WMKS.CONST.TOUCH.OP.tap_3finger:
               // WMKS.LOGGER.debug('kb already handled, clear state.');
               this._resetTouchState();
               return false;
            case WMKS.CONST.TOUCH.OP.drag:
               // NOTE: Caret position is getting updated via the wts event.
               // for drag, send the mouse up at the end position
               touches = e.changedTouches;

               // There should only be one touch for dragging
               if (touches.length === 1) {
                  pos = this._applyZoomCorrectionToTouchXY(touches[0]);
                  _widget.sendMouseButtonMessage(pos, false, WMKS.CONST.CLICK.left);
               } else {
                  WMKS.LOGGER.warn('Unexpected touch# ' + touches.length
                     + ' changed in a drag operation!');
               }
               this._resetTouchState();
               return false;
            default:
               if (_TAP_STATE.currentTouchFingers === 1) {
                  // End a single tap - left click, send mousedown, mouseup together.
                  this._sendTwoTouchEvent(_TAP_STATE.firstTouch,
                                          _TAP_STATE.currentTouch,
                                          WMKS.CONST.CLICK.left, e);
                  this._resetTouchState(true);
                  return false;
               } else if (_TAP_STATE.currentTouchFingers === 2) {
                  // End a 2-finger tap, and if no opType is set this is a right-click.
                  // Send mousedown, mouseup together.
                  this._sendTwoTouchEvent(_TAP_STATE.firstTouch,
                                          _TAP_STATE.firstTouch,
                                          WMKS.CONST.CLICK.right, e);
                  this._resetTouchState();
                  return false;
               }
         }

         // Reset touch state as we are done with the gesture/tap, return false.
         this._resetTouchState();
         return false;
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _resetTouchState
    *
    *    Resets the touch state machine.
    *
    *---------------------------------------------------------------------------
    */

   this._resetTouchState = function(keepLastTouchState) {
      if (!keepLastTouchState) {
         _TAP_STATE.tapStartTime = null;
         _TAP_STATE.currentTouch = null;
      }
      _TAP_STATE.currentTouchFingers = -1;
      _TAP_STATE.opType = WMKS.CONST.TOUCH.OP.none;
      _TAP_STATE.firstTouch = null;
      _TAP_STATE.touchArray.length = 0;

      // Also reset the tap state clearing prev data.
      _TAP_STATE.touchMoveCount = 0;
      _TAP_STATE.skipScrollCount = 0;
      _TAP_STATE.scrollCount = 0;
      _TAP_STATE.zoomCount = 0;
   };


   /*
    *---------------------------------------------------------------------------
    * _sendTwoTouchEvent
    *
    *    This function sends the mousedown on first event and a mouseup on the
    *    second. This could be a brand new click or part of a two finger tap
    *---------------------------------------------------------------------------
    */

   this._sendTwoTouchEvent = function(firstTouch, secondTouch, button) {
      // Send modifier keys as well if any to support inputs like 'ctrl click'
      var pos = this._applyZoomCorrectionToTouchXY(firstTouch);
      _widget.sendMouseButtonMessage(pos, true, button);

      /*
      WMKS.LOGGER.warn('Zoom: ' +
         ' screenXY: ' + firstTouch.screenX + ',' + firstTouch.screenY +
         ' clientXY: ' + firstTouch.clientX + ',' + firstTouch.clientY +
         ' pageXY: '   + firstTouch.pageX   + ',' + firstTouch.pageY);
      */
      if (_TAP_STATE.opType === WMKS.CONST.TOUCH.OP.tap_twice) {
         _widget.sendMouseButtonMessage(pos, false, button);

         // Send the double click feedback with a throbbing effect (use showTwice).
         this._showFeedback(_ELEMENTS.clickFeedback, firstTouch, {showTwice: true});
      } else {
         pos = this._applyZoomCorrectionToTouchXY(secondTouch);
         _widget.sendMouseButtonMessage(pos, false, button);
         this._showFeedback(_ELEMENTS.clickFeedback, firstTouch);
      }
      return true;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * addToRepositionQueue
    *
    *    This function adds the element to the reposition queue and upon
    *    rotation, the private function _repositionFloatingElementsOnRotation()
    *    ensures these elements are positioned within the canvas region.
    *
    *---------------------------------------------------------------------------
    */

   this.addToRepositionQueue = function(element) {
      if (element) {
         _repositionElements.push(element);
      }
   };

   /*
    *---------------------------------------------------------------------------
    * widgetRepositionOnRotation
    *
    *    Widgets need to be repositioned on orientation change. This change is one
    *    of two forms and needs correction only when they are shown.
    *    1. Landscape -> portrait: Widget may be to the right of the visible area.
    *    2. Portrait -> Landscape: Widget may be to the bottom of the visible area.
    *
    *    The logic used to reposition the widget, is if the widget is beyond the
    *    visible area, ensure that the widget is pulled back within the screen.
    *    The widget is pulled back enough so the right/bottom is at least 5px away.
    *
    *    TODO:
    *    1. Yet to handle when keyboard is popped out (use window.pageYOffset)
    *    2. Also watch out for a case when the screen is zoomed in. This is tricky
    *       as the zoom out kicks in during landscape to portrait mode.
    *    3. window.pageXOffset is not reliable due coz upon rotation the white patch
    *       on the right appears and causes some additional window.pageXOffset
    *       value. Best bet is to store this value before rotation and apply after
    *       orientation change kicks in.
    *
    *    Returns true if the widget was repositioned, false if nothing changed.
    *---------------------------------------------------------------------------
    */

   this.widgetRepositionOnRotation = function(widget) {
      var w, h, size, screenW, screenH, hasPositionChanged = false;

      if (!WMKS.BROWSER.isTouchDevice()) {
         WMKS.LOGGER.warn('Widget reposition ignored, this is not a touch device.');
         return false;
      }

      if (!widget || widget.is(':hidden')) {
         return false;
      }

      w = widget.width();
      h = widget.height();
      // Get the current screen size.
      screenW = window.innerWidth;
      screenH = window.innerHeight;

      if (WMKS.UTIL.TOUCH.isPortraitOrientation()) {
         if ((widget.offset().left + w) > screenW) {
            widget.offset({ left: String(screenW - w - 5) });
            hasPositionChanged = true;
         }
      } else {
         if ((widget.offset().top + h) > screenH) {
            widget.offset({ top: String(screenH - h - 5) });
            hasPositionChanged = true;
         }
      }

      return hasPositionChanged;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _repositionFloatingElementsOnRotation
    *
    *    Called after the default orientation changes are applied. These are
    *    specific for the feedback icons, input textbox, the cursor icon and
    *    any element that was requested by addToRepositionQueue().
    *
    *    Cursor icon is visible and so is the input textbox and they need to be
    *    moved inside the canvas to avoid the viewport from growing larger than
    *    the canvas size.
    *
    *    TODO: If cursor position changed due to orientation changes, send the
    *    new location. This is only a few pixels away, so not worrying about it
    *    for now.
    *
    *---------------------------------------------------------------------------
    */

   this._repositionFloatingElementsOnRotation = function(e) {
      var self = this,
          canvasOffset = _canvas.offset();
      // Move them inside the canvas region if they are outside.
      this.widgetRepositionOnRotation(_ELEMENTS.inputProxy);
      this.widgetRepositionOnRotation(_ELEMENTS.cursorIcon);

      // Position these hidden elements within the canvas.
      // NOTE: Problem is on iOS-6.1.2, but not on iOS-6.0.2, see bug: 996595#15
      // WMKS.LOGGER.trace(JSON.stringify(canvasOffset));
      _ELEMENTS.clickFeedback.offset(canvasOffset);
      _ELEMENTS.dragFeedback.offset(canvasOffset);
      _ELEMENTS.pulseFeedback.offset(canvasOffset);
      _ELEMENTS.scrollFeedback.offset(canvasOffset);

      // Now handle the list of elements added via addToRepositionQueue()
      $.each(_repositionElements, function(i, element) {
         // Just to be safe, we try this out here.
         try {
            // WMKS.LOGGER.info('reposition req: ' + element.attr('id')
            //    + element.attr('class'));
            self.widgetRepositionOnRotation(element);
         } catch (err) {
            WMKS.LOGGER.warn('Custom element reposition failed: ' + err);
         }
      });
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _onOrientationChange
    *
    *    Called when the device's orientation changes.
    *
    *
    *---------------------------------------------------------------------------
    */

   this._onOrientationChange = function(e) {
      var self = this;

      if (this._isInputInFocus()) {
         // Listen to resize event.
         $(window).one('resize', function(e) {
            /*
             * Trigger orientationchange event to adjust the screen size.
             * When the keyboard is opened, resize happens after orientationchange.
             */
            setTimeout(function() {
               $(window).trigger('orientationchange');
               // Reposition widgets and icons.
               self._repositionFloatingElementsOnRotation();
            }, 500);
         });
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _applyZoomCorrectionToTouchXY
    *
    *    Compute the position of a touch event relative to the canvas and apply
    *    the zoom value correction to get the right location on the canvas.
    *
    *    TODO: Apply native zoom correction for touch location.
    *
    *---------------------------------------------------------------------------
    */

   this._applyZoomCorrectionToTouchXY = function(touch) {
      if (touch === null) {
         WMKS.LOGGER.warn('Unexpected: touch is null.');
         return null;
      }
      // Compute the x,y based on scroll / browser zoom values as well.
      return _widget.getEventPosition(touch);
   };

   /*
    *---------------------------------------------------------------------------
    *
    * _showFeedback
    *
    *    This function displays the feedback object passed to it for a brief
    *    moment. The feedback indicator is not positioned directly over the
    *    click location, but centered around it. The feedback jQuery object
    *    is cached to avoid repeated lookups.
    *
    *    The animation mimics the View Client: show indicator at the location
    *    and hide after some time. jQuery animations suffered from 2 animation
    *    queue overload and gets corrupted easily. Hence we rely on CSS3
    *    animations which are also crisp as its executed in the browser space.
    *
    *    No matter what you do, the caret container is also made visible and is
    *    moved to the location of the click, where it stays.
    *
    *    feedback  - the jQuery object to animate
    *    touch     - touch object from which to derive coords
    *    inputArgs - input args that change position, offsetLeft, offsetTop.
    *---------------------------------------------------------------------------
    */

   this._showFeedback = function(feedback,touch, inputArgs) {
      var multiplier, padLeft, padTop, args = inputArgs || {};
      if (!touch || !feedback) {
         WMKS.LOGGER.trace('No touch value / feedback object, skip feedback.');
         return;
      }
      // Calculate if there is any input padding offsets to be applied.
      padLeft = args.offsetLeft || 0;
      padTop = args.offsetTop || 0;
      // Get multiplier width & height to position feedback element accordingly.
      multiplier = WMKS.UTIL.TOUCH.getRelativePositionMultiplier(args.position);
      feedback.css({
         'left': touch.pageX + padLeft + feedback.outerWidth() * multiplier.width,
         'top': touch.pageY + padTop + feedback.outerHeight() * multiplier.height
      });

      //  Just move the icon to the right place.
      this.moveCursor(touch.pageX, touch.pageY);
      /*
       * Since the same feedback indicator is used for both double tap and single tap,
       * we have to remove all animation classes there were applied.
       * This may change once we have unique elements for each of the feedback indicators.
       */
      feedback.removeClass('animate-feedback-indicator animate-double-feedback-indicator');
      if (args.showTwice) {
         setTimeout(function() {
            feedback.addClass('animate-double-feedback-indicator');
         }, 0);
      } else {
         setTimeout(function() {
            feedback.addClass('animate-feedback-indicator');
         }, 0);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * moveCursor
    *
    *    Repositions the fake caret to match the given touch's location. Since
    *    the 'tip' of the caret represents the click location, no centering is
    *    desired.
    *
    *---------------------------------------------------------------------------
    */

   this.moveCursor = function(pageX, pageY) {
      if (_ELEMENTS.cursorIcon) {
         _ELEMENTS.cursorIcon.css({'left': pageX, 'top': pageY});
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * setCursorVisibility
    *
    *    Hide or show the fake caret.
    *
    *---------------------------------------------------------------------------
    */

   this.setCursorVisibility = function(visible) {
      if (_ELEMENTS.cursorIcon) {
         if (visible) {
            _ELEMENTS.cursorIcon.show();
         } else {
            _ELEMENTS.cursorIcon.hide();
         }
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _sendKeyInput
    *
    *    Sends a key plus the manual modifiers entered on the extended keyboard.
    *    Simulates the keydowns and keyups which would happen if this were entered
    *    on a physical keyboard.
    *
    *---------------------------------------------------------------------------
    */

   this._sendKeyInput = function(key) {
      _widget.sendKeyInput(key);
   };

   /*
    *---------------------------------------------------------------------------
    *
    * onCaretPositionChanged
    *
    *    Handler for when the caret position changes.
    *
    *    We use this to dynamically position our invisible input proxy
    *    such that focus events for it don't cause us to move away from
    *    the screen offset from where we are typing.
    *
    *---------------------------------------------------------------------------
    */

   this.onCaretPositionChanged = function(pos) {
      var offsetX, offsetY;

      if (_ELEMENTS.inputProxy) {
         offsetX = pos.x;
         offsetY = pos.y;

         // Ensure the position is bound in the visible area.
         if (offsetX < window.pageXOffset) {
            offsetX = window.pageXOffset;
         }
         if (offsetY < window.pageYOffset) {
            offsetY = window.pageYOffset;
         }

         _ELEMENTS.inputProxy.offset({left: offsetX, top: offsetY});
         // WMKS.LOGGER.warn('left: ' + _ELEMENTS.inputProxy.offset().left
         //   + ', top: ' + _ELEMENTS.inputProxy.offset().left);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _keyboardDisplay
    *
    *    The event triggered when user wants to explicitly show or hide the
    *    keyboard.
    *    show - true shows keyboard, false flips it.
    *
    *---------------------------------------------------------------------------
    */

   this._keyboardDisplay = function(show) {
      // WMKS.LOGGER.debug('kb show: ' + (show? 'true' : 'false'));

      if (show) {
         _canvas.focus();
         _ELEMENTS.inputProxy.focus().select();
      } else {
         if (WMKS.BROWSER.isAndroid()) {
            // If its set to readonly & disabled keyboard focus goes away.
            _ELEMENTS.inputProxy.attr('readonly', true)
                                .attr('disabled', true);
            // Reset the readonly and disabled property values after some time.
            setTimeout(function() {
               _ELEMENTS.inputProxy.attr('readonly', false)
                                   .attr('disabled', false);
               _canvas.focus();
            }, 100);
         }
         /*
          * The only method that seems to work on iOS to close the keyboard.
          *
          * http://uihacker.blogspot.com/2011/10/javascript-hide-ios-soft-keyboard.html
          */
         document.activeElement.blur();
         _KEYBOARD.visible = false;
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _isInputInFocus
    *
    *    Returns the state if the input-proxy is in focus. When it does, the
    *    keyboard should be showing as well.
    *
    *    TODO: Verify if this function is needed?
    *
    *---------------------------------------------------------------------------
    */

   this._isInputInFocus = function() {
      return (document.activeElement.id === 'input-proxy');
   };

   /*
    *---------------------------------------------------------------------------
    *
    * _onInputFocus
    *
    *    Event handler for focus event on the input-proxy. Sync the keyboard
    *    highlight state here.
    *
    *---------------------------------------------------------------------------
    */

   this._onInputFocus = function(e) {
      this._sendUpdatedKeyboardState(true);
      // Hide this while we're typing otherwise we'll see a blinking caret.
      e.stopPropagation();
      return true;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _onInputBlur
    *
    *    Event handler for blur event on the input-proxy. Sync the keyboard
    *    highlight state here. Also save the timestamp for the blur event.
    *
    *---------------------------------------------------------------------------
    */

   this._onInputBlur = function(e) {
      this._sendUpdatedKeyboardState(false);
      e.stopPropagation();
      return true;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * _sendUpdatedKeyboardState
    *
    *    Helper function to set the keyboard launcher button highlight state
    *    based on the keyboard visibility.
    *
    *---------------------------------------------------------------------------
    */

   this._sendUpdatedKeyboardState = function(kbState) {
      _KEYBOARD.visible = kbState;
      _KEYBOARD.lastToggleTime = $.now();
      // Trigger keyboard toggle callback function.
      if ($.isFunction(_onToggle)) {
         _onToggle.call(this, ['KEYBOARD', _KEYBOARD.visible]);
      }
   };


   /****************************************************************************
    * Public Functions
    ***************************************************************************/


   /*
    *---------------------------------------------------------------------------
    *
    * toggleKeyboard
    *
    *    Called when the user wants to toggle on-screen keyboard visibility.
    *    show - flag to explicitly request keyboard show or hide.
    *    (When not toggling)
    *
    *---------------------------------------------------------------------------
    */

   this.toggleKeyboard = function(options) {
      if (!WMKS.BROWSER.isTouchDevice()) {
         WMKS.LOGGER.warn('Mobile keyboard not supported, this is not a touch device.');
         return;
      }

      if (!_ELEMENTS.inputProxy) {
         // Mobile keyboard toggler is not initialized. Ignore this request.
         return;
      }
      if (!!options && options.show === _KEYBOARD.visible) {
         // WMKS.LOGGER.debug('Keyboard is in the desired state.');
         return;
      }

      // Check in case the keyboard toggler request is not handled properly.
      if ($.now() - _KEYBOARD.lastToggleTime < WMKS.CONST.TOUCH.minKeyboardToggleTime) {
         /*
          * Seems like a spurious keyboard event as its occurring soon after the
          * previous toggle request. This can happen when the keyboard launcher
          * event handler is not implemented properly.
          *
          * Expected: The callback handler should prevent the default handler
          *           and return false.
          */
         WMKS.LOGGER.warn('Ignore kb toggle - Got request soon after focus/blur.');
         return;
      }

      // Show / hide keyboard based on new kBVisible value.
      this._keyboardDisplay(!_KEYBOARD.visible);
   };


   /*
    *---------------------------------------------------------------------------
    *
    * toggleTrackpad
    *
    *    Called when the user wants to toggle trackpad visibility.
    *
    *---------------------------------------------------------------------------
    */

   this.toggleTrackpad = function(options) {
      if (!WMKS.BROWSER.isTouchDevice()) {
         WMKS.LOGGER.warn('Trackpad not supported. Not a touch device.');
         return;
      }

      if (_ELEMENTS.trackpad) {
         // Set toggle callback function.
         options = $.extend({}, options, {
            toggleCallback: _onToggle
         });
         // Show / hide trackpad.
         _ELEMENTS.trackpad.toggle(options);
      }
   };



   /*
    *---------------------------------------------------------------------------
    *
    * toggleExtendedKeypad
    *
    *    Called when the user wants to toggle ExtendedKeypad visibility.
    *
    *---------------------------------------------------------------------------
    */

   this.toggleExtendedKeypad = function(options) {
      if (!WMKS.BROWSER.isTouchDevice()) {
         WMKS.LOGGER.warn('Extended keypad not supported. Not a touch device.');
         return;
      }

      if (_ELEMENTS.keypad) {
         // Set toggle callback function.
         options = $.extend({}, options, {
            toggleCallback: _onToggle
         });
         // Show / hide keypad.
         _ELEMENTS.keypad.toggle(options);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * installTouchHandlers
    *
    *    Install event handlers for touch devices.
    *
    *---------------------------------------------------------------------------
    */

   this.installTouchHandlers = function() {
      var self = this,
          container = _canvas.parent();

      if (!WMKS.BROWSER.isTouchDevice()) {
         WMKS.LOGGER.log('Not a touch device, and hence skip touch handler');
         return;
      }

      // Set css values to disable unwanted default browser behavior.
      _canvas.css({
         '-webkit-user-select':     'none',  /* disable cut-copy-paste */
         '-webkit-touch-callout':   'none'   /* disable callout, image save panel */
      });

      _canvas
         .bind('touchmove.wmks', function(e) {
            return self._onTouchMove(e.originalEvent);
         })
         .bind('touchstart.wmks', function(e) {
            return self._onTouchStart(e.originalEvent);
         })
         .bind('touchend.wmks', function(e) {
            return self._onTouchEnd(e.originalEvent);
         })
         .bind('orientationchange.wmks', function(event) {
            return self._onOrientationChange(event);
         })
         .bind('orientationchange.wmks.elements', function(e) {
            // Handler for repositioning cursor, feedback icons, input textbox
            // and elements added externally.
            self._repositionFloatingElementsOnRotation(e);
         });

      // Create touch feedbacks.
      _ELEMENTS.cursorIcon = $('<div/>')
         .addClass('feedback-container cursor-icon')
         .appendTo(container);
      _ELEMENTS.clickFeedback = $('<div/>')
         .addClass('feedback-container tap-icon')
         .appendTo(container);
      _ELEMENTS.dragFeedback = $('<div/>')
         .addClass('feedback-container drag-icon')
         .appendTo(container);
      _ELEMENTS.pulseFeedback = $('<div/>')
         .addClass('feedback-container pulse-icon')
         .appendTo(container);
      _ELEMENTS.scrollFeedback = $('<div/>')
         .addClass('feedback-container scroll-icon')
         .appendTo(container);

      /*
       * Double tapping or tapping on the feedback icons will inevitably involve
       * the user tapping the feedback container while it's showing. In such
       * cases capture and process touch events from these as well.
       */
      container
         .find('.feedback-container')
            .bind('touchmove.wmks', function(e) {
               return self._onTouchMove(e.originalEvent);
            })
            .bind('touchstart.wmks', function(e) {
               return self._onTouchStart(e.originalEvent);
            })
            .bind('touchend.wmks', function(e) {
               return self._onTouchEnd(e.originalEvent);
            });
   };


   /*
    *---------------------------------------------------------------------------
    *
    * disconnectEvents
    *
    *    Remove touch event handlers.
    *
    *---------------------------------------------------------------------------
    */

   this.disconnectEvents = function() {
      if (!_canvas) {
         return;
      }
      _canvas
         .unbind('orientationchange.wmks.icons')
         .unbind('orientationchange.wmks')
         .unbind('touchmove.wmks')
         .unbind('touchstart.wmks')
         .unbind('touchend.wmks');

      _canvas.find('.feedback-container')
         .unbind('touchmove.wmks')
         .unbind('touchstart.wmks')
         .unbind('touchend.wmks');
   };


   /*
    *---------------------------------------------------------------------------
    *
    * initializeMobileFeature
    *
    *    This function initializes the touch feature that's requested.
    *
    *---------------------------------------------------------------------------
    */

   this.initializeMobileFeature = function(type) {
      if (!WMKS.BROWSER.isTouchDevice()) {
         // Not a touch device, and hence will not initialize keyboard.
         return;
      }

      switch (type) {
         case WMKS.CONST.TOUCH.FEATURE.Trackpad:
            _ELEMENTS.trackpad = new WMKS.trackpadManager(_widget, _canvas);
            _ELEMENTS.trackpad.initialize();
            break;

         case WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad:
            _ELEMENTS.keypad = new WMKS.extendedKeypad({
                                  widget : _widget,
                                  parentElement: _canvas.parent(),
                                  keyboardManager: _keyboardManager
                               });
            _ELEMENTS.keypad.initialize();
            break;

         case WMKS.CONST.TOUCH.FEATURE.SoftKeyboard:
            _ELEMENTS.inputProxy = this.initSoftKeyboard();
            break;
         default:
            WMKS.LOGGER.error('Invalid mobile feature type: ' + type);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * initSoftKeyboard
    *
    *    This function installs an input element and installs event handlers
    *    that will be used for reading device keyboard inputs and translating
    *    into the corresponding server messages.
    *
    *    NOTE: Chrome on android returns in-valid keyCodes for keyDown/keyPress.
    *
    *---------------------------------------------------------------------------
    */

   this.initSoftKeyboard = function() {
      var self = this,
          kbHandler = _keyboardManager;

      /*
       * Add a textbox that which on gaining focus launches the keyboard.
       * Listen for key events on the textbox. Append the textbox to the canvas
       * parent so that to make listening for input events easier.
       *
       * Adding this to the canvas parent is better than to the document.body
       * as we can eliminate the need to detect the parent's offset from
       * the screen while positioning the inputbox.
       *
       * To make the textbox functional and still hidden from the user by using
       * transparent background, really small size (1x1 px) textbox without
       * borders. To hide the caret, we use 0px font-size and disable any of
       * the default selectable behavior for copy-paste, etc.
       */
       var inputDiv = $('<input type="text"/>')
         .val(WMKS.CONST.KB.keyInputDefaultValue)
         .attr({
            'id':                   'input-proxy',
            'autocorrect':          'off',    /* disable auto correct */
            'autocapitalize':       'off' })  /* disable capitalizing 1st char in a word */
         .css({
            'font-size':            '1px',    /* make the caret really small */
            'width':                '1px',    /* Non-zero facilitates keyboard launch */
            'height':               '1px',
            'background-color':     'transparent',    /* removes textbox background */
            'color':                'transparent',    /* removes caret color */
            'box-shadow':           0,        /* remove box shadow */
            'outline':              'none',   /* remove orange outline - android chrome */
            'border':               0,        /* remove border */
            'padding':              0,        /* remove padding */
            'left':                 -1,       /* start outside the visible region */
            'top':                  -1,
            'overflow':             'hidden',
            'position':             'absolute' })
         .bind('blur',     function(e) { return self._onInputBlur(e); })
         .bind('focus',    function(e) { return self._onInputFocus(e); })
         .bind('input',    function(e) { return kbHandler.onInputTextSoftKb(e); })
         .bind('keydown',  function(e) { return kbHandler.onKeyDownSoftKb(e); })
         .bind('keyup',    function(e) { return kbHandler.onKeyUpSoftKb(e); })
         .bind('keypress', function(e) { return kbHandler.onKeyPressSoftKb(e); })
         .appendTo('body');

      if (WMKS.BROWSER.isIOS()) {
         // css to disable user select feature on iOS. Breaks android kb launch.
         inputDiv.css({
            '-webkit-touch-callout': 'none'    /* disable callout, image save panel */
         });
      }
      return inputDiv;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * removeMobileFeature
    *
    *    Based on the feature type, see if its initialized, if so, destroy and
    *    remove its references.
    *
    *---------------------------------------------------------------------------
    */

   this.removeMobileFeature = function(type) {
      switch (type) {
         case WMKS.CONST.TOUCH.FEATURE.Trackpad:
            if (_ELEMENTS.trackpad) {
               _ELEMENTS.trackpad.destroy();
               _ELEMENTS.trackpad = null;
            }
            break;

         case WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad:
            if (_ELEMENTS.keypad) {
               _ELEMENTS.keypad.destroy();
               _ELEMENTS.keypad = null;
            }
            break;

         case WMKS.CONST.TOUCH.FEATURE.SoftKeyboard:
            if (_ELEMENTS.inputProxy) {
               if (_KEYBOARD.visible) {
                  // Input is in focus, and keyboard is up.
                  this.toggleKeyboard(false);
               }
               _ELEMENTS.inputProxy.remove();
               _ELEMENTS.inputProxy = null;
            }
            break;
         default:
            WMKS.LOGGER.error('Invalid mobile feature type: ' + type);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * destroy
    *
    *    Destroys the TouchHandler.
    *
    *    This will disconnect all (if active) and remove
    *    the widget from the associated element.
    *
    *    Consumers should call this before removing the element from the DOM.
    *
    *---------------------------------------------------------------------------
    */

   this.destroy = function() {
      this.disconnectEvents();
      this.removeMobileFeature(WMKS.CONST.TOUCH.FEATURE.SoftKeyboard);
      this.removeMobileFeature(WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad);
      this.removeMobileFeature(WMKS.CONST.TOUCH.FEATURE.Trackpad);

      // Cleanup private variables.
      _widget = null;
      _canvas = null;
      _keyboardManager = null;
      _TAP_STATE = null;
      _ELEMENTS = null;
      _repositionElements.length = 0;
      _repositionElements = null;
   };

};


/*
 *------------------------------------------------------------------------------
 *
 * WMKS.UTIL.TOUCH
 *
 *    These util functions are very specific to this touch library and hence are
 *    created separately under this file. Anything that's more generic goes
 *    into WMKS.UTIL itself.
 *
 *    NOTE: Some of these functions use touch specific target data.
 *------------------------------------------------------------------------------
 */

WMKS.UTIL.TOUCH = {
   /*
    *---------------------------------------------------------------------------
    *
    * isLandscapeOrientation
    *
    *    Returns true if the device is in landscape orientation.
    *
    *---------------------------------------------------------------------------
    */

   isLandscapeOrientation: function() {
      return (window.orientation === 90 || window.orientation === -90);
   },

   /*
    *---------------------------------------------------------------------------
    *
    * isPortraitOrientation
    *
    *    Returns true if the device is in landscape orientation.
    *
    *---------------------------------------------------------------------------
    */

   isPortraitOrientation: function() {
      return (window.orientation === 0 || window.orientation === 180);
   },


   /*
    *---------------------------------------------------------------------------
    *
    * getRelativePositionMultiplier
    *
    *    This helper function provides the width and height multipliers for an
    *    element which multiplied to its width and height and added to the
    *    current location offset, will give the desired location as defined by
    *    the position string.
    *
    *    position - Possible values are: top/bottom + left/right or null.
    *               (Default center)
    *    Ex: position = 'top' --> returns {width: 0.5, height: -1}
    *
    *---------------------------------------------------------------------------
    */
   getRelativePositionMultiplier: function(position) {
      var wMultiply = -0.5, hMultiply = -0.5;
      if (!!position) {
         // Check for left or right positioning.
         if (position.indexOf('left') !== -1) {
            wMultiply = -1;
         } else if (position.indexOf('right') !== -1) {
            wMultiply = 1;
         }
         // Check for top or bottom positioning.
         if (position.indexOf('top') !== -1) {
            hMultiply = -1;
         } else if (position.indexOf('bottom') !== -1) {
            hMultiply = 1;
         }
      }
      // Return json response containing width and height multipliers.
      return {'width': wMultiply, 'height': hMultiply};
   },


   /*
    *---------------------------------------------------------------------------
    *
    * touchEqual
    *
    *    Convenience function to compare two touches and see if they correspond
    *    to precisely the same point.
    *
    *---------------------------------------------------------------------------
    */

   touchEqual: function(thisTouch, thatTouch) {
      return (thisTouch.screenX === thatTouch.screenX &&
              thisTouch.screenY === thatTouch.screenY);
   },


   /*
    *---------------------------------------------------------------------------
    *
    * touchDistance
    *
    *    Convenience function to get the pixel distance between two touches,
    *    in screen pixels.
    *
    *---------------------------------------------------------------------------
    */

   touchDistance: function(thisTouch, thatTouch) {
      return WMKS.UTIL.getLineLength((thatTouch.screenX - thisTouch.screenX),
                                     (thatTouch.screenY - thisTouch.screenY));
   },


   /*
    *---------------------------------------------------------------------------
    *
    * touchAngleBwLines
    *
    *    Convenience function to compute the angle created b/w 2 lines. Each of
    *    the two lines are defined by two touch points.
    *
    *---------------------------------------------------------------------------
    */

   touchAngleBwLines: function(l1p1, l1p2, l2p1, l2p2) {
      var a1 = Math.atan2(l1p1.screenY - l1p2.screenY,
                          l1p1.screenX - l1p2.screenX);
      var a2 = Math.atan2(l2p1.screenY - l2p2.screenY,
                          l2p1.screenX - l2p2.screenX);
      return a1 - a2;
   },


   /*
    *---------------------------------------------------------------------------
    *
    * copyTouch
    *
    *    Since touches are Objects, they need to be deep-copied. Note that we
    *    only copy the elements that we use for our own purposes, there are
    *    probably more.
    *
    *---------------------------------------------------------------------------
    */

   copyTouch: function(aTouch) {
      var newTouch = {
         'screenX': aTouch.screenX,
         'screenY': aTouch.screenY,
         'clientX': aTouch.clientX,
         'clientY': aTouch.clientY,
         'pageX'  : aTouch.pageX,
         'pageY'  : aTouch.pageY
      };
      return newTouch;
   },


   /*
    *---------------------------------------------------------------------------
    *
    * leftmostOf
    *
    *    Returns the touch event that contains the leftmost screen coords.
    *
    *---------------------------------------------------------------------------
    */

   leftmostOf: function(thisTouch, thatTouch) {
      return (thisTouch.screenX < thatTouch.screenX)? thisTouch : thatTouch;
   }
};

/*
 * wmks/widgetProto.js
 *
 *   WebMKS widget prototype for use with jQuery-UI.
 *
 *
 * A widget for displaying a remote MKS or VNC stream over a WebSocket.
 *
 * This widget can be dropped into any page that needs to display the screen
 * of a VM. It communicates over a WebSocket connection using VMware's
 * enhanced VNC protocol, which is compatible either with a VM's configured
 * VNC WebSocket port or with a proxied Remote MKS connection.
 *
 * A few options are provided to customize the behavior of the WebMKS:
 *
 *    * fitToParent (default: true)
 *      - Scales the guest screen size to fit within the WebMKS's
 *        allocated size. It's important to note that this does
 *        not resize the guest resolution.
 *
 *    * fitGuest (default: false)
 *      - Requests that the guest change its resolution to fit within
 *        the WebMKS's allocated size.  Compared with fitToParent, this
 *        does resize the guest resolution.
 *
 *    * useNativePixels (default: false)
 *      - Enables the use of native pixel sizes on the device. On iPhone 4+ or
 *        iPad 3+, turning this on will enable "Retina mode," which provides
 *        more screen space for the guest, making everything much smaller.
 *
 *    * allowMobileKeyboardInput (default: true)
 *      - Enables the use of a native on-screen keyboard for mobile devices.
 *        When enabled, the showKeyboard() and hideKeyboard() functions
 *        will pop up a keyboard that can be used to interact with the VM.
 *
 *    * allowMobileTrackpad (default: true)
 *      - Enables the use of trackpad on mobile devices for better accuracy
 *        compared to touch inputs. The trackpad dialog will not show-up when
 *        enabled, but will allow it to toggle (hide/show) by invoking the
 *        toggleTrackpad() function.
 *
 *    * allowMobileExtendedKeypad (default: true)
 *      - Enables the use of extended keypad on mobile devices to provision
 *        special keys: function keys, arrow keys, modifier keys, page
 *        navigation keys, etc. The keypad dialog will not show-up when
 *        enabled, but will allow it to toggle (hide/show) by invoking the
 *        toggleExtendedKeypad() function.
 *
 *    * useVNCHandshake (default: true)
 *      - Enables a standard VNC handshake. This should be used when the
 *        endpoint is using standard VNC authentication. Set to false if
 *        connecting to a proxy that authenticates through authd and does
 *        not perform a VNC handshake.
 *
 *    * fixANSIEquivalentKeys (default: false)
 *      - Enables fixing of any non-ANSI US layouts keyCodes to match ANSI US layout
 *        keyCodes equivalents. It attempts to fix any keys pressed where
 *        the client's international keyboard layout has a key that is also present
 *        on the ANSI US keyboard, but is in a different location or doesn't match
 *        the SHIFT or NO SHIFT status of an ANSI US keyboard. This is useful in the
 *        case where a user needs to login to the guest OS before they can change
 *        the keyboard layout to match the client layout.
 *        Example: On some french keyboard layouts, "!" is where the "8" key is on the
 *        ANSI US layout. When enabled, the guest OS would receive SHIFT + "1" instead
 *        of "8" and display the correct "!" character.
 *
 *    * enableVorbisAudioClips (default: false)
 *      - Enables the use of the OGG-encapsulated Vorbis audio codec for providing
 *        audio data in the form of short clips suitable for browser consumption.
 *
 *    * enableOpusAudioClips (default: false)
 *      - Enables the use of the OGG-encapsulated Opus audio codec for providing
 *        audio data in the form of short clips suitable for browser consumption.
 *
 *    * enableAacAudioClips (default: false)
 *      - Enables the use of the AAC/MP4 audio codec for providing audio data in
 *        the form of short clips suitable for browser consumption.
 *
 *    * enableVVC (default: true)
 *      - Enables the use of the vmware-vvc protocol for communication over
 *        the websocket.
 *
 *    * enableMP4 (default: false)
 *      - Enables the use of the MP4 encoding for frame buffer and MP4 decoding on
 *       the browser.
 *
 *    * enableUint8Utf8 (default: false)
 *      - Enables the use of the legacy uint8utf8 protocol for communication over
 *        the websocket.
 *
 *    * retryConnectionInterval (default: -1)
 *      - The interval(millisecond) for retrying connection when the first
 *        attempt to set up a connection between web client and server fails.
 *        if value is less or equal than 0, it won't perform retry.
 *
 *    * VCDProxyHandshakeVmxPath (default: null)
 *      - VMX path (string) for use during the VNC connection process to a VCD console
 *        proxy.
 *
 *    * mapMetaToCtrlForKeys (default: [])
 *      - Enables the mapping of CMD to CTRL when the command key is presses along side
 *        one of the keys specified in this array. Keys must be specified using their
 *        integer keycode value (ie 65 for A). Useful on OSX for mapping CMD-V CMD-C to
 *        Control-V Control-C respectively.
 *
 *    * enableWindowsKey (default: false)
 *      - Enables the simulation of Windows key. A Windows key is sent when Ctrl+Win
 *        on Windows or Ctrl+CMD on Mac are pressed.
 *
 *    * enableVMWSessionClose (default: false)
 *      - Enables the communication of session close msg between client and server. When
 *        each side is about to close the websocket intentionally, a session close msg is
 *        sent to the other side.
 *
 * Handlers can also be registered to be triggered under certain circumstances:
 *
 *    * connecting
 *      - called when the websocket to the server is opened.
 *
 *    * connected
 *      - called when the websocket connection to the server has completed, the protocol
 *        has been negotiated and the first update from the server has been received, but
 *        not yet parsed, decoded or displayed.
 *
 *    * beforedisconnected
 *     - called when websocket is about to be closed by server intentionally.
 *
 *    * disconnected
 *      - called when the websocket connection to the server has been lost, either
 *        due to a normal shutdown, a dropped connection, or a failure to negotiate
 *        a websocket upgrade with a server. This handler is passed a map of information
 *        including a text reason string (if available) and a disconnection code from
 *        RFC6455.
 *
 *    * authenticationfailed
 *      - called when the VNC authentication procedure has failed. NOTE: this is only
 *        applicable if VNC style auth is used, other authentication mechanisms outside
 *        of VNC (such as authd tickets) will NOT trigger this handler if a failure
 *        occurs.
 *
 *    * error
 *      - called when an error occurs on the websocket. It is passed the DOM Event
 *        associated with the error.
 *
 *    * protocolerror
 *      - called when an error occurs during the parsing or a received VNC message, for
 *        example if the server sends an unsupported message type or an incorrectly
 *        formatted message.
 *
 *    * resolutionchanged
 *      - called when the resolution of the server's desktop has changed. It's passed
 *        the width and height of the new resolution.
 *
 *  Handlers should be registered using jQuery bind and the 'wmks' prefix:
 *
 *     .bind("wmksdisconnected", function(evt, info) {
 *           // Your handler code
 *      });
 */

WMKS.widgetProto = {};

WMKS.widgetProto.options = {
   fitToParent: false,
   fitGuest: false,
   useNativePixels: false,
   allowMobileKeyboardInput: true,
   useUnicodeKeyboardInput: false,
   useVNCHandshake: true,
   VCDProxyHandshakeVmxPath: null,
   reverseScrollY: false,
   allowMobileExtendedKeypad: true,
   allowMobileTrackpad: true,
   enableVorbisAudioClips: false,
   enableOpusAudioClips: false,
   enableAacAudioClips: false,
   enableVVC: true,
   enableMP4: false,
   enableUint8Utf8: false,
   retryConnectionInterval: -1,
   ignoredRawKeyCodes: [],
   fixANSIEquivalentKeys : false,
   mapMetaToCtrlForKeys: [],
   enableWindowsKey: false,
   keyboardLayoutId: 'en-US'
};


/************************************************************************
 * Private Functions
 ************************************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * _updatePixelRatio
 *
 *    Recalculates the pixel ratio used for displaying the canvas.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Stores new pixel ratio in this._pixelRatio.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._updatePixelRatio = function() {
   if (this.options.useNativePixels) {
      this._pixelRatio = window.devicePixelRatio || 1.0;
   } else {
      this._pixelRatio = 1.0;
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _updateMobileFeature
 *
 *    This function is a wrapper function that requests touch features to be
 *    enabled / disabled depending on the allow flag that's sent.
 *
 *    If allow flag is true, enable feature defined in type, else disable it.
 *
 *    List of supported features are:
 *
 *    MobileKeyboardInput:
 *       This function initializes the touch keyboard inputs based on the option
 *       setting. Shows/hides an offscreen <input> field to force the virtual
 *       keyboard to show up on tablet devices.
 *
 *    MobileExtendedKeypad
 *       This function initializes the Extended keypad which provides the user
 *       with special keys that are not supported on the MobileKeyboardInput.
 *
 *    MobileTrackpad:
 *       This function initializes the trackpad. The trackpad allows users to
 *       perform more precise mouse operations that are not possible with touch
 *       inputs.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Modifies DOM.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._updateMobileFeature = function(allow, type) {
   if (allow) {
      this._touchHandler.initializeMobileFeature(type);
   } else {
      this._touchHandler.removeMobileFeature(type);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _setOption
 *
 *    Changes a WMKS option.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates the given option in this.options.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._setOption = function(key, value) {
   $.Widget.prototype._setOption.apply(this, arguments);

   switch (key) {
      case 'fitToParent':
         this.rescaleOrResize(false);
         break;

      case 'fitGuest':
         this.rescaleOrResize(true);
         break;

      case 'useNativePixels':
         // Return if useNativePixels is true and browser indicates no-support.
         if (value && !WMKS.UTIL.isHighResolutionSupported()) {
            WMKS.LOGGER.warn('Browser/device does not support this feature.');
            return;
         }
         this._updatePixelRatio();
         if (this.options.fitGuest) {
            // Apply the resize for fitGuest mode.
            this.updateFitGuestSize(true);
         } else {
            this.rescaleOrResize(false);
         }
         break;

      case 'allowMobileKeyboardInput':
         this._updateMobileFeature(value, WMKS.CONST.TOUCH.FEATURE.SoftKeyboard);
         break;

      case 'allowMobileTrackpad':
         this._updateMobileFeature(value, WMKS.CONST.TOUCH.FEATURE.Trackpad);
         break;

      case 'allowMobileExtendedKeypad':
         this._updateMobileFeature(value, WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad);
         break;

      case 'reverseScrollY':
         this.options.reverseScrollY = value;
         break;

      case 'fixANSIEquivalentKeys':
         this._keyboardManager.fixANSIEquivalentKeys = value;
         break;

      case 'VCDProxyHandshakeVmxPath':
         this.setVCDProxyHandshakeVmxPath(value);
         break;

      case 'mapMetaToCtrlForKeys':
         this._keyboardManager.mapMetaToCtrlForKeys = value;

      case 'enableWindowsKey':
         this._keyboardManager.enableWindowsKey(value);
         break;

      case 'keyboardLayoutId':
         this._keyboardManager.UnicodeToVScanMap = WMKS.CONST.KB.VScanMap[value];
         break;

      case 'ignoredRawKeyCodes':
         this._keyboardManager.setIgnoredRawKeyCodes(value);
         break;
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * getCanvasPosition
 *
 *    Tracks the cursor throughout the document.
 *
 * Results:
 *    The current mouse position in the form { x, y }.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.getCanvasPosition = function (docX, docY) {
   var offset, scalePxRatio;

   if (isNaN(docX) || isNaN(docY)) {
      return { x: 0, y: 0 };
   }

   offset = this._canvas.offset();
   scalePxRatio = this._pixelRatio / this._scale;

   var x = Math.ceil((docX - offset.left) * scalePxRatio);
   var y = Math.ceil((docY - offset.top) * scalePxRatio);

   /*
    * Clamp bottom and right border.
    */
   var maxX = Math.ceil(this._canvas.width()) - 1;
   var maxY = Math.ceil(this._canvas.height()) - 1;
   x = Math.min(x, maxX);
   y = Math.min(y, maxY);

   /*
    * Clamp left and top border.
    */
   x = Math.max(x, 0);
   y = Math.max(y, 0);

   return { x: x, y: y };
};


/*
 *------------------------------------------------------------------------------
 *
 * getEventPosition
 *
 *    Gets the mouse event position within the canvas.
 *    Tracks the cursor throughout the document.
 *
 * Results:
 *    The current mouse position in the form { x, y }.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.getEventPosition = function (evt) {

   var docX, docY;

   if (evt.pageX || evt.pageY) {
      docX = evt.pageX;
      docY = evt.pageY;
   } else if (evt.clientX || evt.clientY) {
      docX = (evt.clientX +
              document.body.scrollLeft +
              document.documentElement.scrollLeft);
      docY = (evt.clientY +
              document.body.scrollTop +
              document.documentElement.scrollTop);
   } else {
      // ??
   }

   return this.getCanvasPosition(docX, docY);
};


/*
 *------------------------------------------------------------------------------
 *
 * _isCanvasMouseEvent
 *
 *    Checks if a mouse event should be consumed as if it was targeted at the
 *    canvas.
 *
 *    This is useful in the case that a user holds their mouse down and
 *    drags it outside of the canvas, either on to other elements or even
 *    outside the browser window. It will allow us to process the mouse up event
 *    and ensure we do not end up in the state where the remote thinks we are
 *    still holding the mouse button down but locally we are not.
 *
 * Results:
 *    Returns true if mouse event should be considered to be targeted at canvas
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._isCanvasMouseEvent = function(event) {
   var evt = event || window.event;
   var elm = evt.target || evt.srcElement;

   // If the mouse was pressed down on the canvas then continue to consume
   // all mouse events until mouse release.
   if (this._mouseDownBMask !== 0) {
       return true;
   } else {
      // Else, only consume mouse events for the canvas or video
      return (elm === this._canvas[0]) ||
             (this._video && (elm === this._video[0]));
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _onMouseButton
 *
 *    Mouse event handler for 'mousedown' and 'mouseup' events.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends a VMWPointerEvent message to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._onMouseButton = function(event, down) {
   if (this._vncDecoder && this._isCanvasMouseEvent(event)) {
      var evt = event || window.event;
      var pos = this.getEventPosition(evt);
      var bmask;

      /* evt.which is valid for all browsers except IE */
      if (evt.which) {
         /*
          * Firefox on Mac causes Ctrl + click to be a right click.  This kills
          * this ability to multi-select while clicking. Remap to left click in
          * this case. PR 878794 / 1085523.
          */
         if (WMKS.BROWSER.isMacOS() && WMKS.BROWSER.isGecko()
               && evt.ctrlKey && evt.button === 2) {
            WMKS.LOGGER.trace ('FF on OSX: Rewrite Ctrl+Right-click as Ctrl+Left-click.');
            bmask = 1 << 0;   // Left click.
         } else {
            bmask = 1 << evt.button;
         }
      } else {
         /* IE including 9 */
         bmask = (((evt.button & 0x1) << 0) |
                  ((evt.button & 0x2) << 1) |
                  ((evt.button & 0x4) >> 1));
      }
      return this.sendMouseButtonMessage(pos, down, bmask);
   }
};

/*
 *------------------------------------------------------------------------------
 *
 * sendMouseButtonMessage
 *
 *    Sends the mouse message for 'mousedown' / 'mouseup' at a given position.
 *
 *    Sends a VMWPointerEvent message to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.sendMouseButtonMessage = function(pos, down, bmask) {
   if (this._vncDecoder) {
      if (down) {
         this._mouseDownBMask |= bmask;
      } else {
         this._mouseDownBMask &= ~bmask;
      }
      /*
       * Send MouseMove event first, to ensure the pointer is at the
       * coordinates where the click should happen. This fixes the
       * erratic mouse behaviour when using touch devices to control
       * a Windows machine.
       */
      if (this._mousePosGuest.x !== pos.x || this._mousePosGuest.y !== pos.y) {
         // Send the mousemove message and update state.
         this.sendMouseMoveMessage(pos);
      }

      // WMKS.LOGGER.warn(pos.x + ',' + pos.y + ', down: ' + down + ', mask: ' + bmask);
      this._vncDecoder.onMouseButton(pos.x, pos.y, down, bmask);
   }
   return true;
};


/*
 *------------------------------------------------------------------------------
 *
 * _onMouseWheel
 *
 *    Mouse wheel handler. Normalizes the deltas from the event and
 *    sends it to the guest.
 *
 * Results:
 *    true, always.
 *
 * Side Effects:
 *    Sends data.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._onMouseWheel = function(event) {
   if (this._vncDecoder && this._isCanvasMouseEvent(event)) {
      var evt = event || window.event;
      var pos = this.getEventPosition(evt);
      var dx = Math.max(Math.min(event.wheelDeltaX, 1), -1);
      var dy = Math.max(Math.min(event.wheelDeltaY, 1), -1);

      if (this.options.reverseScrollY) {
         dy = dy * -1;
      }
      // Abstract the sending message part and updating state for reuse by
      // touchHandler.
      this.sendScrollMessage(pos, dx, dy);

      // Suppress default actions
      event.stopPropagation();
      event.preventDefault();
      return false;
   }

};


/*
 *------------------------------------------------------------------------------
 *
 * sendScrollMessage
 *
 *    Mouse wheel handler. Normalizes the deltas from the event and
 *    sends it to the guest.
 *
 *    Sends a VMWPointerEvent message to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.sendScrollMessage = function(pos, dx, dy) {
   if (this._vncDecoder) {
      /*
       * Send MouseMove event first, to ensure the pointer is at the
       * coordinates where the click should happen. This fixes the
       * erratic mouse behaviour when using touch devices to control
       * a Windows machine.
       */
      //
      // TODO: This is commented out for now as it seems to break browser scrolling.
      //       We may need to revisit this for iPad scrolling.
      //
      // if (this._mousePosGuest.x !== pos.x || this._mousePosGuest.y !== pos.y) {
      //   // Send the mousemove message and update state.
      //   this.sendMouseMoveMessage(pos);
      // }
      // WMKS.LOGGER.debug('scroll: ' + pos.x + ',' + pos.y + ', dx, dy: ' + dx + ',' + dy);
      this._vncDecoder.onMouseWheel(pos.x, pos.y, dx, dy);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _onMouseMove
 *
 *    Mouse event handler for 'mousemove' event.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends a VMWPointerEvent message to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._onMouseMove = function(event) {
   if (this._vncDecoder && this._isCanvasMouseEvent(event)) {
      var evt = event || window.event;
      var pos = this.getEventPosition(evt);

      this.sendMouseMoveMessage(pos);
   }
   return true;
};


/*
 *------------------------------------------------------------------------------
 *
 * sendMouseMoveMessage
 *
 *    The mouse move message is sent to server and the state change is noted.
 *
 *    Sends a VMWPointerEvent message to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.sendMouseMoveMessage = function(pos) {
   if (this._vncDecoder) {
      this._vncDecoder.onMouseMove(pos.x, pos.y);
      this._mousePosGuest = pos;

      // Inform the input text field regarding the caret position change.
      if (this._touchHandler) {
      this._touchHandler.onCaretPositionChanged(pos);
   }
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * _onBlur
 *
 *    Event handler for 'blur' event.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Releases all keys (calling cancelModifiers) and mouse buttons by checking
 *    and clearing their tracking variables (this._mouseDownBMask) and
 *    sending the appropriate VMWKeyEvent and VMWPointerEvent messages.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._onBlur = function(event) {
   if (this.connected) {
      /*
       * The user switched to a different element or window,
       * so release all keys.
       */

      // Cancel all modifiers that are held.
      this._keyboardManager.cancelModifiers();

      this._vncDecoder.onMouseButton(this._mousePosGuest.x,
                                     this._mousePosGuest.y,
                                     0,
                                     this._mouseDownBMask);
      this._mouseDownBMask = 0;
   }

   return true;
};


/*
 *------------------------------------------------------------------------------
 *
 * _onPaste
 *
 *    Clipboard paste handler.
 *
 * Results:
 *    true, always.
 *
 * Side Effects:
 *    Calls any user-defined callback with pasted text.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._onPaste = function(event) {
   var e = event.originalEvent;
   var self = this;
   if (e && e.clipboardData) {
      var items = e.clipboardData.items;
      if (items) {
         for (var i = 0; i < items.length; i++) {
            if (items[i].kind === 'string' && items[i].type === 'text/plain') {
               items[i].getAsString(function(txt) {
                  self._keyboardManager.processInputString(txt);
               });
            }
         }
      }
   }
   return true;
};


/************************************************************************
 * Public API
 ************************************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * disconnectEvents
 *
 *    Disconnects the events from the owner document.
 *
 *    This can be called by consumers of WebMKS to disconnect all the events
 *    used to interact with the guest.
 *
 *    The consumer may need to carefully manage the events (for example, if
 *    there are multiple WebMKS's in play, some hidden and some not), and can
 *    do this with connectEvents and disconnectEvents.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Disconnects the event handlers from the events in the WMKS container.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.disconnectEvents = function() {
   /*
    * Remove our own handler for the 'keypress' event and the context menu.
    */
   this.element
      .unbind('contextmenu.wmks')
      .unbind('keydown.wmks')
      .unbind('keypress.wmks')
      .unbind('keyup.wmks')
      .unbind('mousedown.wmks')
      .unbind('mousewheel.wmks');

   this.element
      .unbind('mousemove.wmks')
      .unbind('mouseup.wmks')
      .unbind('blur.wmks');

   $(window)
      .unbind('blur.wmks');

   // Disconnect event handlers from the touch handler.
   if (this._touchHandler) {
      this._touchHandler.disconnectEvents();
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * connectEvents
 *
 *    Connects the events to the owner document.
 *
 *    This can be called by consumers of WebMKS to connect all the
 *    events used to interact with the guest.
 *
 *    The consumer may need to carefully manage the events (for example,
 *    if there are multiple WebMKS's in play, some hidden and some not),
 *    and can do this with connectEvents and disconnectEvents.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Connects the event handlers to the events in the WMKS container.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.connectEvents = function() {
   var self = this;

   /*
    * Paste event only works on the document (When using Browser's Edit->Paste)
    * This feature also has drawbacks.
    * 1. It only works on Chrome browser.
    * 2. Performing paste on any other element on this document causes the
    *    event to get triggered by bubbling up. Technically the bubbling up
    *    should be enabled only if the element can handle paste in the first
    *    place (i.e., only if its textbox / textarea or an element with
    *    contenteditable set to true.)
    *
    * Due to above limitations, this is disabled. PR: 1091032
    */
   //$(this.element[0].ownerDocument)
   //   .bind('paste.wmks', function(e) { return self._onPaste(e); });

   this.element
      .bind('blur.wmks', function(e) { return self._onBlur(e); });

   /*
    * We have to register a handler for the 'keypress' event as it is the
    * only one reliably reporting the key pressed. It gives character
    * codes and not scancodes however.
    */
   this.element
      .bind('contextmenu.wmks', function(e) { return false; })
      .bind('keydown.wmks', function(e) {
         self.updateUserActivity();
         return self._keyboardManager.onKeyDown(e);
      })
      .bind('keypress.wmks', function(e) {
         return self._keyboardManager.onKeyPress(e);
      })
      .bind('keyup.wmks', function(e) {
         self.updateUserActivity();
         return self._keyboardManager.onKeyUp(e);
      });

   $(window)
      .bind('blur.wmks', function(e) { return self._onBlur(e); })
      .bind('mousemove.wmks', function(e) {
         self.updateUserActivity();
         return self._onMouseMove(e);
      })
      .bind('mousewheel.wmks', function(e) {
         self.updateUserActivity();
         return self._onMouseWheel(e);
      })
      .bind('mouseup.wmks', function(e) {
         self.updateUserActivity();
         return self._onMouseButton(e, 0);
      })
      .bind('mousedown.wmks', function(e) {
         self.updateUserActivity();
         return self._onMouseButton(e, 1);
      });

   // Initialize touch input handlers if applicable.
   if (this._touchHandler) {
   this._touchHandler.installTouchHandlers();
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * maxFitWidth
 *
 *    This calculates the maximum screen size that could fit, given the
 *    currently allocated scroll width. Consumers can use this with
 *    maxFitHeight() to request a resolution change in the guest.
 *
 *    This value takes into account the pixel ratio on the device, if
 *    useNativePixels is on.
 *
 * Results:
 *    The maximum screen width given the current width of the WebMKS.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.maxFitWidth = function() {
   return this.element[0].scrollWidth * this._pixelRatio;
};


/*
 *------------------------------------------------------------------------------
 *
 * maxFitHeight
 *
 *    This calculates the maximum screen size that could fit, given the
 *    currently allocated scroll height. Consumers can use this with
 *    maxFitWidth() to request a resolution change in the guest.
 *
 *    This value takes into account the pixel ratio on the device, if
 *    useNativePixels is on.
 *
 * Results:
 *    The maximum screen height given the current height of the WebMKS.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.maxFitHeight = function() {
   return this.element[0].scrollHeight * this._pixelRatio;
};


/*
 *------------------------------------------------------------------------------
 *
 * hideKeyboard
 *
 *    Hides the keyboard on a mobile device.
 *
 *    If allowMobileKeyboardInput is on, this command will hide the
 *    mobile keyboard if it's currently shown.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Moves browser focus away from input widget and updates state.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.hideKeyboard = function(args) {
   args = args || {};
   args.show = false;

   this.toggleKeyboard(args);
};


/*
 *------------------------------------------------------------------------------
 *
 * showKeyboard
 *
 *    Shows the keyboard on a mobile device.
 *
 *    If allowMobileKeyboardInput is on, this command will display the
 *    mobile keyboard.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Moves browser focus to input widget and updates state.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.showKeyboard = function(args) {
   args = args || {};
   args.show = true;

   this.toggleKeyboard(args);
};



/*
 *------------------------------------------------------------------------------
 *
 * toggleKeyboard
 *
 *    toggles the keyboard visible state on a mobile device.
 *
 *    If allowMobileKeyboardInput is on, this command will toggle the
 *    mobile keyboard from show to hide or vice versa.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Moves browser focus to input widget and updates state.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.toggleKeyboard = function(args) {
   if (this.options.allowMobileKeyboardInput && this._touchHandler) {
      this._touchHandler.toggleKeyboard(args);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * toggleTrackpad
 *
 *    Show/Hide the trackpad dialog on a mobile device.
 *
 *    If allowMobileTrackpad is on, this command will toggle the
 *    trackpad dialog.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.toggleTrackpad = function(options) {
   if (this.options.allowMobileTrackpad && this._touchHandler) {
      this._touchHandler.toggleTrackpad(options);
   }
};



/*
 *------------------------------------------------------------------------------
 *
 * toggleExtendedKeypad
 *
 *    Show/Hide the extended keypad dialog on a mobile device when the flag:
 *    allowMobileExtendedKeypad is set, this command will toggle the dialog.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.toggleExtendedKeypad = function(options) {
   if (this.options.allowMobileExtendedKeypad && this._touchHandler) {
      this._touchHandler.toggleExtendedKeypad(options);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * sendInputString
 *
 *    Sends a unicode string as keyboard input to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.sendInputString = function(str) {
   /*
    * Explicitly process newline as we are sending it as a string.
    * onPaste on the other hand only does not need to set this flag.
    */
   this._keyboardManager.processInputString(str, true);
};


/*
 *------------------------------------------------------------------------------
 *
 * sendKeyCodes
 *
 *    Sends a series of special key codes to the VM.
 *
 *    This takes an array of special key codes and sends keydowns for
 *    each in the order listed. It then sends keyups for each in
 *    reverse order.
 *
 *    Keys usually handled via keyPress are also supported: If a keycode
 *    is negative, it is interpreted as a Unicode value and sent to
 *    keyPress. However, these need to be the final key in a combination,
 *    as they will be released immediately after being pressed. Only
 *    letters not requiring modifiers of any sorts should be used for
 *    the latter case, as the keyboardMapper may break the sequence
 *    otherwise. Mixing keyDown and keyPress handlers is semantically
 *    incorrect in JavaScript, so this separation is unavoidable.
 *
 *    This can be used to send key combinations such as
 *    Control-Alt-Delete, as well as Ctrl-V to the guest, e.g.:
 *    [17, 18, 46]      Control-Alt-Del
 *    [17, 18, 45]      Control-Alt-Ins
 *    [17, -118]        Control-v (note the lowercase 'v')
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends keyboard data to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.sendKeyCodes = function(keyCodes) {
   var i, keyups = [];

   for (i = 0; i < keyCodes.length; i++) {
      var keyCode = keyCodes[i];

      if (keyCode > 0) {
         this._keyboardManager.sendKey(keyCode, false, false);
         /*
          * Keycode 20 is 'special' - it's the Javascript keycode for the Caps Lock
          * key. In regular usage on Mac OS the browser sends a down when the caps
          * lock light goes on and an up when it goes off. The key handling code
          * special cases this, so if we fake both a down and up here we'll just
          * flip the caps lock state right back to where we started (if this is
          * a Mac OS browser platform).
          */
         if (!(keyCode === 20) || WMKS.BROWSER.isMacOS()) {
            keyups.push(keyCode);
         }
      } else if (keyCode < 0) {
         this._keyboardManager.sendKey(0 - keyCode, true, true);
      }
   }

   for (i = keyups.length - 1; i >= 0; i--) {
      this._keyboardManager.sendKey(keyups[i], true, false);
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * rescale
 *
 *    Rescales the WebMKS to match the currently allocated size.
 *
 *    This will update the placement and size of the canvas to match
 *    the current options and allocated size (such as the pixel
 *    ratio).  This is an external interface called by consumers to
 *    force an update on size changes, internal users call
 *    rescaleOrResize(), below.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates this._scale and modifies the canvas size and position.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.rescale = function() {
   this.rescaleOrResize(true);
};


/*
 *------------------------------------------------------------------------------
 *
 * updateFitGuestSize
 *
 *    This is a special function that should be used only with fitGuest mode.
 *    This function is used the first time a user initiates a connection.
 *    The fitGuest will not work until the server sends back a CAPS message
 *    indicating that it can handle resolution change requests.
 *
 *    This is also used with toggling useNativePixels options in fitGuest mode.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.updateFitGuestSize = function(compareAgainstGuestSize) {
   var newParentW = this.element.width() * this._pixelRatio,
       newParentH = this.element.height() * this._pixelRatio;

   // Return if its not fitGuest or when the old & new width/height are same
   // when the input param compareAgainstGuestSize is set.
   if (!this.options.fitGuest
         || (compareAgainstGuestSize
            && this._guestWidth === newParentW
            && this._guestWidth === newParentH)) {
      return;
   }
   // New resolution based on pixelRatio in case of fitGuest.
   this._vncDecoder.onRequestResolution(newParentW, newParentH);
};


/*
 *------------------------------------------------------------------------------
 *
 * rescaleOrResize
 *
 *    Rescales the WebMKS to match the currently allocated size, or
 *    alternately fits the guest to match the current canvas size.
 *
 *    This will either:
 *         update the placement and size of the canvas to match the
 *         current options and allocated size (such as the pixel
 *         ratio).  This is normally called internally as the result
 *         of option changes, but can be called by consumers to force
 *         an update on size changes
 *    Or:
 *         issue a resolutionRequest command to the server to resize
 *         the guest to match the current WebMKS canvas size.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates this._scale and modifies the canvas size and position.
 *    Possibly triggers a resolutionRequest message to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.rescaleOrResize = function(tryFitGuest) {
   var newScale = 1.0, x = 0, y = 0;
   var parentWidth = this.element.width(),
       parentHeight = this.element.height();

   this._canvas.css({
      width: this._guestWidth / this._pixelRatio,
      height: this._guestHeight / this._pixelRatio
   });

   var width = this._canvas.width();
   var height = this._canvas.height();

   if (this.transform !== null &&
       !this.options.fitToParent &&
       !this.options.fitGuest) {

      // scale = 1.0, x = 0, y = 0;

   } else if (this.transform !== null &&
              this.options.fitToParent) {
      var horizScale = parentWidth / width,
      vertScale = parentHeight / height;

      x = (parentWidth - width) / 2;
      y = (parentHeight - height) / 2;
      newScale = Math.max(0.1, Math.min(horizScale, vertScale));

   } else if (this.options.fitGuest && tryFitGuest) {
      // fitGuest does not rely on this.transform. It relies on the size
      // provided by the wmks consumer. However, it does have to update the
      // screen size when using high resolution mode.
      this.updateFitGuestSize(true);
   } else if (this.transform === null) {
      WMKS.LOGGER.warn("No scaling support");
   }

   if (this.transform !== null) {
      if (newScale !== this._scale) {
         this._scale = newScale;
         this._canvas.css(this.transform, "scale(" + this._scale + ")");
      }

      if (x !== this._x || y !== this._y) {
         this._x = x;
         this._y = y;
         this._canvas.css({top: y, left: x});
      }
   }
};

/*
 *------------------------------------------------------------------------------
 *
 * setVCDProxyHandshakeVmxPath
 *
 *    Set the VMX path for use during the VNC connection process to a VCD console
 *    proxy.
 *    This option adds a VMX header to VNC handshake.
 *
 *    Note: Setting VMX path after connecting has no effect.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sets the VCDProxyHandshakeVmxPath option on the vncDecoder.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.setVCDProxyHandshakeVmxPath = function (value) {
   this.options.VCDProxyHandshakeVmxPath = value;

   if (this._vncDecoder && this._vncDecoder.options) {
      this._vncDecoder.options.VCDProxyHandshakeVmxPath = value;
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * disconnect
 *
 *    Disconnects the WebMKS.
 *
 *    Consumers should call this when they are done with the WebMKS
 *    component. Destroying the WebMKS will also result in a disconnect.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Disconnects from the server and tears down the WMKS UI.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.disconnect = function() {
   this._vncDecoder.disconnect();
   this.disconnectEvents();

   // Cancel any modifiers that were inflight.
   this._keyboardManager.cancelModifiers();
};


/*
 *------------------------------------------------------------------------------
 *
 * connect
 *
 *    Connects the WebMKS to a WebSocket URL.
 *
 *    Consumers should call this when they've placed the WebMKS and
 *    are ready to start displaying a stream from the guest.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Connects to the server and sets up the WMKS UI.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.connect = function(url) {
   this.disconnect();
   this._vncDecoder.connect(url);
   this.connectEvents();
};


/*
 *------------------------------------------------------------------------------
 *
 * destroy
 *
 *    Destroys the WebMKS.
 *
 *    This will disconnect the WebMKS connection (if active) and remove
 *    the widget from the associated element.
 *
 *    Consumers should call this before removing the element from the DOM.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Disconnects from the server and removes the WMKS class and canvas
 *    from the HTML code.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.destroy = function() {
   this.disconnect();
   this.element.removeClass("wmks");

   // Remove all event handlers and destroy the touchHandler.
   this._touchHandler.destroy();
   this._touchHandler = null;

   this._canvas.remove();
   if (this._video) {
      this._video.remove();
   }
   if (this._backCanvas) {
      this._backCanvas.remove();
   }
   if (this._blitTempCanvas) {
      this._blitTempCanvas.remove();
   }

   $.Widget.prototype.destroy.call(this);
};


/*
 *------------------------------------------------------------------------------
 *
 * requestElementReposition
 *
 *    Reposition html element so that it fits within the canvas region. This
 *    is used to reposition upon orientation change for touch devices. This
 *    function can be used once to perform the reposition immediately or can
 *    push the element to a queue that takes care of automatically performing
 *    the necessary repositioning upon orientation.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.requestElementReposition = function(element, addToQueue) {
   if(this._touchHandler){
   if (addToQueue) {
      // Add the element to a queue. Queue elements will be repositioned upon
      // orientation change.
      this._touchHandler.addToRepositionQueue(element);
      return;
   }
   // Just perform repositioning once.
   this._touchHandler.widgetRepositionOnRotation(element);
   }
};



/*
 *------------------------------------------------------------------------------
 *
 * updateUserActivity
 *
 *    Trigger an user activity event
 *
 *
 * Side Effects:
 *    Calls any user-defined callback with current time.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto.updateUserActivity = function()
{
   this._trigger("useractivity", 0, $.now());
}


/************************************************************************
 * jQuery instantiation
 ************************************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * _create
 *
 *    jQuery-UI initialisation function, called by $.widget()
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Injects the WMKS canvas into the WMKS container HTML, sets it up
 *    and connects to the server.
 *
 *------------------------------------------------------------------------------
 */

WMKS.widgetProto._create = function() {
   var self = this;

   // Initialize our state.
   this._mouseDownBMask = 0;
   this._mousePosGuest = { x: 0, y: 0 };
   this._scale = 1.0;
   this._pixelRatio = 1.0;
   this.connected = false;

   this._canvas = WMKS.UTIL.createCanvas(true)
      .prop({
         id:         'mainCanvas',
         tabindex:   1
      });
   this._backCanvas = WMKS.UTIL.createCanvas(true);
   this._blitTempCanvas = WMKS.UTIL.createCanvas(true);

   this.element
      .addClass("wmks")
      .append(this._canvas);

   if (this.options.enableMP4) {
      this._video = WMKS.UTIL.createVideo(true);
      this.element.append(this._video);
   }

   var checkProperty = function (prop) {
      return typeof self._canvas[0].style[prop] !== 'undefined' ? prop : null;
   };

   this.transform = (checkProperty('transform') ||
                     checkProperty('WebkitTransform') ||
                     checkProperty('MozTransform') ||
                     checkProperty('msTransform') ||
                     checkProperty('OTransform'));

   this._vncDecoder = new WMKS.VNCDecoder({
      useVNCHandshake: this.options.useVNCHandshake,
      VCDProxyHandshakeVmxPath: this.options.VCDProxyHandshakeVmxPath,
      useUnicodeKeyboardInput: this.options.useUnicodeKeyboardInput,
      enableVorbisAudioClips: this.options.enableVorbisAudioClips,
      enableOpusAudioClips: this.options.enableOpusAudioClips,
      enableAacAudioClips: this.options.enableAacAudioClips,
      enableVVC: this.options.enableVVC,
      enableUint8Utf8: this.options.enableUint8Utf8,
      enableVMWSessionClose: this.options.enableVMWSessionClose,
      retryConnectionInterval: this.options.retryConnectionInterval,
      canvas: this._canvas[0],
      backCanvas: this._backCanvas[0],
      blitTempCanvas: this._blitTempCanvas[0],
      mediaPlayer: (this.options.enableMP4 ? this._video[0] : null),
      onConnecting: function(vvc, vvcSession) {
         self._trigger("connecting", 0, { 'vvc': vvc, 'vvcSession': vvcSession });
      },
      onConnected: function() {
         self.connected = true;
         self._trigger("connected");

         // Clear any keyboard specific state that was held earlier.
         self._keyboardManager.clearState();
         self.rescaleOrResize(true);
      },
      onBeforeDisconnected: function(closeReason) {
         self._trigger("beforedisconnected", 0, closeReason);
      },
      onDisconnected: function(reason, code) {
         self.connected = false;
         self._trigger("disconnected", 0, {'reason': reason, 'code': code});
      },
      onAuthenticationFailed: function() {
         self._trigger("authenticationFailed");
      },
      onError: function(err) {
         self._trigger("error", 0, err);
      },
      onProtocolError: function() {
         self._trigger("protocolError");
      },
      onNewDesktopSize: function(width, height) {
         self._guestWidth = width;
         self._guestHeight = height;
         var attrJson = {
            width: width,
            height: height
         };
         var cssJson = {
            width: width / self._pixelRatio,
            height: height / self._pixelRatio
         };
         self._canvas
            .attr(attrJson)
            .css(cssJson);

         attrJson.y = height;
         self._backCanvas
            .attr(attrJson)
            .css(cssJson);

         self._blitTempCanvas
            .attr(attrJson)
            .css(cssJson);

         if (self._video) {
            self._video
               .attr(attrJson)
               .css(cssJson);
         }
         self._trigger("resolutionchanged", null, attrJson);
         self.rescaleOrResize(false);
      },
      onEncodingChanged: function(currentEncoding) {
         if (currentEncoding === "PNG") {
            if (self._video) {
               WMKS.LOGGER.info("Remove video element since we use PNG encoding.");
               self._video.remove();
               self._video = null;
            }
         }
      },
      onKeyboardLEDsChanged: function(leds) {
         self._trigger("keyboardLEDsChanged", 0, leds);
      },
      onCursorStateChanged: function(visibility) {
         if(self._touchHandler){
            self._touchHandler.setCursorVisibility(visibility);
         }
      },
      onHeartbeat: function(interval) {
         self._trigger("heartbeat", 0, interval);
      },
      onUpdateCopyPasteUI: function (noCopyUI, noPasteUI) {
         var serverSendClipboardCaps = {
            noCopyUI: noCopyUI,
            noPasteUI: noPasteUI
         }
         self._trigger("updateCopyPasteUI", 0, serverSendClipboardCaps);
      },
      onCopy: function(data) {
         if (typeof data !== 'string') {
            WMKS.LOGGER.debug('data format is not string, ignore.');
            return false;
         }
         self._trigger("copy", 0, data);
         return true;
      },
      onSetReconnectToken: function(token) {
         self._trigger("reconnecttoken", 0, token);
      },
      onAudio: function(audioInfo) {
         self._trigger("audio", 0, [audioInfo]);
      }
   });

   // Initialize the keyboard input handler.
   this._keyboardManager = new WMKS.KeyboardManager({
      vncDecoder: this._vncDecoder,
      ignoredRawKeyCodes: this.options.ignoredRawKeyCodes,
      fixANSIEquivalentKeys: this.options.fixANSIEquivalentKeys,
      mapMetaToCtrlForKeys: this.options.mapMetaToCtrlForKeys,
      enableWindowsKey: this.options.enableWindowsKey,
      keyboardLayoutId: this.options.keyboardLayoutId
   });

   // Initialize the touch handler
   this._touchHandler = new WMKS.TouchHandler({
      widgetProto: this,
      canvas: this._canvas,
      keyboardManager: this._keyboardManager,
      onToggle: function(data) {
         self._trigger("toggle", 0, data);
      }
   });

   this._updatePixelRatio();
   /*
    * Send in a request to set the new resolution size in case of fitGuest mode.
    * This avoids the need to invoke the resize after successful connection.
    */
   this.updateFitGuestSize();

   // Initialize touch features if they are enabled.
   this._updateMobileFeature(this.options.allowMobileKeyboardInput,
                             WMKS.CONST.TOUCH.FEATURE.SoftKeyboard);
   this._updateMobileFeature(this.options.allowMobileTrackpad,
                             WMKS.CONST.TOUCH.FEATURE.Trackpad);
   this._updateMobileFeature(this.options.allowMobileExtendedKeypad,
                             WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad);
};
/*
 *------------------------------------------------------------------------------
 *
 * wmks/dialogManager.js
 *
 *   The base controller of popup dialog.
 *
 *------------------------------------------------------------------------------
 */

(function() {
   'use strict';

   WMKS.dialogManager = function() {
      this.dialog = null;
      this.visible = false;
      this.lastToggleTime = 0;
      this.options = {
         name: 'DIALOG_MGR',     // Should be inherited.
         toggleCallback: function(name, toggleState) {},
        /*
         * The minimum wait time before toggle can repeat. This is useful to
         * ensure we do not toggle twice due to our usage of the close event.
         */
        minToggleTime: 50
      };
   };


   /*
    *---------------------------------------------------------------------------
    *
    * setOption
    *
    *    Set value of the specified option.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.setOption = function(key, value) {
      this.options[key] = value;

      return this;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * setOptions
    *
    *    Set values of a set of options.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.setOptions = function(options) {
      var key;

      for (key in options) {
         this.setOption(key, options[key]);
      }

      return this;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * initialize
    *
    *    Create the dialog and initialize it.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.initialize = function(options) {
      this.options = $.extend({},
         this.options,
         options);

      this.dialog = this.create();
      this.init();
   };


   /*
    *---------------------------------------------------------------------------
    *
    * destroy
    *
    *    Remove the dialog functionality completely.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.destroy = function() {
      if (!!this.dialog) {
         this.disconnect();
         this.remove();
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * create
    *
    *    Construct the dialog.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.create = function() {
      // For subclass to override.
      return null;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * init
    *
    *    Initialize the dialog, e.g. register event handlers.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.init = function() {
      // For subclass to override.
   };


   /*
    *---------------------------------------------------------------------------
    *
    * disconnect
    *
    *    Cleanup data and events.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.disconnect = function() {
      // For subclass to override.
   };


   /*
    *---------------------------------------------------------------------------
    *
    * remove
    *
    *    Destroy the dialog.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.remove = function() {
      var dialog = this.dialog;

      if (!!dialog) {
         // Destroy the dialog and remove it from DOM.
         dialog
            .dialog('destroy')
            .remove();
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * toggle
    *
    *    Show / hide the dialog. If the options comes with a launcher element
    *    then upon open / close, send an event to the launcher element.
    *
    *    Ex: For Blast trackpad:
    *          options = {toggleCallback: function(name, toggleState) {}}
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.toggle = function(options) {
      var dialog = this.dialog,
          show = !this.visible,
          isOpen;

      if (!dialog) {
         return;
      }

      if (!!options) {
         this.setOptions(options);
      }

      isOpen = dialog.dialog('isOpen');
      if (show === isOpen) {
         return;
      }

      if ($.now() - this.lastToggleTime < this.options.minToggleTime) {
         // WMKS.LOGGER.debug('Ignore toggle time.');
         return;
      }

      if (isOpen) {
         // Hide dialog.
         this.close();
      } else {
         // Show dialog.
         this.open();
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * sendUpdatedState
    *
    *    Helper function to maintain the state of the widget and last toggle
    *    time. If the toggleCallback option is set, we invoke a callback for the
    *    state change (dialog state: open / close)
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.sendUpdatedState = function(state) {
      this.visible = state;
      this.lastToggleTime = $.now();

      // Triggers the callback event to toggle the selection.
      if ($.isFunction(this.options.toggleCallback)) {
         this.options.toggleCallback.call(this, [this.options.name, state]);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * open
    *
    *    Show the dialog. Send update state.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.open = function() {
      if (!!this.dialog) {
         this.visible = !this.visible;
         this.dialog.dialog('open');
         this.sendUpdatedState(true);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * close
    *
    *    Hide the dialog. Send update state.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.close = function() {
      if (!!this.dialog) {
         this.visible = !this.visible;
         this.dialog.dialog('close');
         this.sendUpdatedState(false);
      }
   };

}());
/*
 *------------------------------------------------------------------------------
 *
 * wmks/extendedKeypad.js
 *
 *    The controller of extended keypad widget. This widget provides special
 *    keys that are generally not found on soft keyboards on touch devices.
 *
 *    Some of these keys include: Ctrl, Shift, Alt, Arrow keys, Page navigation
 *    Win, function keys, etc.
 *
 *    TODO:
 *    This version of the extended keypad will have fixed number of keys that it
 *    supports, and it will be nice to extend the functionality to make these
 *    keys configurable.
 *
 *------------------------------------------------------------------------------
 */

(function() {
   'use strict';

   // Constructor of this class.
   WMKS.extendedKeypad = function(params) {
      if (!params || !params.widget || !params.keyboardManager) {
         return null;
      }

      // Call constructor so dialogManager's params are included here.
      WMKS.dialogManager.call(this);

      this._widget = params.widget;
      this._kbManager = params.keyboardManager;
      this._parentElement = params.parentElement;

      // Store down modifier keys.
      this.manualModifiers = [];

      $.extend(this.options,
               {
                  name: 'EXTENDED_KEYPAD'
               });
      WMKS.LOGGER.warn('Key pad : ' + this.options.name);
   };

   // Inherit from dialogManager.
   WMKS.extendedKeypad.prototype = new WMKS.dialogManager();

   /*
    *---------------------------------------------------------------------------
    *
    * create
    *
    *    This function creates the control pane dialog with the modifier
    *    and extended keys.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.extendedKeypad.prototype.create = function() {
      var self = this,
          ctrlPaneHolder = $('<div id="ctrlPanePopup"></div>');
      // Load the control pane popup with control icons and their key events.
      ctrlPaneHolder.append(this.getControlPaneHtml());

      // Initialize the popup for opening later.
      /*
       * Adding the show or hide effect makes the dialog not draggable on iOS 5.1
       * device. This could be a bug in Mobile Safari itself? For now we get rid
       * of the effects. TODO: Do a check of the iOS type and add the effects
       * back based on the version.
       */
      ctrlPaneHolder.dialog({
         autoOpen: false,
         closeOnEscape: true,
         resizable: false,
         position: {my: 'center', at: 'center', of: this._parentElement},
         zIndex: 1000,
         dialogClass: 'ctrl-pane-wrapper',
         close: function(e) {
            /*
             * Clear all modifiers and the UI state so keys don't
             * stay 'down' when the ctrl pane is dismissed. PR: 983693
             * NOTE: Need to pass param as true to apply for softKB case.
             */
            self._kbManager.cancelModifiers(true);
            ctrlPaneHolder.find('.ab-modifier-key.ab-modifier-key-down')
               .removeClass('ab-modifier-key-down');

            // Hide the keypad.
            self.toggleFunctionKeys(false);
            self.sendUpdatedState(false);
            return true;
         },
         dragStop: function(e) {
            self.positionFunctionKeys();
         }
      });

      return ctrlPaneHolder;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * init
    *
    *    This function initializes the control pane dialog with the necessary
    *    event listeners.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.extendedKeypad.prototype.init = function() {
      var self = this,
          ctrlPaneHolder = this.dialog,
          keyInputHandler = function(e) {
            var key = parseInt($(this).attr('abkeycode'), 10);
            self._kbManager.handleSoftKb(key, false);
            return false;
         };


      // Initialize modifier key functionality.
      ctrlPaneHolder.find('.ab-modifier-key').on('touchstart', function(e) {
         // compute if key is pressed now.
         var isDown = $(this).hasClass('ab-modifier-key-down');
         var key = parseInt($(this).attr('abkeycode'), 10);
         if (isNaN(key)) {
            WMKS.LOGGER.debug('Got NaN as modifier key. Skipping it.');
            return false;
         }

         // Toggle highlight class for modifiers keys.
         $(this).toggleClass('ab-modifier-key-down');

         // Currently in down state, send isUp = true.
         self._kbManager.updateModifiers(key, isDown);
         return false;
      });

      // Toggle function keys also toggles the key highlighting.
      ctrlPaneHolder.find('#fnMasterKey').off('touchstart').on('touchstart', function(e) {
         self.toggleFunctionKeys();
         return false;
      });

      // Initialize extended key functionality.
      ctrlPaneHolder.find('.ab-extended-key').off('touchstart')
         .on('touchstart', keyInputHandler);

      // Provide a flip effect to the ctrl pane to show more keys.
      ctrlPaneHolder.find('.ab-flip').off('touchstart').on('touchstart', function() {
         $(this).parents('.flip-container').toggleClass('perform-flip');
         // Hide the keypad if its open.
         self.toggleFunctionKeys(false);
         return false;
      });

      // Add an id to the holder widget
      ctrlPaneHolder.parent().prop('id', 'ctrlPaneWidget');

      // Attach the function key pad to the canvas parent.
      ctrlPaneHolder.parent().parent().append(this.getFunctionKeyHtml());

      // Set up the function key events
      $('#fnKeyPad').find('.ab-extended-key').off('touchstart')
         .on('touchstart', keyInputHandler);

      // Handle orientation changes for ctrl pane & fnKeys.
      ctrlPaneHolder.parent().off('orientationchange.ctrlpane')
         .on('orientationchange.ctrlpane', function() {
            self._widget.requestElementReposition($(this));
            self.positionFunctionKeys();
         });
   };


   /*
    *---------------------------------------------------------------------------
    *
    * disconnect
    *
    *    Cleanup data and events for control pane dialog.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.dialogManager.prototype.disconnect = function() {
      var ctrlPaneHolder = this.dialog;

      // Turn off all events.
      ctrlPaneHolder.find('#fnMasterKey').off('touchstart');
      ctrlPaneHolder.find('.ab-extended-key').off('touchstart');
      ctrlPaneHolder.find('.ab-flip').off('touchstart');

      ctrlPaneHolder.parent().off('orientationchange.ctrlpane');

      $('#fnKeyPad').find('.ab-extended-key').off('touchstart');

   };


   /*
    *---------------------------------------------------------------------------
    * getControlPaneHtml
    *
    *    Function to get the extended control keys layout.
    *---------------------------------------------------------------------------
    */

   WMKS.extendedKeypad.prototype.getControlPaneHtml = function() {
      var str =
         '<div class="ctrl-pane flip-container">\
            <div class="flipper">\
               <div class="back">\
                  <div class="ctrl-key-top-row ab-extended-key baseKey" abkeycode="36"><div>'
                     + 'Home' + '</div></div>\
                  <div class="ctrl-key-top-row ab-extended-key baseKey" abkeycode="38">\
                     <img class="touch-sprite up-arrow"/></div>\
                  <div class="ctrl-key-top-row ab-extended-key baseKey" abkeycode="35"><div>'
                     + 'End' + '</div></div>\
                  <div class="ctrl-key-top-row ab-extended-key baseKey" abkeycode="27"><div>'
                     + 'Esc' + '</div></div>\
                  <div class="ctrl-key-bottom-row ab-extended-key baseKey" abkeycode="37">\
                     <img class="touch-sprite left-arrow"/></div>\
                  <div class="ctrl-key-bottom-row ab-extended-key baseKey" abkeycode="40">\
                     <img class="touch-sprite down-arrow"/></div>\
                  <div class="ctrl-key-bottom-row ab-extended-key baseKey" abkeycode="39">\
                     <img class="touch-sprite right-arrow"/></div>\
                  <div class="ctrl-key-bottom-row ab-flip baseKey">\
                     <img class="touch-sprite more-keys"/></div>\
               </div>\
               <div class="front">\
                  <div class="ctrl-key-top-row ab-modifier-key baseKey" abkeycode="16"><div>'
                     + 'Shift' + '</div></div>\
                  <div class="ctrl-key-top-row ab-extended-key baseKey" abkeycode="46"><div>'
                     + 'Del' + '</div></div>\
                  <div class="ctrl-key-top-row ab-extended-key baseKey" abkeycode="33"><div>'
                     + 'PgUp' + '</div></div>\
                  <div id="fnMasterKey" class="ctrl-key-top-row baseKey">\
                     <div style="letter-spacing: -1px">'
                     + 'F1-12' + '</div></div>\
                  <div class="ctrl-key-bottom-row ab-modifier-key baseKey" abkeycode="17"><div>'
                     + 'Ctrl' + '</div></div>\
                  <div class="ctrl-key-bottom-row ab-modifier-key baseKey" abkeycode="18"><div>'
                     + 'Alt' + '</div></div>\
                  <div class="ctrl-key-bottom-row ab-extended-key baseKey" abkeycode="34"><div>'
                     + 'PgDn' + '</div></div>\
                  <div class="ctrl-key-bottom-row ab-flip baseKey">\
                     <img class="touch-sprite more-keys"/></div>\
               </div>\
            </div>\
         </div>';
      return str;
   };

   /*
    *---------------------------------------------------------------------------
    * getFunctionKeyHtml
    *
    *    Function to get the extended functional keys layout.
    *---------------------------------------------------------------------------
    */

   WMKS.extendedKeypad.prototype.getFunctionKeyHtml = function() {
      var str =
         '<div class="fnKey-pane-wrapper hide" id="fnKeyPad">\
             <div class="ctrl-pane">\
                <div class="key-group up-position">\
                  <div class="border-key-top-left">\
                     <div class="fn-key-top-row ab-extended-key baseKey" abkeycode="112"><div>F1</div></div>\
                  </div>\
                  <div class="fn-key-top-row ab-extended-key baseKey" abkeycode="113"><div>F2</div></div>\
                  <div class="fn-key-top-row ab-extended-key baseKey" abkeycode="114"><div>F3</div></div>\
                  <div class="fn-key-top-row ab-extended-key baseKey" abkeycode="115"><div>F4</div></div>\
                  <div class="fn-key-top-row ab-extended-key baseKey" abkeycode="116"><div>F5</div></div>\
                  <div class="border-key-top-right">\
                     <div class="fn-key-top-row ab-extended-key baseKey" abkeycode="117"><div>F6</div></div>\
                  </div>\
                  <div class="border-key-bottom-left">\
                     <div class="fn-key-bottom-row ab-extended-key baseKey" abkeycode="118"><div>F7</div></div>\
                  </div>\
                  <div class="fn-key-bottom-row ab-extended-key baseKey" abkeycode="119"><div>F8</div></div>\
                  <div class="fn-key-bottom-row ab-extended-key baseKey" abkeycode="120"><div>F9</div></div>\
                  <div class="fn-key-bottom-row ab-extended-key baseKey" abkeycode="121"><div>F10</div></div>\
                  <div class="fn-key-bottom-row ab-extended-key baseKey" abkeycode="122"><div>F11</div></div>\
                  <div class="border-key-bottom-right">\
                     <div class="fn-key-bottom-row ab-extended-key baseKey" abkeycode="123"><div>F12</div></div>\
                  </div>\
               </div>\
            </div>\
            <div class="fnKey-inner-border-helper" id="fnKeyInnerBorder"></div>\
         </div>';
      return str;
   };

   /*
    *---------------------------------------------------------------------------
    *
    * toggleCtrlPane
    *
    *    Must be called after onDocumentReady. We go through all the objects in
    *    the DOM with the keyboard icon classes, and bind them to listeners which
    *    process them.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.extendedKeypad.prototype.toggleCtrlPane = function() {
      var ctrlPane = this.dialog;
      // Toggle ctrlPage widget.
      if (ctrlPane.dialog('isOpen')) {
         ctrlPane.dialog('close');
      } else {
         ctrlPane.dialog('open');
      }
   };

   /*
    *---------------------------------------------------------------------------
    *
    * toggleFunctionKeys
    *
    *    Toggle the function key pad between show / hide. Upon show, position the
    *    function keys to align with the ctrlPane. It also manages the
    *    highlighting state for the function key master.
    *    show - true indicates display function keys, false indicates otherwise.
    *
    *---------------------------------------------------------------------------
    */
   WMKS.extendedKeypad.prototype.toggleFunctionKeys = function(show) {
      var fnKeyPad = $('#fnKeyPad');
      var showFunctionKeys = (show || (typeof show === 'undefined' && !fnKeyPad.is(':visible')));

      // Toggle the function key pad.
      fnKeyPad.toggle(showFunctionKeys);

      // Show / Hide the masterKey highlighting
      $('#fnMasterKey').toggleClass('ab-modifier-key-down', showFunctionKeys);

      // Position only if it should be shown.
      this.positionFunctionKeys();
   };


   /*
    *---------------------------------------------------------------------------
    *
    * positionFunctionKeys
    *
    *    Position the function keys div relative to the ctrl pane. This function
    *    is invoked upon orientation change or when the widget is shows.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.extendedKeypad.prototype.positionFunctionKeys = function() {
      var fnKeys = $('#fnKeyPad'), crtlPaneWidget = $('#ctrlPaneWidget');
      // Place the function key if it's now visible
      if (fnKeys.is(':visible')) {
         /*
          * Align the bottom left corner of the function key pad
          * with the top left corner of the control pane widget.
          * If not enough room, flip to the other side.
          */
         fnKeys.position({
            my:        'right bottom',
            at:        'right top',
            of:        crtlPaneWidget,
            collision: 'flip'
         });

         // Adjust the inner border div size so it won't overlap with the outer border
         $('#fnKeyInnerBorder').height(fnKeys.height()-2).width(fnKeys.width()-2);

         // Check if the function key has been flipped. If so, use the down-style
         var fnKeyBottom = fnKeys.offset().top + fnKeys.height();
         var isAbove = (fnKeyBottom <= crtlPaneWidget.offset().top + crtlPaneWidget.height());
         this.adjustFunctionKeyStyle(isAbove);

         // Move the function key above the ctrl key pane when shown below, and under if shown above
         var targetZOrder;
         if (isAbove) {
            targetZOrder =  parseInt(crtlPaneWidget.css('z-index'), 10) - 1;
            // Use different color for the inner border depending on the position
            $('#fnKeyInnerBorder').css('border-color', '#d5d5d5');
         } else {
            targetZOrder =  parseInt($('#ctrlPaneWidget').css('z-index'), 10) + 1;
            $('#fnKeyInnerBorder').css('border-color', '#aaa');
         }

         fnKeys.css('z-index', targetZOrder.toString());
      }
      return true;
   };

   /*
    *---------------------------------------------------------------------------
    *
    * adjustFunctionKeyStyle
    *
    *    Helper function to adjust the functional key pad CSS based on the position
    *
    *---------------------------------------------------------------------------
    */

   WMKS.extendedKeypad.prototype.adjustFunctionKeyStyle = function (isAbove) {
      var fnKeys = $('#fnKeyPad');
      var keyGroup = fnKeys.find('.key-group');
      if (isAbove) {
         // Check if the "down" classes are being used. If so switch to "up" classes.
         if (keyGroup.hasClass('down-position')) {
            keyGroup.removeClass('down-position');
            keyGroup.addClass('up-position');

            fnKeys.removeClass('fnKey-pane-wrapper-down');
            fnKeys.addClass('fnKey-pane-wrapper');
         }
      } else {
         // Check if the "up" classes are being used. If so switch to "down" classes.
         if (keyGroup.hasClass('up-position')) {
            keyGroup.removeClass('up-position');
            keyGroup.addClass('down-position');

            fnKeys.removeClass('fnKey-pane-wrapper');
            fnKeys.addClass('fnKey-pane-wrapper-down');
         }
      }
   };

}());/*
 *------------------------------------------------------------------------------
 *
 * wmks/trackpadManager.js
 *
 *   The controller of trackpad widget.
 *
 *------------------------------------------------------------------------------
 */

(function() {
   'use strict';

   // Trackpad related constants.
   WMKS.CONST.TRACKPAD = {
      STATE: {
         idle:         0,
         tap:          1,
         tap_2finger:  2,
         drag:         3,
         scroll:       4
      }
   };

   WMKS.trackpadManager = function(widget, canvas) {

      // Call constructor so dialogManager's params are included here.
      WMKS.dialogManager.call(this);

      this._widget = widget;
      this._canvas = canvas;

      // Initialize cursor state.
      this._cursorPosGuest = {x : 0, y : 0};
      // Timer
      this._dragTimer = null;
      // Dragging is started by long tap or not.
      this._dragStartedByLongTap = false;
      // Trackpad state machine.
      this.state = WMKS.CONST.TRACKPAD.STATE.idle,
      this.history = [];
      // Override default options with options here.
      $.extend(this.options,
               {
                  name: 'TRACKPAD',
                  speedControlMinMovePx: 5,
                  // Speed control for trackpad and two finger scroll
                  accelerator:           10,
                  minSpeed:              1,
                  maxSpeed:              10
               });
      WMKS.LOGGER.warn('trackpad : ' + this.options.name);
   };

   WMKS.trackpadManager.prototype =  new WMKS.dialogManager();

   /*
    *---------------------------------------------------------------------------
    *
    * getTrackpadHtml
    *
    *    Function to get the trackpad html layout.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.getTrackpadHtml = function() {
      var str = '<div id="trackpad" class="trackpad-container">\
                   <div class="left-border"></div>\
                   <div id="trackpadSurface" class="touch-area"></div>\
                   <div class="right-border"></div>\
                   <div class="bottom-border">\
                      <div class="button-container">\
                         <div id="trackpadLeft" class="button-left"></div>\
                         <div id="trackpadRight" class="button-right"></div>\
                      </div>\
                   </div>\
               </div>';

      return str;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * create
    *
    *    This function initializes the trackpad dialog, toggle highlighting on close
    *    handler.
    *
    * HACK
    *    There is no easy way to determine close by menu click vs clicking close
    *    icon. Hence using the event.target to determine it was from clicking
    *    close icon. It will not work well when closeOnEscape is true. We don't
    *    need this on ipad, so its good.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.create = function() {
      var dialog,
          self = this;

      if (!this._widget ||
          !this._canvas) {
         WMKS.LOGGER.debug('Trackpad dialog creation has been aborted. Widget or Canvas is not ready.');
         return null;
      }

      dialog = $(this.getTrackpadHtml());
      dialog.dialog({
         autoOpen: false,
         closeOnEscape: true,
         resizable: false,
         position: {my: 'center', at: 'center', of: this._canvas},
         zIndex: 1000,
         draggable: true,
         dialogClass: 'trackpad-wrapper',
         close: function(e) {
            self.sendUpdatedState(false);
         },
         create: function(e) {
            self.layout($(this).parent());
         }
      });

      return dialog;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * init
    *
    *    This function initializes the event handlers for the trackpad.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.init = function() {
      var dialog = this.dialog,
          self = this,
          trackpad,
          left,
          right;

      if (!dialog) {
         WMKS.LOGGER.debug('Trackpad init aborted. Dialog is not created successfully.');
         return;
      }

      // Request reposition of trackpad dialog upon orientation changes.
      this._widget.requestElementReposition(dialog.parent(), true);

      // Initialize event handlers for the trackpad.
      trackpad = dialog
         .find('#trackpadSurface')
         .on('touchstart', function(e) {
            return self.trackpadTouchStart(e.originalEvent);
         })
         .on('touchmove', function(e) {
            return self.trackpadTouchMove(e.originalEvent);
         })
         .on('touchend', function(e) {
            return self.trackpadTouchEnd(e.originalEvent);
         });

      left = dialog
         .find('#trackpadLeft')
         .on('touchstart', function(e) {
            return self.trackpadClickStart(e, WMKS.CONST.CLICK.left);
         })
         .on('touchend', function(e) {
            return self.trackpadClickEnd(e, WMKS.CONST.CLICK.left);
         });

      right = dialog
         .find('#trackpadRight')
         .on('touchstart', function(e) {
            return self.trackpadClickStart(e, WMKS.CONST.CLICK.right);
         })
         .on('touchend', function(e) {
            return self.trackpadClickEnd(e, WMKS.CONST.CLICK.right);
         });
   };


   /*
    *---------------------------------------------------------------------------
    *
    * disconnect
    *
    *    This function unbinds the event handlers for the trackpad.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.disconnect = function() {
      var dialog = this.dialog,
          trackpad,
          left,
          right;

      if (!dialog) {
         return;
      }

      // Unregister event handlers for the trackpad.
      trackpad = dialog
         .find('#trackpadSurface')
         .off('touchmove')
         .off('touchstart')
         .off('touchend');

      left = dialog
         .find('#trackpadLeft')
         .off('touchstart')
         .off('touchend');

      right = dialog
         .find('#trackpadRight')
         .off('touchstart')
         .off('touchend');
   };


   /*
    *---------------------------------------------------------------------------
    *
    * layout
    *
    *    Reposition the dialog in order to center it to the canvas.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.layout = function(dialog) {
      var canvas = this._canvas,
          dialogParent,
          canvasParent;

      if (!dialog ||
          !canvas) {
         return;
      }

      dialogParent = dialog.parent();
      canvasParent = canvas.parent();

      if (dialogParent !== canvasParent) {
         // Append the dialog to the parent of the canvas,
         // so that it's able to center the dialog to the canvas.
         canvasParent.append(dialog);
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * trackpadClickStart
    *
    *    Fires when either one of the virtual trackpad's buttons are clicked. Sends
    *    a mousedown operation and adds the button highlight.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.trackpadClickStart = function(e, buttonClick) {
      if (buttonClick !== WMKS.CONST.CLICK.left &&
          buttonClick !== WMKS.CONST.CLICK.right) {
         WMKS.LOGGER.debug('assert: unknown button ' + buttonClick);
         return false;
      }

      // Highlight click button.
      $(e.target).addClass('button-highlight');

      // Sends a mousedown message.
      this._widget.sendMouseButtonMessage(this.getMousePosition(), true, buttonClick);
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * trackpadClickEnd
    *
    *    Fires when either one of the virtual trackpad's buttons are released.
    *    Sends a mouseup operation and removes the highlight on the button.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.trackpadClickEnd = function(e, buttonClick) {
      if (buttonClick !== WMKS.CONST.CLICK.left &&
          buttonClick !== WMKS.CONST.CLICK.right) {
         WMKS.LOGGER.debug('assert: unknown button ' + buttonClick);
         return false;
      }

      // Remove highlight.
      $(e.target).removeClass('button-highlight');

      // Sends a mouseup message.
      this._widget.sendMouseButtonMessage(this.getMousePosition(), false, buttonClick);
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * computeMovingDistance
    *
    *    Based on a current point and point history, gets the amount of distance
    *    the mouse should move based on this data.
    *
    * Results:
    *    A 2-tuple of (dx, dy)
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.computeMovingDistance = function(x, y) {
      var dx, dy, dist, speed;

      dx = this.getTrackpadSpeed(x,
         this.history[0].x,
         this.history[1].x,
         this.history[2].x);
      dy = this.getTrackpadSpeed(y,
         this.history[0].y,
         this.history[1].y,
         this.history[2].y);

      dist = WMKS.UTIL.getLineLength(dx, dy);

      speed = dist * this.options.accelerator;
      if (speed > this.options.maxSpeed) {
         speed = this.options.maxSpeed;
      } else if (speed < this.options.minSpeed) {
         speed = this.options.minSpeed;
      }

      return [dx * speed, dy * speed];
   };


   /*
    *---------------------------------------------------------------------------
    *
    * getTrackpadSpeed
    *
    *    Performs a linear least squares operation to get the slope of the line
    *    that best fits all four points. This slope is the current speed of the
    *    trackpad, assuming equal time between samples.
    *
    *    Returns the speed as a floating point number.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.getTrackpadSpeed = function(x0, x1, x2, x3) {
      return x0 * 0.3 + x1 * 0.1 - x2 * 0.1 - x3 * 0.3;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * trackpadTouchStart
    *
    *    Fires when a finger lands on the trackpad's touch area. Depending on the
    *    number of touch fingers, assign the initial tap state. Subsequently
    *    ontouchmove event we promote tap --> drag, tap_2finger --> scroll.
    *    If the state was tap / tap_2finger, then its the default click event.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.trackpadTouchStart = function(e) {
      var self = this;

      if (e.targetTouches.length > 2) {
         // Dis-allow a third finger touchstart to reset scroll state.
         if (this.state === WMKS.CONST.TRACKPAD.STATE.scroll) {
            WMKS.LOGGER.debug('Ignore new touchstart, currently scrolling, touch#: '
               + e.targetTouches.length);
         } else {
            WMKS.LOGGER.debug('Aborting touch, too many fingers #: ' + e.targetTouches.length);
            this.resetTrackpadState();
         }
      } else if (e.targetTouches.length === 2) {
         // Could be a scroll. Store first finger location.
         this.state = WMKS.CONST.TRACKPAD.STATE.tap_2finger;
      } else {
         this.state = WMKS.CONST.TRACKPAD.STATE.tap;

         // ontouchmove destroys this timer. The finger must stay put.
         if (this._dragTimer !== null) {
            clearTimeout(this._dragTimer);
            this._dragTimer = null;
         }

         this._dragTimer = setTimeout(function() {
            self._dragTimer = null;

            // Send the left mousedown at the location.
            self._widget.sendMouseButtonMessage(self.getMousePosition(), true, WMKS.CONST.CLICK.left);
            self._dragStartedByLongTap = true;
         }, WMKS.CONST.TOUCH.leftDragDelayMs);
      }
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * trackpadTouchMove
    *
    *    Fires when a finger moves within the trackpad's touch area. If the touch
    *    action is currently marked as a tap, promotes it into a drag or
    *    if it was a tap_2finger, promote to a scroll. If it is already one or
    *    the other, stick to that type.
    *
    *    However, if the touch moves outside the area while dragging, then set the
    *    state back to the tap and clear up history in case user comes back into
    *    the hot region.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.trackpadTouchMove = function(e) {
      var pX, pY, newLocation,
          self = $(e.target),
          widget = this._widget;

      // Reset the drag timer if there is one.
      if (this._dragTimer !== null) {
         clearTimeout(this._dragTimer);
         this._dragTimer = null;
      }

      if (this.state === WMKS.CONST.TRACKPAD.STATE.idle) {
         return false;
      }

      pX = e.targetTouches[0].pageX;
      pY = e.targetTouches[0].pageY;
      // Verify if the touchmove is outside business (hot) region of trackpad.
      if (pY < self.offset().top || pY > (self.offset().top + self.height()) ||
            pX < self.offset().left || pX > (self.offset().left + self.width())) {
         // Reset to tap start state, as the user went outside the business region.
         if (this.state === WMKS.CONST.TRACKPAD.STATE.drag) {
            // Send mouse up event if drag is started by long tap.
            if (this._dragStartedByLongTap) {
               widget.sendMouseButtonMessage(this.getMousePosition(), false, WMKS.CONST.CLICK.left);
            }
            this.state = WMKS.CONST.TRACKPAD.STATE.tap;
            this.history.length = 0;
         }
         return false;
      }

      if (this.state === WMKS.CONST.TRACKPAD.STATE.drag) {
         newLocation = this.computeNewCursorLocation(pX, pY);

         // Perform the actual move update by sending the corresponding message.
         if (!!widget._touchHandler) {
            widget._touchHandler.moveCursor(newLocation.x, newLocation.y);
         }
         widget.sendMouseMoveMessage(newLocation);
         // WMKS.LOGGER.debug('new loc: ' + newLocation.x + ',' + newLocation.y);

         // Make room for a new history entry
         this.history.shift();

         // Push a new history entry
         this.history.push({x: pX, y: pY });
      } else if (this.state === WMKS.CONST.TRACKPAD.STATE.scroll) {
         // Sends the mouse scroll message.
         this.sendScrollMessageFromTrackpad(e.targetTouches[0]);
      }

      // Detect if this is a drag or a scroll. If so, add a history entry.
      if (this.state === WMKS.CONST.TRACKPAD.STATE.tap) {
         this.state = WMKS.CONST.TRACKPAD.STATE.drag;
         // Make up history based on the current point if there isn't any yet.
         this.history.push({x: pX, y: pY}, {x: pX, y: pY}, {x: pX, y: pY});
      } else if (this.state === WMKS.CONST.TRACKPAD.STATE.tap_2finger
            && e.targetTouches.length === 2) {
         this.state = WMKS.CONST.TRACKPAD.STATE.scroll;
         // Create a history entry based on the current point if there isn't any yet.
         this.history[0] = {x: pX, y: pY};
      }
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * computeNewCursorLocation
    *
    *    This function takes the new location and computes the destination mouse
    *    cursor location. The computation is based on the acceleration to be used,
    *    making sure the new location is within the screen area.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.computeNewCursorLocation = function(pX, pY) {
      var dist,
          point = this.getMousePosition();

      // First compute the distance from the last location.
      dist = WMKS.UTIL.getLineLength(
         (pX - this.history[2].x), (pY - this.history[2].y));
      if (isNaN(dist) || dist === 0) {
         // There is no change, return the old location.
         return point;
      } else if (dist < this.options.speedControlMinMovePx) {
         // The cursor has only moved a few pixels, apply the delta directly.
         point.x += (pX - this.history[2].x);
         point.y += (pY - this.history[2].y);
      } else {
         // From now on, though, use device pixels (later, compensate for hi-DPI)
         dist = this.computeMovingDistance(pX, pY);
         point.x += Math.floor(dist[0]);
         point.y += Math.floor(dist[1]);
      }

      return this._widget.getCanvasPosition(point.x, point.y);
   };


   /*
    *---------------------------------------------------------------------------
    *
    * trackpadTouchEnd
    *
    *    Fires when a finger lifts off the trackpad's touch area. If the touch
    *    action is currently marked as a tap, sends off the mousedown and mouseup
    *    operations. Otherwise, simply resets the touch state machine.
    *
    * Results:
    *    Always false (preventing default behavior.)
    *
    * Side Effects:
    *    None.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.trackpadTouchEnd = function(e) {
      var pos;

      // Reset the drag timer if there is one.
      if (this._dragTimer !== null) {
         clearTimeout(this._dragTimer);
         this._dragTimer = null;
      }

      if (e.targetTouches.length !== 0 ||
            this.state === WMKS.CONST.TRACKPAD.STATE.idle) {
         return false;
      }

      pos = this.getMousePosition();
      if (this.state === WMKS.CONST.TRACKPAD.STATE.tap) {
         // Send mousedown & mouseup together
         this._widget.sendMouseButtonMessage(pos, true, WMKS.CONST.CLICK.left);
         this._widget.sendMouseButtonMessage(pos, false, WMKS.CONST.CLICK.left);
      } else if (this.state === WMKS.CONST.TRACKPAD.STATE.tap_2finger) {
         // Send right-click's mousedown & mouseup together.
         this._widget.sendMouseButtonMessage(pos, true, WMKS.CONST.CLICK.right);
         this._widget.sendMouseButtonMessage(pos, false, WMKS.CONST.CLICK.right);
      } else if (this.state === WMKS.CONST.TRACKPAD.STATE.drag && this._dragStartedByLongTap) {
         this._widget.sendMouseButtonMessage(pos, false, WMKS.CONST.CLICK.left);
      }

      this.resetTrackpadState();
      return false;
   };


   /*
    *---------------------------------------------------------------------------
    *
    * resetTrackpadState
    *
    *    Resets the virtual trackpad's state machine.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.resetTrackpadState = function() {
      this.state = WMKS.CONST.TRACKPAD.STATE.idle;
      this.history.length = 0;
      this._dragStartedByLongTap = false
   };


   /*
    *---------------------------------------------------------------------------
    *
    * sendScrollMessageFromTrackpad
    *
    *    This function is similar to the sendScrollEventMessage() used for scrolling
    *    outside the trackpad. The state machine is managed differently and hence
    *    the separate function.
    *
    *    Check if the scroll distance is above the minimum threshold, if so, send
    *    the scroll. And upon sending it, update the history with the last scroll
    *    sent location.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.sendScrollMessageFromTrackpad = function(curLocation) {
      // This is a two finger scroll, are we going up or down?
      var dx = 0,
          dy = 0,
          deltaX,
          deltaY,
          wheelDeltas,
          firstPos;

      deltaX = curLocation.pageX - this.history[0].x;
      deltaY = curLocation.pageY - this.history[0].y;

      if (!!this._widget._touchHandler) {
         wheelDeltas = this._widget._touchHandler._calculateMouseWheelDeltas(deltaX, deltaY);
         dx = wheelDeltas.wheelDeltaX;
         dy = wheelDeltas.wheelDeltaY;
      }

      // Only send if at least one of the deltas has a value.
      if (dx !== 0 || dy !== 0) {
         this._widget.sendScrollMessage(this.getMousePosition(), dx, dy);

         if (dx !== 0) {
            this.history[0].x = curLocation.pageX;
         }

         if (dy !== 0) {
            this.history[0].y = curLocation.pageY;
         }
      }
   };


   /*
    *---------------------------------------------------------------------------
    *
    * getMousePosition
    *
    *    Get the current position of the mouse cursor.
    *
    *---------------------------------------------------------------------------
    */

   WMKS.trackpadManager.prototype.getMousePosition = function() {
      var pos = this._widget._mousePosGuest;

      if (pos.x === 0 && pos.y === 0) {
         // If mouse position is not specified, the current cursor position is used.
         if (this._cursorPosGuest.x !== pos.x || this._cursorPosGuest.y !== pos.y) {
            // Send mousemove message and update state.
            pos = this._cursorPosGuest;
            this._widget.sendMouseMoveMessage(pos);
         }
      } else {
         // Mark current cursor position.
         this._cursorPosGuest = pos;
      }

      return pos;
   };

}());
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

/*
 *------------------------------------------------------------------------------
 *
 * wmks/vscancodeMap.js
 *
 *   map unicode to vscancode
 *
 *------------------------------------------------------------------------------
 */

WMKS.CONST.KB.VScanMap['ja-JP_106/109'] = {
   32:57,
   49:2, //1
   33:2, //!
   50:3, //2
   34:3, //"
   51:4, //3
   35:4, //#
   52:5, //4
   36:5, //$
   53:6, //5
   37:6, //%
   54:7, //6
   38:7, //&
   55:8, //7
   39:8, //'
   56:9, //8
   40:9, //(
   57:10, //9
   41:10, //)
   48:11, //0
   45:12, //-
   61:12, //=
   94:13, //^
   126:13, //~
   157:125, //
   124:61565, //
   113:16, //q
   81:16, //Q
   119:17, //w
   87:17, //W
   101:18, //e
   69:18, //E
   114:19, //r
   82:19, //R
   116:20, //t
   84:20, //T
   121:21, //y
   89:21, //Y
   117:22, //u
   85:22, //U
   105:23, //i
   73:23, //I
   111:24, //o
   79:24, //O
   112:25, //p
   80:25, //P
   64:26, //@
   96:26, //`
   91:27, //[
   123:27, //{
   93:43, //]
   125:43, //}
   97:30, //a
   65:30, //A
   115:31, //s
   83:31, //S
   100:32, //d
   68:32, //D
   102:33, //f
   70:33, //F
   103:34, //g
   71:34, //G
   104:35, //h
   72:35, //H
   106:36, //j
   74:36, //J
   107:37, //k
   75:37, //K
   108:38, //l
   76:38, //L
   59:39, //;
   43:39, //+
   58:40, //:
   42:40, //*
   122:44, //z
   90:44, //Z
   120:45, //x
   88:45, //X
   99:46, //c
   67:46, //C
   118:47, //v
   86:47, //V
   98:48, //b
   66:48, //B
   110:49, //n
   78:49, //N
   109:50, //m
   77:50, //M
   44:51, //,
   60:51, //<
   46:52, //.
   62:52, //>
   47:53, ///
   63:53, //?
   95:115, //_
   92:125, //
   13:28, //ENTER
   165:125, //
   124:125
};
WMKS.CONST.KB.VScanMap['de-DE'] = {
   32:57,
   176:41,
   192:41,
   94:41,
   180:13,
   49:2, //1
   33:2, //!
   50:3, //2
   34:3, //"
   51:4, //3
   167:4, //§
   52:5, //4
   36:5, //$
   53:6, //5
   37:6, //%
   54:7, //6
   38:7, //&
   55:8, //7
   47:8, ///
   56:9, //8
   40:9, //(
   57:10, //9
   41:10, //)
   48:11, //0
   61:11, //=
   223:12, //ß
   63:12, //?
   187:13, //´
   113:16, //q
   81:16, //Q
   119:17, //w
   87:17, //W
   101:18, //e
   69:18, //E
   114:19, //r
   82:19, //R
   116:20, //t
   84:20, //T
   122:21, //z
   90:21, //Z
   117:22, //u
   85:22, //<u
   105:23, //i
   73:23, //I
   111:24, //o
   79:24, //O
   112:25, //p
   80:25, //P
   252:26, //ü
   220:26, //Ü
   43:27, //+
   42:27, //*
   35:43, //#
   39:43, //'
   97:30, //a
   65:30, //A
   115:31, //s
   83:31, //S
   100:32, //d
   68:32, //D
   102:33, //f
   70:33, //F
   103:34, //g
   71:34, //G
   104:35, //h
   72:35, //H
   106:36, //j
   74:36, //J
   107:37, //k
   75:37, //K
   108:38, //l
   76:38, //L
   246:39, //ö
   214:39, //Ö
   228:40, //ä
   196:40, //Ä
   121:44, // y
   89:44, //Y
   120:45, //x
   88:45, //X
   99:46, //c
   67:46, //C
   118:47, //v
   86:47, //V
   98:48, //b
   66:48, //B
   110:49, //n
   78:49, //N
   109:50, //m
   77:50, //M
   44:51, //,
   59:51, //;
   46:52, //.
   58:52, //:
   45:53, //-
   95:53, //_
   60:86, //<
   62:86, //>
   13:28, //ENTER
   123:8, //{
   91:9, //[
   93:10, //]
   125:11, //}
   92:12, //\
   126:27, //~
   64:16, //@
   8364:18, //
   178:3, //2
   179:4, //3
   181:50, //
   124:86 //|
};
'use strict';

/**
 * Creates a new VVC instance.
 *
 * @classdesc The root VVC instance which owns listeners and sessions.
 * @constructor
 * @protected
 * @return {VVC}
 */
var VVC = function()
{
   /**
    * Array of open sessions.
    * @type {VVCSession[]}
    */
   this._sessions = [];

   /**
    * Array of active listeners.
    * @type {VVCListener[]}
    */
   this._listeners = [];

   /**
    * The last error to occur within this VVC instance and all objects it owns.
    * @type {VVCError}
    */
   this._lastError = null;

   return this;
};


/**
 * Major version number.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MAJOR_VER = 1;


/**
 * Minor version number.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MINOR_VER = 0;


/**
 * Version 1 caps part 1.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CAPS_V10_1 = 0;


/**
 * Version 1 caps part 2.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CAPS_V10_2 = 0;


/**
 * Used for createListener to listen on all sessions.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.ALL_SESSIONS = -1;


/**
 * The maximum number of round trip times to remember.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.RTT_HISTORY_SIZE = 30;


/**
 * Minimum length of a channel name.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MIN_CHANNEL_NAME_LEN = 1;


/**
 * Maximum length of a channel name.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MAX_CHANNEL_NAME_LEN = 255;


/**
 * Maximum length of 'initialData'.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MAX_INITIAL_DATA_LEN = 4096;


/**
 * VVC status codes.
 * @enum {Number}
 * @readonly
 */
VVC.STATUS = {
   SUCCESS:         0,
   ERROR:           1,
   OUT_OF_MEMORY:   2,
   INVALID_ARGS:    3,
   INVALID_STATE:   4,
   CLOSED:          5,
   PROTOCOL_ERROR:  6,
   TRANSPORT_ERROR: 7,
   OPEN_REJECTED:   8,
   OPEN_TIMEOUT:    9
};


/**
 * Creates a session object and wraps it around a WebSocket.
 *
 * @param  {WebSocket}   socket A valid connected WebSocket.
 * @return {?VVCSession}        The new VVCSession object.
 */
VVC.prototype.openSession = function(socket)
{
   var session;

   if (!(socket instanceof WebSocket)) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.openSession',
                         'Invalid socket, not instanceof WebSocket');
      return null;
   }

   session = new VVCSession(this);
   session.attachToWebSocket(socket);
   this._sessions.push(session);

   return session;
};


/**
 * Closes a session.
 *
 * @param  {VVCSession} session A valid open VVCSession.
 * @return {Boolean}            Returns true on success.
 */
VVC.prototype.closeSession = function(session)
{
   var index;

   if (!(session instanceof VVCSession)) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.closeSession',
                         'Invalid session, not instanceof VVCSession');
      return false;
   }

   if (session.state === VVC.SESSION_STATE.CLOSING) {
      return true;
   }

   index = this._sessions.indexOf(session);

   if (index === -1) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.closeSession',
                         'Invalid session, '
                         + 'session is not registered with this vvc instance');
      return false;
   }

   session.onSessionClose();
   this._sessions = this._sessions.splice(index, 1);
   return true;
};


/**
 * Creates a listener object.
 *
 * @param  {VVCSession|VVC.ALL_SESSIONS} session A valid open VVCSession.
 * @param  {String}                      name    Name of the new listener.
 * @return {?VVCListener}                        The new VVCListener object.
 */
VVC.prototype.createListener = function(session, name)
{
   var listener, sessionListeners, i;

   if (!(session instanceof VVCSession)) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.createListener',
                         'Invalid session: not an instanceof VVCSession');
      return null;
   }

   if (name.length < VVC.MIN_CHANNEL_NAME_LEN ||
       name.length > VVC.MAX_CHANNEL_NAME_LEN) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.createListener',
                         'Invalid name "' + name + '",'
                         + ' length must be between ' + VVC.MIN_CHANNEL_NAME_LEN
                         + ' and ' + VVC.MAX_CHANNEL_NAME_LEN
                         + ' characters.');
      return null;
   }

   sessionListeners = this._findSessionListeners(session);

   for (i = 0; i < sessionListeners.length; ++i) {
      if (sessionListeners[i].name === name) {
         this.setLastError(VVC.STATUS.INVALID_ARGS,
                            'VVC.createListener',
                            'Invalid name "' + name + '",'
                            + ' a listener on this session'
                            + ' with this name already exists.');
         return null;
      }
   }

   listener = new VVCListener(this, session, name);
   this._listeners.push(listener);
   return listener;
};


/**
 * Closes a VVC listener.
 *
 * @param  {VVCListener} listener A valid connected VVCListener.
 * @return {Boolean}              Returns true on success.
 */
VVC.prototype.closeListener = function(listener)
{
   var index = this._listeners.indexOf(listener);

   if (!(listener instanceof VVCListener)) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.closeListener',
                         'Invalid listener, not instanceof VVCListener');
      return false;
   }

   if (listener.state === VVC.LISTENER_STATE.CLOSING) {
      return true;
   }

   if (index === -1) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.closeListener',
                         'Invalid listener, '
                         + 'listener is not registered with this vvc instance');
      return false;
   }

   if (listener.onclose) {
      listener.onclose();
   }

   this._listeners = this._listeners.splice(index, 1);
   return true;
};


/**
 * Finds a registered listener with a specific name.
 *
 * @protected
 * @param  {String}       name
 * @return {?VVCListener} listener
 */
VVC.prototype._findListenerByName = function(name)
{
   var listener, i;

   for (i = 0; i < this._listeners.length; ++i) {
      listener = this._listeners[i];

      if (listener.name === name) {
         return listener;
      }
   }

   return null;
};


/**
 * Finds all listeners for a session.
 *
 * @protected
 * @param  {VVCSession}    session
 * @return {VVCListener[]} listeners
 */
VVC.prototype._findSessionListeners = function(session)
{
   var listener, i, sessionListeners = [];

   for (i = 0; i < this._listeners.length; ++i) {
      listener = this._listeners[i];

      if (listener.session === VVC.ALL_SESSIONS ||
          listener.session === session) {
         sessionListeners.push(listener);
      }
   }

   return sessionListeners;
};


/**
 * Creates a new VVC Error object.
 *
 * @classdesc A container for a VVC error status.
 *
 * @constructor
 * @private
 * @param {VVC.STATUS} status The VVC status code.
 * @param {String} where      What function the error occurred in.
 * @param {String} msg        A description of the error.
 * @return {VVCError}
 */
var VVCError = function(status, where, msg)
{
   /**
    * The VVC status code.
    * @type {VVC.STATUS}
    */
   this.status = status;

   /**
    * What function the error occurred in.
    * @type {String}
    */
   this.where = where;

   /**
    * A description of what caused the error.
    * @type {String}
    */
   this.msg = msg;

   return this;
};


/**
 * Returns the last error to occur within this VVC instance and all objects
 * that it owns.
 *
 * @return {VVCError?} error
 */
VVC.prototype.getLastError = function()
{
   return this._lastError;
};


/**
 * Sets the last error.
 * Also will output the error to console.
 *
 * @protected
 * @param {VVC.STATUS} status The VVC status code.
 * @param {String} where      What function the error occurred in.
 * @param {String} msg        A full description of the error.
 */
VVC.prototype.setLastError = function(status, where, msg)
{
   this._lastError = new VVCError(status, where, msg);

   if (status !== VVC.STATUS.SUCCESS) {
      console.error(where + ': ' + msg);
   }
};
'use strict';

/**
 * Use {@link VVCSession#openChannel} to create a channel.
 *
 * @classdesc  Represents a VVC channel which exposes a websocket-like API.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket}
 *
 * @constructor
 * @protected
 * @param {VVCSession} session  Session this channel belongs to.
 * @param {String}     name     Channel name.
 * @param {Number}     priority Channel priority.
 * @param {Number}     flags    Channel flags.
 * @param {Number}     timeout  Channel connect timeout.
 * @return {VVCChannel}
 */
var VVCChannel = function(session, id, name, priority, flags, timeout)
{
   /**
    * Channel id.
    * @type {Number}
    */
   this.id = id;

   /**
    * Channel name.
    * @type {String}
    */
   this.name = name;

   /**
    * Channel priority.
    * @type {Number}
    */
   this.priority = priority || 0;

   /**
    * Channel flags.
    * @type {Number}
    */
   this.flags = flags || 0;

   /**
    * Channel timeout.
    * @type {Number}
    */
   this.timeout = timeout || 0;

   /**
    * The protocol used by the channel, currently fixed to binary.
    * @type {String}
    */
   this.protocol = 'binary';

   /**
    * The current state of the channel.
    * @type {VVC.CHANNEL_STATE}
    */
   this.state = VVC.CHANNEL_STATE.INIT;

   /**
    * Callback for when the channel opens.
    * @type {VVCChannel~onopen?}
    */
   this.onopen = null;

   /**
    * Callback for when the channel closes.
    * @type {VVCChannel~onclose?}
    */
   this.onclose = null;

   /**
    * Callback for when there is an error on the channel.
    * @type {VVCChannel~onerror?}
    */
   this.onerror = null;

   /**
    * Callback for when a message is received on the channel.
    * @type {VVCChannel~onmessage?}
    */
   this.onmessage = null;

   /**
    * The session this channel belongs to.
    * @protected
    * @type {VVCSession}
    */
   this._session     = session;

   /**
    * The VVC instance this channel belongs to.
    * @protected
    * @type {VVC}
    */
   this._vvcInstance = session.vvcInstance;

   return this;
};


/**
 * VVCChannel state
 * @enum {Number}
 * @readonly
 */
VVC.CHANNEL_STATE = {
   INIT:         0,
   OPEN_FAILED:  1,
   OPEN:         2,
   CLOSING:      3,
   PEER_CLOSING: 4,
   PEER_CLOSED:  5,
   CLOSED:       6
};


/**
 * Sends data over a channel
 *
 * @param  {Uint8Array|ArrayBuffer} data    Data to send
 * @return {Boolean}                success True on success
 */
VVCChannel.prototype.send = function(data)
{
   return this._session.send(this, data);
};


/**
 * Closes this channel
 *
 * @return {Boolean} success True on success
 */
VVCChannel.prototype.close = function()
{
   return this._session.closeChannel(this);
};


/**
 * Called when the channel opens
 *
 * @callback VVCChannel~onopen
 * @param {Event} event
 */


/**
 * Called when the channel closes
 *
 * @callback VVCChannel~onclose
 * @param {CloseEvent} event
 */


/**
 * Called when there is an error with the channel
 *
 * @callback VVCChannel~onerror
 * @param {Event} event
 */


/**
 * Called when a message is received from the channel
 *
 * @callback VVCChannel~onmessage
 * @param {MessageEvent} event
 */
'use strict';

/**
 * This is only to be created by a VVCSession.
 *
 * @classdesc The control channel created and owned by a VVCSession.
 *
 * @constructor
 * @protected
 * @extends {VVCChannel}
 * @param {VVCChannel} channel The VVCChannel to wrap
 * @return {VVCControlChannel}
 */
var VVCControlChannel = function(channel)
{
   /**
    * The current rtt ping send time.
    * @type {Number}
    */
   this._rttSendTimeMS = 0;

   // The control channel's initial state is open!
   this.state = VVC.CHANNEL_STATE.OPEN;

   return $.extend(channel, this);
};


/**
 * Size of CTRL header.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CTRL_HEADER_SIZE = 4;


/**
 * Control channel id.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CONTROL_CHANNEL_ID = 0;


/**
 * Control channel name.
 *
 * @type {String}
 * @readonly
 * @default
 */
VVC.CONTROL_CHANNEL_NAME = 'vvcctrl';


/**
 * Control channel message opcodes.
 * @enum {Number}
 * @readonly
 */
VVC.CTRL_OP = {
   /** Receive acknowledgement, used for bandwidth estimation */
   RECV_ACK:             0x01,

   /** Initiate VVC, first op sent from client to server */
   INIT:                 0x02,

   /** Initiate VVC acknowledgement */
   INIT_ACK:             0x03,

   /** Open channel */
   OPEN_CHAN:            0x04,

   /** Open channel acknowledgement */
   OPEN_CHAN_ACK:        0x05,

   /** Open channel cancel */
   OPEN_CHAN_CANCEL:     0x06,

   /** Close channel */
   CLOSE_CHAN:           0x07,

   /** Close channel acknowledgement */
   CLOSE_CHAN_ACK:       0x08,

   /** Round trip time ping */
   RTT:                  0x09,

   /** Round trip time pong */
   RTT_ACK:              0x0A
};


/**
 * Control channel message header flags.
 * @enum {Number}
 * @readonly
 */
VVC.CTRL_FLAG = {
   /** The control packet has data */
   ODAT:               0x80
};


/**
 * Open channel acknowledgement status
 * @enum {Number}
 * @readonly
 */
VVC.OPEN_CHAN_STATUS = {
   SUCCESS: 0,
   REJECT:  1,
   TIMEOUT: 2
};


/**
 * Close channel reason
 * @enum {Number}
 * @readonly
 */
VVC.CLOSE_CHAN_REASON = {
   NORMAL: 0,
   ERROR:  1
};


/**
 * Close channel acknowledgement status
 * @enum {Number}
 * @readonly
 */
VVC.CLOSE_CHAN_STATUS = {
   SUCCESS: 0,
   ERROR:   1
};


/**
 * Expected size of data for each control message
 * @type {Number[]}
 * @readonly
 */
VVC.CTRL_OP.SIZE = [];
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.RECV_ACK]         = 0;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.INIT]             = 12;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.INIT_ACK]         = 12;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.OPEN_CHAN]        = 20;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.OPEN_CHAN_ACK]    = 12;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.OPEN_CHAN_CANCEL] = 0;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.CLOSE_CHAN]       = 8;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.CLOSE_CHAN_ACK]   = 8;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.RTT]              = 0;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.RTT_ACK]          = 0;


/**
 * Text name of each CTRL_OP for debugging and error messages
 * @type {String[]}
 * @readonly
 */
VVC.CTRL_OP.NAME = [];
VVC.CTRL_OP.NAME[VVC.CTRL_OP.RECV_ACK]         = 'VVC.CTRL_OP.RECV_ACK';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.INIT]             = 'VVC.CTRL_OP.INIT';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.INIT_ACK]         = 'VVC.CTRL_OP.INIT_ACK';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.OPEN_CHAN]        = 'VVC.CTRL_OP.OPEN_CHAN';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.OPEN_CHAN_ACK]    = 'VVC.CTRL_OP.OPEN_CHAN_ACK';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.OPEN_CHAN_CANCEL] = 'VVC.CTRL_OP.OPEN_CHAN_CANCEL';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.CLOSE_CHAN]       = 'VVC.CTRL_OP.CLOSE_CHAN';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.CLOSE_CHAN_ACK]   = 'VVC.CTRL_OP.CLOSE_CHAN_ACK';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.RTT]              = 'VVC.CTRL_OP.RTT';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.RTT_ACK]          = 'VVC.CTRL_OP.RTT_ACK';


/**
 * Sends a VVC.CTRL_OP.INIT message.
 * Requests to initiate the connection.
 *
 * @protected
 * @param  {VVC.CTRL_OP} [code] The CTRL_OP code to use so we can reuse this
 *                              function as both the INIT and INIT_ACK messages
 *                              have identical data.
 * @return {Boolean}            Returns true on successful send
 */
VVCControlChannel.prototype.sendInit = function(code)
{
   var packet;

   if (code === undefined) {
      code = VVC.CTRL_OP.INIT;
   }

   if (code !== VVC.CTRL_OP.INIT && code !== VVC.CTRL_OP.INIT_ACK) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                      'VVCControlChannel.sendInit',
                                      'Invalid code, '
                                      + ' expected INIT or INIT_ACK');
      return false;
   }

   packet = this._createControlPacket(code);
   packet.writeUint16(VVC.MAJOR_VER);
   packet.writeUint16(VVC.MINOR_VER);
   packet.writeUint32(VVC.CAPS_V10_1);
   packet.writeUint32(VVC.CAPS_V10_2);
   return this._sendControlPacket(packet);
};


/**
 * Sends a VVC.CTRL_OP.RTT message.
 * Used as a ping/pong system for measuring round trip times.
 *
 * @protected
 * @return {Boolean} Returns true on successful send
 */
VVCControlChannel.prototype.sendRtt = function()
{
   this._rttSendTimeMS = Date.now();
   return this._sendControlPacket(this._createControlPacket(VVC.CTRL_OP.RTT));
};


/**
 * Sends a VVC.CTRL_OP.RECV_ACK message.
 * Acknowledges receiving of chunk data.
 * Will send multiple messages if bytes is above 0xffff.
 *
 * @protected
 * @param  {Number}  bytes The number of bytes to acknowledge
 * @return {Boolean}       Returns true on successful send
 */
VVCControlChannel.prototype.sendRecvAck = function(bytes)
{
   var packet;

   while (bytes > 0xffff) {
      packet = this._createControlPacket(VVC.CTRL_OP.RECV_ACK, 0, 0xffff - 1);
      this._sendControlPacket(packet);
      bytes -= 0xffff;
   }

   if (bytes > 0) {
      packet = this._createControlPacket(VVC.CTRL_OP.RECV_ACK, 0, bytes - 1);
      this._sendControlPacket(packet);
   }

   return true;
};


/**
 * Sends a VVC.CTRL_OP.OPEN_CHAN message.
 *
 * Requests to open a new channel.
 *
 * @protected
 * @param  {VVCChannel} channel       The channel to open
 * @param  {Uint8Array} [initialData] Initial data to send with the open request
 * @return {Boolean}                  Returns true on successful send
 */
VVCControlChannel.prototype.sendOpenChannel = function(channel, initialData)
{
   var packet, initialDataLen = 0;

   if (!(channel instanceof VVCChannel)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                      'VVCControlChannel.sendOpenChannel',
                                      'Invalid channel, '
                                      + ' expected instanceof VVCChannel');
      return false;
   }

   initialDataLen = 0;

   if (!!initialData) {
      initialDataLen = initialData.length;
   }

   packet = this._createControlPacket(VVC.CTRL_OP.OPEN_CHAN);
   packet.writeUint32(channel.id);
   packet.writeUint32(channel.priority);
   packet.writeUint32(channel.flags);
   packet.writeUint32(channel.timeout);
   packet.writeUint16(0);  // Reserved
   packet.writeUint8(0);   // Reserved2
   packet.writeUint8(channel.name.length);
   packet.writeUint32(initialDataLen);
   packet.writeStringASCII(channel.name);

   if (initialDataLen) {
      packet.writeArray(initialData);
   }

   return this._sendControlPacket(packet);
};


/**
 * Sends a VVC.CTRL_OP.OPEN_CHAN_ACK message.
 *
 * Responds to requests to open a new channel.
 *
 * @protected
 * @param  {VVCChannel}           channel       The channel to open
 * @param  {VVC.OPEN_CHAN_STATUS} status        The acknowledgement status
 * @param  {Uint8Array}           [initialData] Initial data to send with ack
 * @return {Boolean}                            Returns true on successful send
 */
VVCControlChannel.prototype.sendOpenChannelAck = function(channel,
                                                          status,
                                                          initialData)
{
   var packet = this._createControlPacket(VVC.CTRL_OP.OPEN_CHAN_ACK);
   packet.writeUint32(channel.id);
   packet.writeUint32(status);

   if (!!initialData) {
      packet.writeUint32(initialData.length);
      packet.writeArray(initialData);
   } else {
      packet.writeUint32(0);
   }

   return this._sendControlPacket(packet);
};


/**
 * Sends a VVC.CTRL_OP.CLOSE_CHAN message.
 *
 * Requests to close a channel.
 *
 * @protected
 * @param  {VVCChannel}            channel The channel to close
 * @param  {VVC.CLOSE_CHAN_REASON} reason  The reason for closing
 * @return {Boolean}                       Returns true on successful send
 */
VVCControlChannel.prototype.sendCloseChannel = function(channel, reason)
{
   var packet = this._createControlPacket(VVC.CTRL_OP.CLOSE_CHAN);
   packet.writeUint32(channel.id);
   packet.writeUint32(reason);
   return this._sendControlPacket(packet);
};


/**
 * Sends a VVC.CTRL_OP.CLOSE_CHAN message.
 *
 * Responds to a close channel request.
 *
 * @protected
 * @param  {VVCChannel}            channel The channel to close
 * @param  {VVC.CLOSE_CHAN_STATUS} status  The close acknowledgement status
 * @return {Boolean}                       Returns true on successful send
 */
VVCControlChannel.prototype.sendCloseChannelAck = function(channel, status)
{
   var packet = this._createControlPacket(VVC.CTRL_OP.CLOSE_CHAN_ACK);
   packet.writeUint32(channel.id);
   packet.writeUint32(status);
   return this._sendControlPacket(packet);
};


/**
 * Called when the control channel receives a message.
 * Reads the message header and forwards it to the correct handler function.
 * Implements VVCChannel~onmessage.
 *
 * @protected
 * @param {MessageEvent} evt
 */
VVCControlChannel.prototype.onmessage = function(evt)
{
   var packet = WMKS.Packet.createFromBuffer(evt.data);
   var opcode = packet.readUint8();
   var flags  = packet.readUint8();
   var param  = packet.readUint16();

   switch (opcode) {
      case VVC.CTRL_OP.INIT:
      case VVC.CTRL_OP.INIT_ACK:
         this._onInit(packet, opcode);
         break;
      case VVC.CTRL_OP.RTT:
         this._onRtt(packet);
         break;
      case VVC.CTRL_OP.RTT_ACK:
         this._onRttAck(packet);
         break;
      case VVC.CTRL_OP.OPEN_CHAN:
         this._onOpenChannel(packet);
         break;
      case VVC.CTRL_OP.OPEN_CHAN_ACK:
         this._onOpenChannelAck(packet);
         break;
      case VVC.CTRL_OP.CLOSE_CHAN:
         this._onCloseChannel(packet);
         break;
      case VVC.CTRL_OP.CLOSE_CHAN_ACK:
         this._onCloseChannelAck(packet);
         break;
      case VVC.CTRL_OP.RECV_ACK:
         this._onRecvAck(packet, param);
         break;
      default:
         this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                       'VVCControlChannel.onmessage',
                                       'Unknown control opcode: ' + opcode);
         return false;
   }

   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.RTT message.
 * Immediately replies with a VVC.CTRL_OP.RTT_ACK.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onRtt = function(packet)
{
   var ack;

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.RTT, packet)) {
      return false;
   }

   ack = this._createControlPacket(VVC.CTRL_OP.RTT_ACK);
   return this._sendControlPacket(ack);
};


/**
 * Called when we receive a VVC.CTRL_OP.RTT_ACK message.
 * Records the time taken for the RTT_ACK to arrive since we sent the request.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onRttAck = function(packet)
{
   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.RTT_ACK, packet)) {
      return false;
   }

   this._session.addRttTime(Date.now() - this._rttSendTimeMS);
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.RECV_ACK message.
 * Does nothing.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onRecvAck = function(packet, bytesReceived)
{
   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.RECV_ACK, packet)) {
      return false;
   }

   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.INIT or VVC.CTRL_OP.INIT_ACK message.
 * If receiving an INIT then responds with an INIT_ACK message.
 * Will trigger the listener.onconnect callback.
 *
 * @private
 * @param {VVC.CTRL_OP} opcode  The opcode, expected to be INIT or INIT_ACK
 * @param {Packet}      packet  The INIT / INIT_ACK packet
 * @return {Boolean}    success Returns true on success
 */
VVCControlChannel.prototype._onInit = function(packet, opcode)
{
   var major, minor, caps1, caps2;

   if (!this._checkErrorMinimumSize(opcode, packet)) {
      return false;
   }

   if (!this._checkErrorSessionState(opcode, VVC.SESSION_STATE.INIT)) {
      return false;
   }

   major = packet.readUint16();
   minor = packet.readUint16();
   caps1 = packet.readUint32();
   caps2 = packet.readUint32();

   if (opcode === VVC.CTRL_OP.INIT) {
      this.sendInit(VVC.CTRL_OP.INIT_ACK);
   }

   this._session.onConnect();
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.OPEN_CHAN message.
 * Will trigger the listener.onpeeropen callback.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onOpenChannel = function(packet)
{
   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.OPEN_CHAN, packet)) {
      return false;
   }

   var name, initialData, channel;
   var id             = packet.readUint32();
   var priority       = packet.readUint32();
   var flags          = packet.readUint32();
   var timeout        = packet.readUint32();
   var reserved       = packet.readUint16();
   var reserved2      = packet.readUint8();
   var nameLen        = packet.readUint8();
   var initialDataLen = packet.readUint32();

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.OPEN_CHAN, packet,
                                    nameLen + initialDataLen)) {
      return false;
   }

   name         = packet.readStringASCII(nameLen);
   initialData  = packet.readArray(initialDataLen);

   channel      = this._session.createChannel(id,
                                              name,
                                              priority,
                                              flags,
                                              timeout);
   channel.initialData = initialData;
   this._session.onPeerOpen(channel);
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.OPEN_CHAN_ACK message.
 * Will trigger the channel.onopen callback.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onOpenChannelAck = function(packet)
{
   var id, status, initialDataLen, initialData;

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.OPEN_CHAN_ACK, packet)) {
      return false;
   }

   id             = packet.readUint32();
   status         = packet.readUint32();
   initialDataLen = packet.readUint32();

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.OPEN_CHAN_ACK, packet,
                                    initialDataLen)) {
      return false;
   }

   initialData = packet.readArray(initialDataLen);

   if (!this._checkErrorValidChannel(VVC.CTRL_OP.OPEN_CHAN_ACK, id,
                                     VVC.CHANNEL_STATE.INIT)) {
      return false;
   }

   this._session.onChannelOpen(this._session.getChannel(id),
                               status,
                               initialData);
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.CLOSE_CHAN message.
 * Will trigger the channel.onclose callback.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onCloseChannel = function(packet)
{
   var id, reason;

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.CLOSE_CHAN, packet)) {
      return false;
   }

   id     = packet.readUint32();
   reason = packet.readUint32();

   if (!this._checkErrorValidChannel(VVC.CTRL_OP.CLOSE_CHAN, id)) {
      return false;
   }

   this._session.onChannelClose(this._session.getChannel(id), reason);
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.CLOSE_CHAN_ACK message.
 * Will trigger the channel.onclose callback.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onCloseChannelAck = function(packet)
{
   var id, status;

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.CLOSE_CHAN_ACK, packet)) {
      return false;
   }

   id     = packet.readUint32();
   status = packet.readUint32();

   if (!this._checkErrorValidChannel(VVC.CTRL_OP.CLOSE_CHAN_ACK, id,
                                     VVC.CHANNEL_STATE.CLOSING)) {
      return false;
   }

   this._session.onChannelClose(this._session.getChannel(id),
                                status);

   return true;
};


/**
 * Checks the size of the incoming packet is correct.
 * Triggers a session error if the size is unexpected.
 *
 * @private
 * @param  {VVC.CTRL_OP} opcode      The message opcode
 * @param  {Packet}      packet      The packet to check
 * @param  {Number}      [extraSize] Extra size needed
 * @return {Boolean}     success     Returns true on correct size
 */
VVCControlChannel.prototype._checkErrorMinimumSize = function(opcode,
                                                              packet,
                                                              extraSize)
{
   var packetSize = packet.length - 4;
   var expectSize = VVC.CTRL_OP.SIZE[opcode];
   extraSize      = extraSize || 0;

   if (packetSize < expectSize + extraSize) {
      var name = VVC.CTRL_OP.NAME[opcode];

      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorMinimumSize',
                                    'Received invalid ' + name + ' message, '
                                     + 'message too small, received '
                                     + packetSize + ' bytes, expected '
                                     + expectSize + ' + ' + extraSize);
      return false;
   }

   return true;
};


/**
 * Checks the session state.
 * Triggers a session error if the state is invalid.
 *
 * @private
 * @param  {VVC.CTRL_OP}        opcode  The message opcode
 * @param  {VVC.SESSSION_STATE} state   The state to check
 * @return {Boolean}            success Returns true on valid session state
 */
VVCControlChannel.prototype._checkErrorSessionState = function(opcode,
                                                               state)
{
   var opname = VVC.CTRL_OP.NAME[opcode];

   if (this._session.state !== state) {
      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorSessionState',
                                    'Received invalid ' + opname + ' message, '
                                     + 'invaild session state, '
                                     + 'found ' + this._session.state
                                     + ' expected ' + state);
      return false;
   }

   return true;
};


/**
 * Checks if the channel id is valid.
 * Ensures it is not the control channel.
 * Ensures channel exists.
 * Optionally checks the channel state;
 *
 * @private
 * @param  {VVC.CTRL_OP}       opcode  The message opcode
 * @param  {Number}            id      The channel id to check
 * @param  {VVC.CHANNEL_STATE} [state] The state the channel must be in
 * @return {Boolean}           success Returns true on valid channel id.
 */
VVCControlChannel.prototype._checkErrorValidChannel = function(opcode,
                                                               id,
                                                               state)
{
   var opname  = VVC.CTRL_OP.NAME[opcode];
   var channel = this._session.getChannel(id);

   if (id === VVC.CONTROL_CHANNEL_ID) {
      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorValidChannel',
                                    'Received invalid ' + opname + ' message, '
                                     + 'unexpected use of control channel id');
      return false;
   }

   if (!channel) {
      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorValidChannel',
                                    'Received invalid ' + opname + ' message, '
                                     + 'unknown channel ' + id);
      return false;
   }

   if (state !== undefined && channel.state !== state) {
      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorValidChannel',
                                    'Received invalid ' + opname + ' message, '
                                     + 'unexpected channel state, '
                                     + 'found ' + channel.state + ' '
                                     + ' expected ' + state);
      return false;
   }

   return true;
};


/**
 * Creates a control packet.
 * Returns a new instance of Packet and inserts the control message header.
 *
 * @private
 * @param  {VVC.CTRL_OP} code
 * @param  {Number}      [flags]
 * @param  {Number}      [param]
 * @return {Packet}
 */
VVCControlChannel.prototype._createControlPacket = function(code, flags, param)
{
   var packet = WMKS.Packet.createNewPacket();

   param = param || 0;
   flags = flags || 0;

   packet.control = {
      code:  code,
      flags: flags,
      param: param
   };

   packet.writeUint8(code);
   packet.writeUint8(flags);
   packet.writeUint16(param);

   return packet;
};


/**
 * Send a control packet.
 * Automatically updates the length and data flag if required and then sends the
 * control packet using the normal VVCChannel.send.
 *
 * @private
 * @param  {Packet}  packet The packet to send
 * @return {Boolean}        Returns true on successful send
 */

VVCControlChannel.prototype._sendControlPacket = function(packet)
{
   if (packet.length > VVC.CTRL_HEADER_SIZE) {
      packet.control.flags |= VVC.CTRL_FLAG.ODAT;
      packet.control.param = packet.length - VVC.CTRL_HEADER_SIZE;
   }

   packet.setUint8(1, packet.control.flags);
   packet.setUint16(2, packet.control.param);

   return this.send(packet.getData());
};
'use strict';

/**
 * Use {@link VVC#createListener} to create a listener.
 *
 * @classdesc A VVC listener provides callbacks to notifiy the user about events
 *            on one or more VVC sessions.
 *
 * @constructor
 * @protected
 * @param  {VVC}                         vvcInstance The owner VVC instance
 * @param  {VVCSession|VVC.ALL_SESSIONS} session     Session to listen to
 * @param  {String}                      name        Name of the new listener
 * @return {VVCListener}
 */

var VVCListener = function(vvcInstance, session, name)
{
   /**
    * Listener name.
    * @type {String}
    */
   this.name    = name;

   /**
    * Session to listen to.
    * @type {VVCSession|VVC.ALL_SESSIONS}
    */
   this.session = session;

   /**
    * Listener state.
    * @type {VVC.LISTENER_STATE}
    */
   this.state   = VVC.LISTENER_STATE.ACTIVE;

   /**
    * Called when the VVC connection has been established on a session that is
    * being listened to.
    * @type {VVCListener~onconnect?}
    */
   this.onconnect = null;

   /**
    * Called when the remote peer opens a channel on a session that is being
    * listened to.
    * @type {VVCListener~onpeeropen?}
    */
   this.onpeeropen = null;

   /**
    * Called when the listener closes.
    * @type {VVCListener~onclose?}
    */
   this.onclose = null;

   /**
    * The VVC instance this listener belongs to.
    * @type {VVC}
    */
   this._vvcInstance = vvcInstance;

   return this;
};


/**
 * VVCListener state.
 * @enum {Number}
 * @readonly
 */
VVC.LISTENER_STATE = {
   INIT:    0,
   ACTIVE:  1,
   CLOSING: 2
};


/**
 * Closes the listener.
 *
 * @return {Boolean} Success
 */
VVCListener.prototype.close = function()
{
   return this._vvcInstance.closeListener(this);
};


/**
 * Matches the listeners name to the given name.
 * Listener name can have wildcards.
 *
 * @param  {String}  name    The given name to match against.
 * @return {Boolean} matches Returns true if the name matches.
 */
VVCListener.prototype.matchName = function(name)
{
   var wildcard = this.name.indexOf('*');

   if (wildcard !== -1) {
      return this.name.substr(0, wildcard) === name.substring(0, wildcard);
   }

   return this.name === name;
};


/**
 * Called when the VVC connection has been established on a session
 *
 * @callback VVCListener~onconnect
 * @param {VVCSession} session The session which has connected
 */


/**
 * Called when the remote peer opens a channel on a session
 *
 * @callback VVCListener~onpeeropen
 * @param {VVCSession} session The session on which the channel was created
 * @param {VVCChannel} channel The new channel which is being created
 */


/**
 * Called when the listener is closed
 *
 * @callback VVCListener~onclose
 */
'use strict';

/**
 * Use {@link VVC#openSession} to create a session.
 *
 * @classdesc A VVC session represents a physical connection to a remote server
 *
 * @constructor
 * @protected
 * @param {VVC}    vvcInstance The owner VVC instance
 * @param {Object} options     Optional settings
 * @return {VVCSession}
 */
var VVCSession = function(vvcInstance, options)
{
   var server = false;

   if (options) {
      if ('server' in options) {
         server = options.server;
      }
   }

   /**
    * The current state of the session.
    * @type {VVC.SESSION_STATE}
    */
   this.state = VVC.SESSION_STATE.INIT;

   /**
    * Callback for when an error occurs on the session.
    * @type {VVCSession~onerror?}
    */
   this.onerror = null;

   /**
    * Callback for when the transport closes.
    * @type {VVCSession~ontransportclose?}
    */
   this.ontransportclose = null;

   /**
    * Callback for when there is an error on the transport.
    * @type {VVCSession~ontransporterror?}
    */
   this.ontransporterror = null;

   /**
    * The VVC instance this session belongs to.
    * @private
    * @type {VVC}
    */
   this._vvcInstance     = vvcInstance;

   /**
    * Is this session a server or client.
    * @private
    * @type {Boolean}
    */
   this._server          = server;

   /**
    * The channels opened on this session.
    * @private
    * @type {VVCChannel[]}
    */
   this._channels        = [];

   /**
    * Used for unique channel id generation, always an odd or even number
    * depending on whether we are server or client respectively.
    * @private
    * @type {Number}
    */
   this._channelIdCtrl   = this._server ? 1 : 2;

   /**
    * Bytes read of current chunk.
    * @private
    * @type {Number}
    */
   this._bytesRead       = 0;

   /**
    * Bytes requested of current chunk.
    * @private
    * @type {Number}
    */
   this._bytesRequested  = VVC.CHUNK_COMMON_HEADER_SIZE;

   /**
    * History of round trip times, limited to VVC.RTT_HISTORY_SIZE.
    * @private
    * @type {Number[]}
    */
   this._rttHistory      = [];

   /**
    * Current index used for the circular buffer of VVCSession._rttHistory.
    * @private
    * @type {Number[]}
    */
   this._rttHistoryIndex = 0;

   /**
    * Current read chunk.
    * @private
    * @type {Object}
    */
   this._chunk = {};
   this._chunk.channel = 0;
   this._chunk.flags   = 0;
   this._chunk.length  = 0;
   this._chunk.ext = {};
   this._chunk.ext.code   = 0;
   this._chunk.ext.flags  = 0;
   this._chunk.ext.param  = 0;
   this._chunk.ext.length = 0;

   /**
    * Reusable buffers for reading and writing.
    * @private
    * @type {Object}
    */
   this._buffers = {};
   this._buffers.ext = null;
   this._buffers.data = [];
   this._buffers.send = WMKS.Packet.createNewPacket(32);
   this._buffers.header = WMKS.Packet.createNewPacket(VVC.CHUNK_COMMON_HEADER_SIZE +
                                                      VVC.CHUNK_LARGE_HEADER_SIZE +
                                                      VVC.CHUNK_EXTENSION_HEADER_SIZE);

   /**
    * The current receive state.
    * @private
    * @type {VVC.SESSION_RECEIVE_STATE}
    */
   this._receiveState = VVC.SESSION_RECEIVE_STATE.COMMON_HEADER;
   this._setReceiveState(VVC.SESSION_RECEIVE_STATE.COMMON_HEADER);

   return this;
};


/**
 * Size of the COMMON chunk header.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_COMMON_HEADER_SIZE = 4;


/**
 * Size of the LARGE chunk header.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_LARGE_HEADER_SIZE = 4;


/**
 * Size of the EXTENSION chunk header.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_EXTENSION_HEADER_SIZE = 4;


/**
 * Maximum COMMON chunk data length.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_MAX_LEN = 0x00010000;


/**
 * Maximum LARGE chunk data length.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_LARGE_MAX_LEN = 0xfffffc00;


/**
 * VVCSession state
 * @enum {Number}
 * @readonly
 */
VVC.SESSION_STATE = {
   INIT:        0,
   ESTABLISHED: 1,
   ERROR:       2,
   CLOSING:     3
};


/**
 * VVCSession receive state
 * @enum {Number}
 * @readonly
 */
VVC.SESSION_RECEIVE_STATE = {
   COMMON_HEADER:    0,
   LARGE_HEADER:     1,
   EXTENSION_HEADER: 2,
   EXTENSION_DATA:   3,
   DATA:             4
};


/**
 * Chunk header flags
 * @enum {Number}
 * @readonly
 */
VVC.CHUNK_FLAG = {
   /** Chunk and extension data are padded to a multiple of 4 */
   PAD: 0x10,
   /** Extension header is present */
   EXT: 0x20,
   /** Large chunk data length is present */
   LC:  0x40,
   /** Indicates last chunk in a message */
   FIN: 0x80
};


/**
 * Chunk extension header flags
 * @enum {Number}
 * @readonly
 */
VVC.CHUNK_EXT_FLAG = {
   /** Extension data is present */
   EDAT: 0x80
};


/**
 * Closes the session
 *
 * @return {Boolean} Returns true on success
 */
VVCSession.prototype.close = function()
{
   return this._vvcInstance.closeSession(this);
};


/**
 * Opens a channel on this session
 *
 * @param  {String}      name          Name of the channel to open
 * @param  {Number}      [priority]    Priority of the channel
 * @param  {Number}      [flags]       Channel flags
 * @param  {Number}      [timeout]     Channel timeout
 * @param  {Uint8Array}  [initialData] Data to send with the open request
 * @return {?VVCChannel}               A VVCChannel object, or null on error.
 */
VVCSession.prototype.openChannel = function(name,
                                            priority,
                                            flags,
                                            timeout,
                                            initialData)
{
   var channel;

   priority    = priority || 0;
   flags       = flags || 0;
   timeout     = timeout || 0;
   initialData = initialData || null;

   if (!this._checkErrorNameLength('openChannel', name)) {
      return null;
   }

   if (!this._checkErrorSessionState('openChannel',
                                     VVC.SESSION_STATE.ESTABLISHED)) {
      return null;
   }

   if (!this._checkErrorInitialData('openChannel', initialData)) {
      return null;
   }

   channel = this.createChannel(this._nextChannelId(),
                                name,
                                priority,
                                flags,
                                timeout);

   this.controlChannel.sendOpenChannel(channel, initialData);
   return channel;
};


/**
 * Accepts a channel on this session
 *
 * @param  {VVCChannel}  channel       The channel provided by onpeeropen
 * @param  {Number}      [flags]       Accept channel flags
 * @param  {Uint8Array}  [initialData] Data to send with the accept message
 * @return {?VVCChannel}               A VVCChannel object, or null on error.
 */
VVCSession.prototype.acceptChannel = function(channel,
                                              flags,
                                              initialData)
{
   flags       = flags || 0;
   initialData = initialData || null;

   if (!this._checkErrorSessionState('acceptChannel',
                                     VVC.SESSION_STATE.ESTABLISHED)) {
      return null;
   }

   if (!this._checkErrorInitialData('acceptChannel', initialData)) {
      return null;
   }

   if (!this._checkErrorIsChannel('acceptChannel', channel)) {
      return null;
   }

   this.controlChannel.sendOpenChannelAck(channel,
                                          VVC.OPEN_CHAN_STATUS.SUCCESS,
                                          initialData);

   this.onChannelOpen(channel,
                      VVC.OPEN_CHAN_STATUS.SUCCESS,
                      channel.initialData);

   delete channel.initialData;
   return channel;
};


/**
 * Rejects a channel open request
 *
 * @param  {VVCChannel} channel       The channel to reject opening
 * @param  {Uint8Array} [initialData] Data to send with the reject channel op
 * @return {Boolean}                  Returns true on succes
 */
VVCSession.prototype.rejectChannel = function(channel, initialData)
{
   initialData = initialData || null;

   if (!this._checkErrorSessionState('rejectChannel',
                                     VVC.SESSION_STATE.ESTABLISHED)) {
      return false;
   }

   if (!this._checkErrorInitialData('rejectChannel', initialData)) {
      return false;
   }

   if (!this._checkErrorIsChannel('rejectChannel', channel)) {
      return false;
   }

   this.controlChannel.sendOpenChannelAck(channel,
                                          VVC.OPEN_CHAN_STATUS.REJECT,
                                          initialData);

   channel.state = VVC.CHANNEL_STATE.CLOSED;
   this._releaseChannel(channel);
   return true;
};


/**
 * Closes a channel
 *
 * @param  {VVCChannel} channel A valid VVCChannel to close
 * @return {Boolean}            Returns true on success
 */
VVCSession.prototype.closeChannel = function(channel)
{
   if (!this._checkErrorSessionState('closeChannel',
                                     VVC.SESSION_STATE.ESTABLISHED)) {
      return false;
   }

   if (!this._checkErrorIsChannel('closeChannel', channel)) {
      return false;
   }

   if (!this._checkErrorChannelState('closeChannel', channel,
                                     VVC.CHANNEL_STATE.OPEN)) {
      return false;
   }

   channel.state = VVC.CHANNEL_STATE.CLOSING;
   this.controlChannel.sendCloseChannel(channel, VVC.CLOSE_CHAN_REASON.NORMAL);
   return true;
};


/**
 * Add a RTT time to our circular buffer history.
 *
 * @protected
 * @param {Number} rttMS
 */
VVCSession.prototype.addRttTime = function(rttMS)
{
   this._rttHistory[this._rttHistoryIndex] = rttMS;
   this._rttHistoryIndex++;

   if (this._rttHistoryIndex >= VVC.RTT_HISTORY_SIZE) {
      this._rttHistoryIndex = 0;
   }
};


/**
 * Attaches the session to a websocket.
 * Modifies the websocket's callbacks to point to our internal functions.
 * Sets the websocket's binary type to ArrayBuffer.
 *
 * @protected
 * @param  {VVCChannel} channel A valid VVCChannel to close
 * @return {Boolean}            Returns true on success
 */
VVCSession.prototype.attachToWebSocket = function(socket)
{
   var self = this;

   if (!(socket instanceof WebSocket)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.attachToWebSocket',
                                     'Invalied socket,'
                                     + ' must be instanceof WebSocket');
      return false;
   }

   this.socket = socket;

   socket.onopen = function(evt) {
      this.binaryType = 'arraybuffer';
      self._onTransportOpen();
   };

   socket.onclose = function(evt) {
      self._onTransportClose(evt);
   };

   socket.onerror = function(evt) {
      self._onTransportError(evt);
   };

   socket.onmessage = function(evt) {
      if (!(evt.data instanceof ArrayBuffer)) {
         throw 'Expected ArrayBuffer from websocket';
      }

      self._onTransportRecv(new Uint8Array(evt.data));
   };

   // If socket is already open lets fake call onopen to start our session
   if (socket.readyState) {
      socket.onopen({});
   }

   return true;
};


/**
 * Generates an id value for a new channel.
 *
 * @private
 * @return {Number} New channel id
 */
VVCSession.prototype._nextChannelId = function()
{
   var id = this._channelIdCtrl;
   this._channelIdCtrl += 2;
   return id;
};


/**
 * Creates a VVCChannel object and adds it to the channel list.
 *
 * @protected
 * @param  {Number}     id
 * @param  {String}     name
 * @param  {Number}     [priority]
 * @param  {Number}     [flags]
 * @param  {Number}     [timeout]
 * @return {VVCChannel}
 */
VVCSession.prototype.createChannel = function(id,
                                              name,
                                              priority,
                                              flags,
                                              timeout)
{
   var channel;

   priority = priority || 0;
   timeout  = timeout || 0;
   flags    = flags || 0;

   channel = new VVCChannel(this, id, name, priority, flags, timeout);
   this._channels[id] = channel;
   this._buffers.data[id] = [];
   return channel;
};


/**
 * Removes a channel from this session
 *
 * @private
 * @param  {VVCChannel} channel
 */
VVCSession.prototype._releaseChannel = function(channel)
{
   if (channel.state === VVC.CHANNEL_STATE.OPEN) {
      this._vvcInstance.setLastError(VVC.STATUS.PROTOCOL_ERROR,
                                     'VVCSession._releaseChannel',
                                     'Releasing an open channel!');
   }

   delete this._channels[channel.id];
   delete this._buffers.data[channel.id];
};


/**
 * Gets a channel by id
 *
 * @protected
 * @param  {Number}      id      Channel ID
 * @return {?VVCChannel} channel
 */
VVCSession.prototype.getChannel = function(id)
{
   if (!!this._channels[id]) {
      return this._channels[id];
   }

   return null;
};


/**
 * Called when there is a error within the session.
 * Triggers the session.onerror callback.
 *
 * @protected
 * @param {VVC.STATUS} status  Error status code
 * @param {String}     where   Where the error occurred
 * @param {String}     message A hopefully useful description of error
 */
VVCSession.prototype.onSessionError = function(status, where, message)
{
   this.state = VVC.SESSION_STATE.ERROR;
   this._vvcInstance.setLastError(status, where, message);

   if (this.onerror) {
      this.onerror(status);
   }
};


/**
 * Called when the session is closed.
 * Closes all open channels and calls either channel.onerror or channel.onclose
 *
 * @protected
 */
VVCSession.prototype.onSessionClose = function()
{
   var channel, closeChanReason, i;

   if (this.state === VVC.SESSION_STATE.ERROR) {
      closeChanReason = VVC.CLOSE_CHAN_REASON.ERROR;
   } else {
      closeChanReason = VVC.CLOSE_CHAN_REASON.NORMAL;
   }

   this.state = VVC.SESSION_STATE.CLOSING;
   this.socket.close();

   for (i = 0; i < this._channels.length; ++i) {
      channel = this._channels[i];

      if (channel) {
         if (channel.state === VVC.CHANNEL_STATE.INIT) {
            this.onChannelOpen(channel, VVC.STATUS.ERROR);
         } else if (channel.state === VVC.CHANNEL_STATE.OPEN
                 || channel.state === VVC.CHANNEL_STATE.CLOSING) {
            channel.state = VVC.CHANNEL_STATE.CLOSING;
            this.onChannelClose(channel, closeChanReason);
         }
      }
   }
};


/**
 * Called when the control channel receives an INIT or INIT_ACK message.
 * Triggers the listener.onconnect callback.
 *
 * @protected
 */
VVCSession.prototype.onConnect = function()
{
   var i, listener, listeners;

   listeners = this._vvcInstance._findSessionListeners(this);
   this.state = VVC.SESSION_STATE.ESTABLISHED;

   for (i = 0; i < listeners.length; ++i) {
      listener = listeners[i];

      if (listener.onconnect) {
         listener.onconnect(this);
      }
   }
};


/**
 * Called when the control channel receives an OPEN_CHAN message.
 * Triggers the listener.onpeeropen callback.
 *
 * @protected
 * @param {VVCChannel} channel The new channel being opened
 */
VVCSession.prototype.onPeerOpen = function(channel)
{
   var i, listener, listeners;

   listeners = this._vvcInstance._findSessionListeners(this);

   for (i = 0; i < listeners.length; ++i) {
      listener = listeners[i];

      if (listener.matchName(channel.name)) {
         if (listener.onpeeropen) {
            listener.onpeeropen(this, channel);
         }
      }
   }
};


/**
 * Called when the control channel receives an OPEN_CHAN_ACK message.
 * Triggers the channel.onopen callback.
 *
 * @protected
 * @param {VVCChannel}           channel     The new channel being opened
 * @param {VVC.OPEN_CHAN_STATUS} status      The status of the open
 * @param {Uint8Array?}          initialData Data that came with the open msg
 */
VVCSession.prototype.onChannelOpen = function(channel, status, initialData)
{
   if (status === VVC.OPEN_CHAN_STATUS.SUCCESS) {
      channel.state = VVC.CHANNEL_STATE.OPEN;
      if (channel.onopen) {
         channel.onopen(this._createEvent('open', { data: initialData }));
      }
   } else {
      channel.state = VVC.CHANNEL_STATE.OPEN_FAILED;
      this._releaseChannel(channel);
      this.onChannelError(channel);
   }
};


/**
 * Called when an error occurs on a channel.
 * Triggers the channel.onerror callback.
 *
 * @protected
 * @param {VVCChannel} channel The channel which had the error
 */
VVCSession.prototype.onChannelError = function(channel)
{
   if (channel.onerror) {
      channel.onerror(this._createEvent('error'));
   }
};


/**
 * Called when a channel receives a message.
 * Triggers the channel.onmessage callback.
 *
 * @protected
 * @param {VVCChannel} channel The channel receiving the message
 * @param {ArrayBuffer} data   The message data
 */
VVCSession.prototype.onChannelMessage = function(channel, data)
{
   if (!channel) {
      this.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                          'VVCSession.onChannelMessage',
                          'Unknown channel in chunk');
      return;
   }

   if (channel.onmessage) {
      channel.onmessage(this._createEvent('message', { data: data }));
   }
};


/**
 * Called when the control channel receives an CLOSE_CHAN or CLOSE_CHAN_ACK.
 * Triggers the channel.onclose callback.
 * Removes the channel from the session's channel list.
 *
 * @protected
 * @param {VVCChannel}            channel The channel being close
 * @param {VVC.CLOSE_CHAN_REASON} reason  The reason for closing
 */
VVCSession.prototype.onChannelClose = function(channel, reason)
{
   var code;

   if (reason === VVC.CLOSE_CHAN_REASON.NORMAL) {
      code = 1000; // WebSocket 'normal close'

      if (channel.state === VVC.CHANNEL_STATE.CLOSING) {
         channel.state = VVC.CHANNEL_STATE.PEER_CLOSED;
      } else {
         channel.state = VVC.CHANNEL_STATE.PEER_CLOSING;
         this.controlChannel.sendCloseChannelAck(channel, VVC.CLOSE_CHAN_STATUS.SUCCESS);
      }
   } else {
      code = 1002; // WebSocket 'protocol error'
   }

   if (channel.onclose) {
      channel.onclose(this._createEvent('close', {
         wasClean: (reason === VVC.CLOSE_CHAN_REASON.NORMAL),
         reason: reason,
         code: code
      }));
   }

   channel.state = VVC.CHANNEL_STATE.CLOSED;
   this._releaseChannel(channel);
};


/**
 * Called when the transport opens.
 * @private
 */
VVCSession.prototype._onTransportOpen = function()
{
   // Create a channel with our control channel id & name
   this.controlChannel = this.createChannel(VVC.CONTROL_CHANNEL_ID,
                                            VVC.CONTROL_CHANNEL_NAME);

   // Wrap it in our custom VVCControlChannel object
   this.controlChannel = new VVCControlChannel(this.controlChannel);

   // It is the clients responsibility to send the first control init message
   if (!this._server) {
      this.controlChannel.sendInit(VVC.CTRL_OP.INIT);
   }
};


/**
 * Called when the transport closes.
 * @private
 */
VVCSession.prototype._onTransportClose = function(evt)
{
   if (this.state === VVC.SESSION_STATE.ESTABLISHED) {
      this.onSessionError(VVC.TRANSPORT_ERROR,
                          'VVCSession._onTransportClose',
                          'The WebSocket closed whilst the session was open.');
   }

   if (this.ontransportclose) {
      this.ontransportclose(evt);
   }
};


/**
 * Called when the transport errors.
 * @private
 */
VVCSession.prototype._onTransportError = function(evt)
{
   this.onSessionError(VVC.TRANSPORT_ERROR,
                       'VVCSession._onTransportError',
                       'An error occurred in the WebSocket.');

   if (this.ontransporterror) {
      this.ontransporterror(evt);
   }
};


/**
 * Combines multiple Uint8Array into a single ArrayBuffer.
 *
 * @private
 * @param  {Uint8Array[]} buffers  The split multiple Uint8Array buffers.
 * @return {ArrayBuffer}  combined The combined single ArrayBuffer
 */
VVCSession.prototype._combineBuffers = function(buffers)
{
   var array, buffer, i, size;

   if (buffers.length === 0) {
      return null;
   }

   size = 0;

   for (i = 0; i < buffers.length; ++i) {
      size += buffers[i].length;
   }

   buffer = new ArrayBuffer(size);
   array  = new Uint8Array(buffer);
   size   = 0;

   for (i = 0; i < buffers.length; ++i) {
      array.set(buffers[i], size);
      size += buffers[i].length;
   }

   return buffer;
};


/**
 * Sets the next receive state.
 * Asks for the appropriate amount of bytes to be read from transport.
 *
 * @private
 * @param  {VVC.SESSION_RECEIVE_STATE} state The next receive state
 */
VVCSession.prototype._setReceiveState = function(state)
{
   this._receiveState = state;

   switch(state) {
      case VVC.SESSION_RECEIVE_STATE.COMMON_HEADER:
         this._bytesRequested = VVC.CHUNK_COMMON_HEADER_SIZE;
         this._bytesRead = 0;
         this._buffers.header.reset();
         break;
      case VVC.SESSION_RECEIVE_STATE.LARGE_HEADER:
         this._bytesRequested += VVC.CHUNK_LARGE_HEADER_SIZE;
         break;
      case VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER:
         this._bytesRequested += VVC.CHUNK_EXTENSION_HEADER_SIZE;
         break;
      case VVC.SESSION_RECEIVE_STATE.EXTENSION_DATA:
         this._bytesRequested += this._chunk.ext.length;
         break;
      case VVC.SESSION_RECEIVE_STATE.DATA:
         this._bytesRequested += this._chunk.length;
         break;
   }
};


/**
 * Called when the underlying transport receives data.
 * Reads the chunk headers and forwards messages to the correct channel.
 *
 * @private
 * @param  {Uint8Array} data The raw binary data from the transport.
 */
VVCSession.prototype._onTransportRecv = function(data)
{
   var buffer, bytesNeeded, bytesRead, dataRead;

   bytesNeeded = this._bytesRequested - this._bytesRead;
   bytesRead   = Math.min(data.length, bytesNeeded);
   dataRead    = data.subarray(0, bytesRead);
   buffer      = null;

   switch(this._receiveState) {
   case VVC.SESSION_RECEIVE_STATE.COMMON_HEADER:
   case VVC.SESSION_RECEIVE_STATE.LARGE_HEADER:
   case VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER:
      buffer = this._buffers.header;
      break;
   case VVC.SESSION_RECEIVE_STATE.EXTENSION_DATA:
      buffer = this._buffers.ext;
      break;
   case VVC.SESSION_RECEIVE_STATE.DATA:
      this._buffers.data[this._chunk.channel].push(dataRead);

      if (this._chunk.channel !== VVC.CONTROL_CHANNEL_ID && bytesRead) {
         this.controlChannel.sendRecvAck(bytesRead);
      }
      break;
   }

   if (buffer) {
      buffer.writeArray(dataRead);
   }

   this._bytesRead += bytesRead;

   if (data.length < bytesNeeded) {
      return;
   }

   switch (this._receiveState) {
   case VVC.SESSION_RECEIVE_STATE.COMMON_HEADER:
      this._chunk.channel = buffer.readUint8();
      this._chunk.flags   = buffer.readUint8();
      this._chunk.length  = buffer.readUint16() + 1;

      if (this._chunk.flags & VVC.CHUNK_FLAG.LC) {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.LARGE_HEADER);
      } else if (this._chunk.flags & VVC.CHUNK_FLAG.EXT) {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER);
      } else {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.DATA);
      }
      break;
   case VVC.SESSION_RECEIVE_STATE.LARGE_HEADER:
      this._chunk.length = buffer.readUint32() + 1;

      if (this._chunk.flags & VVC.CHUNK_FLAG.EXT) {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER);
      } else {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.DATA);
      }
      break;
   case VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER:
      this._chunk.ext.code  = buffer.readUint8();
      this._chunk.ext.flags = buffer.readUint8();
      this._chunk.ext.param = buffer.readUint16();

      if (this._chunk.ext.flags & VVC.CHUNK_EXT_FLAG.EDAT) {
         this._chunk.ext.length = this._chunk.ext.param + 1;
         this._buffers.ext = new WMKS.Packet.createNewPacket(this._chunk.ext.length);
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.EXTENSION_DATA);
      } else {
         this._chunk.ext.length = 0;
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.DATA);
      }
      break;
   case VVC.SESSION_RECEIVE_STATE.EXTENSION_DATA:
      this._buffers.ext = null;
      this._setReceiveState(VVC.SESSION_RECEIVE_STATE.DATA);
      break;
   case VVC.SESSION_RECEIVE_STATE.DATA:
      if (this._chunk.flags & VVC.CHUNK_FLAG.FIN) {
         buffer = this._combineBuffers(this._buffers.data[this._chunk.channel]);
         this.onChannelMessage(this._channels[this._chunk.channel], buffer);
         this._buffers.data[this._chunk.channel] = [];
      }

      this._setReceiveState(VVC.SESSION_RECEIVE_STATE.COMMON_HEADER);
      break;
   }

   if (data.length > bytesRead) {
      this._onTransportRecv(data.subarray(bytesRead));
   }
};


/**
 * Send data on a channel.
 * Constructs the appropriate chunk header.
 *
 * @protected
 * @param  {VVCChannel}             channel The channel to send data on
 * @param  {Uint8Array|ArrayBuffer} data    The data to send
 * @return {Boolean}                        Returns true on succesful send.
 */
VVCSession.prototype.send = function(channel, data)
{
   var header, flags, length;

   if (!this._checkErrorIsChannel('send', channel)) {
      return false;
   }

   if (!this._checkErrorChannelState('send', channel,
                                     VVC.CHANNEL_STATE.OPEN)) {
      return false;
   }

   if (!(data instanceof Uint8Array) && !(data instanceof ArrayBuffer)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.send',
                                     'Invalid data, must be Uint8Array'
                                     + ' or ArrayBuffer');
      return false;
   }

   header = this._buffers.send;
   header.reset();
   header.writeUint8(channel.id);

   length = data.byteLength;
   flags  = VVC.CHUNK_FLAG.FIN;

   if (length > VVC.CHUNK_MAX_LEN) {
      header.writeUint8(VVC.CHUNK_FLAG.LC | flags);
      header.writeUint16(0);
      header.writeUint32(length - 1);
   } else {
      header.writeUint8(flags);
      header.writeUint16(length - 1);
   }

   this.socket.send(header.getData());
   this.socket.send(data);
   return true;
};


/**
 * Creates an Event object.
 *
 * Needed because Internet Explorer does not allow new Event();
 *
 * @private
 * @param {String} name       The event name
 * @param {Object} properties Properties to copy to the event
 * @return {Event}            Returns newly constructed event
 */
VVCSession.prototype._createEvent = function(name, properties)
{
   var evt = document.createEvent('Event');
   evt.initEvent(name, false, false);

   for (var key in properties) {
      evt[key] = properties[key];
   }

   return evt;
};


/**
 * Returns false and sets an error if the provided object is not a channel.
 * object must be instanceof VVCChannel
 *
 * @private
 * @param  {String}  func   Function name for error logging
 * @param  {Object}  object Object to check type of
 * @return {Boolean}        Returns true if object is a VNCChannel
 */
VVCSession.prototype._checkErrorIsChannel = function(func, object)
{
   if (!(object instanceof VVCChannel)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.' + func,
                                     'Invalid channel,'
                                      + ' must be instanceof VVCChannel');
      return false;
   }

   return true;
};


/**
 * Returns false and sets an error if the session state is not a value.
 *
 * @private
 * @param  {String}            func  Function name for error logging
 * @param  {VVC.SESSION_STATE} state State the session must be in
 * @return {Boolean}                 Returns true if state is correct
 */
VVCSession.prototype._checkErrorSessionState = function(func, state)
{
   if (this.state !== state) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_STATE,
                                     'VVCSession.' + func,
                                     'Invalid state ' + this.state
                                     + ' expected ' + state);
      return false;
   }

   return true;
};


/**
 * Returns false and sets an error if the channel state is not a value.
 *
 * @private
 * @param  {String}            func    Function name for error logging
 * @param  {VVCChannel}        channel The channel for which state to check
 * @param  {VVC.SESSION_STATE} state   State the session must be in
 * @return {Boolean}                   Returns true if state is correct
 */
VVCSession.prototype._checkErrorChannelState = function(func, channel, state)
{
   if (channel.state !== state) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_STATE,
                                     'VVCSession.' + func,
                                     'Invalid state ' + channel.state
                                     + ' expected ' + state);
      return false;
   }

   return true;
};


/**
 * Returns false and sets an error if the length of name is invalid.
 * name must be between VVC.MIN_CHANNEL_NAME_LEN and VVC.MAX_CHANNEL_NAME_LEN.
 *
 * @private
 * @param  {String}  func Function name for error logging
 * @param  {String}  name Name to check
 * @return {Boolean}      Returns true if name length is valid
 */
VVCSession.prototype._checkErrorNameLength = function(func, name)
{
   if (name.length < VVC.MIN_CHANNEL_NAME_LEN ||
       name.length > VVC.MAX_CHANNEL_NAME_LEN) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.' + func,
                                     'Invalid name ' + name
                                     + ' length must be between '
                                     + VVC.MIN_CHANNEL_NAME_LEN + ' and '
                                     + VVC.MAX_CHANNEL_NAME_LEN + ' bytes');
      return false;
   }

   return true;
};


/**
 * Returns false and sets an error if the initialData is invalid.
 * initialData must be a Uint8Array smaller than VVC.MAX_INITIAL_DATA_LEN.
 *
 * @private
 * @param  {String}     func        Function name for error logging
 * @param  {Uint8Array} initialData Data to check
 * @return {Boolean}                Returns true if initialData is valid
 */
VVCSession.prototype._checkErrorInitialData = function(func, initialData)
{
   if (initialData && !(initialData instanceof Uint8Array)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.' + func,
                                     'Invalid initial data,'
                                      + ' must be instanceof Uint8Array');
      return false;
   }

   if (initialData && initialData.length > VVC.MAX_INITIAL_DATA_LEN) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.' + func,
                                     'Invalid initial data,'
                                      + ' must be smaller than '
                                      + VVC.MAX_INITIAL_DATA_LEN + ' bytes');
      return false;
   }

   return true;
};


/**
 * Called when there is an error with the channel.
 * @callback VVCSession~onerror
 */


/**
 * Called when the transport closes.
 * @callback VVCSession~ontransportclose
 * @param {Event} event
 */


/**
 * Called when there is an error on the transport.
 * @callback VVCSession~ontransporterror
 * @param {Event} event
 */

$.widget("wmks.wmks", WMKS.widgetProto);
})();
(function() {
/*********************************************************
 * Copyright (C) 2015 VMware, Inc. All rights reserved.
 *********************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * wmks\const.js
 *
 *    This file expanded the original WMKS.CONST, all constants used in
 *    the new SDK all defined here.
 *
 *    This contains the following:
 *    1. Position: provides the possible option value when create wmks about
 *       how to position the remote screen to make it within the container.
 *
 *    2. ConnectionState: the value of 3 possible connection states when try
 *       to connect the remote VM.
 *
 *	  3. Events: all the events name the new SDK could trigger are listed here.
 *
 *	  4. ErrorType: possible error types in the lifecycle of wmks.
 *
 *	  5. AudioEncodeType: provides the possible audio encode type when create wmks
 *
 *
 *	  6. InputDeviceType: the supported mobile input devices type.
 *
 *
 *------------------------------------------------------------------------------
 */
$.extend(WMKS.CONST, {

    Position: {
        CENTER:   0,
        LEFT_TOP: 1
    },

    ConnectionState: {
        CONNECTING: "connecting",
        CONNECTED: "connected",
        DISCONNECTED: "disconnected"
    },

    Events: {
        CONNECTION_STATE_CHANGE: "connectionstatechange",
        REMOTE_SCREEN_SIZE_CHANGE: "screensizechange",
        FULL_SCREEN_CHANGE: "fullscreenchange",
        ERROR: "error",
        KEYBOARD_LEDS_CHANGE: "keyboardledschanged",
        HEARTBEAT: "heartbeat",
        AUDIO: "audio",
        COPY: "copy",
        TOGGLE: "toggle"
    },

    ErrorType: {
        AUTHENTICATION_FAILED: "authenticationfailed",
        WEBSOCKET_ERROR: "websocketerror",
        PROTOCOL_ERROR: "protocolerror"
    },

    AudioEncodeType: {
        VORBIS: "vorbis",
        OPUS: "opus",
        AAC: "aac"
    },

    InputDeviceType: {
        KEYBOARD: 0,
        EXTENDED_KEYBOARD: 1,
        TRACKPAD: 2
    }
});



/*********************************************************
 * Copyright (C) 2015 VMware, Inc. All rights reserved.
 *********************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * wmks\wmksWidget.js
 *
 * A widget inherited from the original wmks to provide better behavior
 *
 * Some of the options of the original wmks been modified to The options used to
 * optimize the behavior of the WebMKS, here is the mapping:
 *
 * * fitToParent:
 *   - deprecated. Add rescale and position to instead it. Option rescale is a
 *   boolean, indcates whether rescale the remote screen to fit the container's
 *   allocated size. Option position is an enum, could be any value of
 *   WMKS.CONST.Position, it means put the remote screen in the center or left
 *   top of the container.
 *
 * * fitGuest:
 *   - change the name of fitGuest to **changeResolution**. When the option
 *   changeResolution is true, it means it would send the change resolution request
 *   to the connected VM, the request resolution(width & height) is the same as the
 *   container's allocated size. If the request failed, the option transMode would be
 *   used to transform the remote screen to fit the container.
 *
 * * audioEncodeType:
 *   - combined the options: enableVorbisAudioClips, enableOpusAudioClips,
 *   enableAacAudioClips into one audioEncodeType. It's an enum, could be any value
 *   of WMKS.CONST.AudioEncodeType.
 *
 * * allowMobileKeyboardInput, allowMobileTrackpad, allowMobileExtendedKeypad
 *   - removed. Add enableInputDevice() and disableInputDevice() methods
 *   to provide the same capability.
 *
 *
 * * useNativePixels
 * * useUnicodeKeyboardInput
 * * useVNCHandshake
 * * sendProperMouseWheelDeltas
 * * reverseScrollY
 * * retryConnectionInterval
 * * ignoredRawKeyCodes
 * * fixANSIEquivalentKeys
 *   - The same as original.
 *------------------------------------------------------------------------------
 */
$.widget("wmks.nwmks", $.wmks.wmks, {

    //the default value of the options
    options: {
        rescale: true,
        position: WMKS.CONST.Position.CENTER,
        changeResolution: true,
        audioEncodeType: null,
        useNativePixels: false,
        useUnicodeKeyboardInput: false,
        useVNCHandshake: true,
        sendProperMouseWheelDeltas: false,
        reverseScrollY: false,
        retryConnectionInterval: -1,
        ignoredRawKeyCodes: [],
        fixANSIEquivalentKeys: false
    },

    /************************************************************************
     * jQuery instantiation
     ************************************************************************/

    /*
     *------------------------------------------------------------------------------
     *
     * _create
     *
     *    jQuery-UI initialisation function, called by $.widget()
     *
     *
     *    First mapping some of the options to the original wmks options,
     *    then still use the super class's _create() method for instantiation.
     *
     * Results:
     *    None.
     *
     * Side Effects:
     *    Injects the WMKS canvas into the WMKS container HTML, sets it up
     *    and connects to the server.
     *
     *------------------------------------------------------------------------------
     */
    _create: function () {

        if (this.options.changeResolution) {
            this.options.fitGuest = true;
        }
        if (this.options.audioEncodeType) {
            var constType = WMKS.CONST.AudioEncodeType;
            switch (this.options.audioEncodeType) {
                case constType.AAC:
                    this.options.enableAacAudioClips = true;
                    break;
                case constType.OPUS:
                    this.options.enableOpusAudioClips = true;
                    break;
                case constType.VORBIS:
                    this.options.enableVorbisAudioClips = true;
                    break;
            }
        }
        this.element.unbind();
        WMKS.widgetProto._create.apply(this);

    },

    /*
     *------------------------------------------------------------------------------
     *
     * _init
     *
     *    jQuery-UI initialisation function, called by $.widget
     *    Here initialize the attribute transformOrigin in cross browser environment.
     *
     *------------------------------------------------------------------------------
     */
    _init: function () {
        var self = this;
        var checkProperty = function (prop) {
            return typeof self._canvas[0].style[prop] !== 'undefined' ? prop : null;
        };

        this.transformOrigin = (checkProperty('transformOrigin') ||
            checkProperty('WebkitTransformOrigin') ||
            checkProperty('MozTransformOrigin') ||
            checkProperty('msTransformOrigin') ||
            checkProperty('OTransformOrigin'));
    },

    /*
     *------------------------------------------------------------------------------
     *
     * rescaleOrResize
     *
     *    Override the superClass widgetProto's rescaleOrResize method.
     *
     *    The behavior depends on the option changeResolution, rescale, position:
     *    1) check changeResolution and parameter tryChangeResolution: if both true,
     *    then send the change resolution request to the connected VM, the request
     *    resolution(width & height) is the same as the container's allocated size.
     *
     *    2) check rescale option: if true, rescale the remote screen to fit the
     *    container's allocated size.
     *
     *    3) check position option: If the remote screen's size is not same with
     *    the container's allocated size, then put the remote screen in the center
     *    or left top of the container based on its value.
     *
     * Results:
     *    None.
     *
     * Side Effects:
     *    Updates this._scale and modifies the canvas size and position.
     *    Possibly triggers a resolutionRequest message to the server.
     *
     *------------------------------------------------------------------------------
     */
    rescaleOrResize: function (tryChangeResolution) {
        var newScale = 1.0, x = 0, y = 0, origin = "center center";
        var parentWidth = this.element.width(),
            parentHeight = this.element.height();

        this._canvas.css({
            width: this._guestWidth / this._pixelRatio,
            height: this._guestHeight / this._pixelRatio
        });

        var width = this._canvas.width();
        var height = this._canvas.height();

        if (tryChangeResolution && this.options.changeResolution) {
            this.updateFitGuestSize(true);
        }

        if (this.transform !== null) {

            if(this.options.rescale)
            {
                var horizScale = parentWidth / width,
                    vertScale = parentHeight / height;
                newScale = Math.max(0.1, Math.min(horizScale, vertScale));
            }
            if(this.options.position !== null)
            {
                switch (this.options.position) {
                    case WMKS.CONST.Position.CENTER:
                        x = (parentWidth - width) / 2;
                        y = (parentHeight - height) / 2;
                        break;
                    case WMKS.CONST.Position.LEFT_TOP:
                        origin = "left top";
                        break;
                }
            }

            if (newScale !== this._scale) {
                this._scale = newScale;
                this._canvas.css(this.transform, "scale(" + this._scale + ")");
                this._canvas.css(this.transformOrigin, origin);
            }

            if (x !== this._x || y !== this._y) {
                this._x = x;
                this._y = y;
                this._canvas.css({top: y, left: x});
            }
        }
        else {
            WMKS.LOGGER.warn("No scaling support");
        }

    },

    /*
     *------------------------------------------------------------------------------
     *
     * _setOption
     *
     *    Changes a WMKS option.
     *
     * Results:
     *    None.
     *
     * Side Effects:
     *    Updates the given option in this.options.
     *
     *------------------------------------------------------------------------------
     */
    _setOption: function (key, value) {

        // mixin the option to this.options
        $.Widget.prototype._setOption.apply(this, arguments);

        switch (key) {
            case 'rescale':
            case 'position':
            case 'changeResolution':
                this.rescaleOrResize(true);
                break;

            case 'useNativePixels':
                // Return if useNativePixels is true and browser indicates no-support.
                if (value && !WMKS.UTIL.isHighResolutionSupported()) {
                    WMKS.LOGGER.warn('Browser/device does not support this feature.');
                    return;
                }
                this._updatePixelRatio();
                this.rescaleOrResize(true);
                break;
            case 'fixANSIEquivalentKeys':
                this._keyboardManager.fixANSIEquivalentKeys = value;
                break;
        }
    },

    /*
     *------------------------------------------------------------------------------
     *
     * setRemoteScreenSize
     *
     *    This function could work if the option changeResolution is true and
     *    the server sends back a CAPS message indicating that it can handle
     *    resolution change requests.
     *
     *    It will send the request about desired resolution (both width and height)
     *    to the connect VM.
     *
     * Results:
     *    None.
     *
     * Side Effects:
     *    It would not guarantee the request would success.
     *
     *------------------------------------------------------------------------------
     */
    setRemoteScreenSize: function (width, height) {
        var newW = width * this._pixelRatio,
            newH = height * this._pixelRatio;

        if (!this.options.changeResolution
            || (this._guestWidth === newW
                && this._guestHeight === newH)) {
            return;
        }
        // New resolution based on pixelRatio in case of changeResolution.
        this._vncDecoder.onRequestResolution(newW, newH);
    }
});


/*********************************************************
 * Copyright (C) 2015 VMware, Inc. All rights reserved.
 *********************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * wmks\coreAPI.js
 *
 *    The CoreWMKS class defined all the Public API(22) provided by the wmks:
 *
 *    * General API:
 *      - getVersion()
 *      - getConnectionState()
 *
 *    * Lifecycle related API:
 *      - connect()
 *      - disconnect()
 *      - destroy()
 *
 *    * Display related API:
 *      - setRemoteScreenSize()
 *      - getRemoteScreenSize()
 *      - updateScreen()
 *
 *    * Full screen related API:
 *      - canFullScreen()
 *      - isFullScreen()
 *      - enterFullScreen()
 *      - exitFullScreen()
 *
 *    * Input related API:
 *      - sendInputString()
 *      - sendKeyCodes()
 *      - sendCAD()
 *
 *    * Mobile related API:
 *      - enableInputDevice()
 *      - disableInputDevice()
 *      - showKeyboard()
 *      - hideKeyboard()
 *      - toggleExtendedKeypad()
 *      - toggleTrackpad()
 *
 *    * Option related API:
 *      - setOption()
 *
 *    * Events related API:
 *      - register()
 *      - unregister()
 *
 *   Trigger the following events:
 *   - FULL_SCREEN_CHANGE event (new added)
 *   - CONNECTION_STATE_CHANGE
 *   - REMOTE_SCREEN_SIZE_CHANGE
 *   - ERROR
 *   - KEYBOARD_LEDS_CHANGE
 *   - HEARTBEAT
 *   - AUDIO
 *   - COPY
 *   - TOGGLE
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS = function (wmks) {
    this.wmks = wmks;
    //different version jquery has different way to get the data
    this.wmksData = wmks.data("nwmks") || wmks.data("wmks-nwmks") ;
    this.oldCssText = "";
    this.connectionState = WMKS.CONST.ConnectionState.DISCONNECTED;
    this.eventHandlers = {};

    var Event_Prefix = this.wmksData.widgetEventPrefix;
    var self = this;

    var triggerEvents = function (eventName, event, data) {
        var handlerArray = self.eventHandlers[eventName];
        if (handlerArray && handlerArray.length > 0) {
            var len = handlerArray.length;
            for (var i = 0; i < len; i++) {
                handlerArray[i].apply(wmks, [event, data]);
            }
        }
    };

    /* ----------------------- CONNECTION_STATE_CHANGE event ---------------------- */
    var connectEventsNameStr = [Event_Prefix + "connecting",
            Event_Prefix + "connected",
            Event_Prefix + "disconnected"].join(" ");
    wmks.bind(connectEventsNameStr, function (event, data) {
        data = data || {};
        var eventName = event.type;
        self.connectionState = eventName.substring(Event_Prefix.length, eventName.length);

        data.state = self.connectionState;

        triggerEvents(WMKS.CONST.Events.CONNECTION_STATE_CHANGE, event, data);
    });


    /* ---------------------------- ERROR event ---------------------------------- */

    var errorEventsNameStr = [Event_Prefix + "authenticationfailed",
            Event_Prefix + "error",
            Event_Prefix + "protocolerror" ].join(" ");

    wmks.bind(errorEventsNameStr, function (event, data) {
        var errorType,
            cons = WMKS.CONST.ErrorType
            type = event.type.substring(Event_Prefix.length,event.type.length);

        data = data || {};
        switch (type) {
            case "authenticationfailed":
                errorType = cons.AUTHENTICATION_FAILED;
                break;
            case "error":
                errorType = cons.WEBSOCKET_ERROR;
                break;
            case "protocolerror":
                errorType = cons.PROTOCOL_ERROR;
                break;
        }
        if (errorType) {
            data.errorType = errorType;
            triggerEvents(WMKS.CONST.Events.ERROR, event, data);
        }
    });

    /* ---------------------- REMOTE_SCREEN_SIZE_CHANGE event -------------------- */
    wmks.bind(Event_Prefix + "resolutionchanged", function (event, data) {
        triggerEvents(WMKS.CONST.Events.REMOTE_SCREEN_SIZE_CHANGE, event, data);
    });

    /* -------KEYBOARD_LEDS_CHANGE, HEARTBEAT,AUDIO,COPY,TOGGLE ----------------- */
    var eventsNameStr = [Event_Prefix + "keyboardledschanged",
            Event_Prefix + "heartbeat",
            Event_Prefix + "copy",
            Event_Prefix + "audio",
            Event_Prefix + "toggle"].join(" ");
    wmks.bind(eventsNameStr, function (event, data) {
        var type = event.type.substring(Event_Prefix.length,event.type.length);
        if(type == "toggle")
        {
            data = {"type":arguments[1],"visibility":arguments[2]};
        }
        triggerEvents(type, event, data);
    });


    /* ------------------------ FULL_SCREEN_CHANGE event ------------------------ */

    // here the enterFullScreenHandler would be remove in the exitFullScreenHandler
    // cause the resize event maybe would be triggered for more than once,
    // and only the last one is the really fullscreen
    var enterFullScreenHandler = function (e) {

        if (!WMKS.UTIL.isFullscreenNow()) return;
        //make the wmks can occupy the whole screen
        self.wmks[0].style.cssText = "position:fixed; margin:0px; left:0px; top:0px; height:" +
            window.innerHeight + "px;" + "width:" + window.innerWidth + "px;";
        self.wmksData.rescaleOrResize(true);

        // $(window).off("resize.nwmks", enterFullScreenHandler);
        triggerEvents(WMKS.CONST.Events.FULL_SCREEN_CHANGE, e, {isFullScreen: true});
    };

    var exitFullScreenHandler = function (e) {

        $(window).off("resize.wmks", enterFullScreenHandler);

        self.wmks[0].style.cssText = self.oldCssText;
        self.wmksData.rescaleOrResize(true);

        $(window).off("resize.wmks", exitFullScreenHandler);
        triggerEvents(WMKS.CONST.Events.FULL_SCREEN_CHANGE, e, {isFullScreen: false});
    };

    this.fullScreenChangeEventStr = ["fullscreenchange",
        "webkitfullscreenchange",
        "mozfullscreenchange",
        "MSFullscreenChange"].join(" ");
     this.fullScreenChangeHandler = function(){
        if (!WMKS.UTIL.isFullscreenNow()) {
            $(window).off("resize.wmks", exitFullScreenHandler);
            $(window).on("resize.wmks", exitFullScreenHandler);
        }
    };
    $(document).on(this.fullScreenChangeEventStr, this.fullScreenChangeHandler);

    /************************************************************************
     * Public API
     ************************************************************************/
    // put the public API method enterFullScreen and exitFullScreen
    // here, cause need to trigger the FULL_SCREEN_CHANGE event
    WMKS.CoreWMKS.prototype.enterFullScreen = function () {

        if (WMKS.UTIL.isFullscreenNow() || !WMKS.UTIL.isFullscreenEnabled())
            return;
        this.oldCssText = wmks[0].style.cssText;
        console.log("old css is " + this.oldCssText);

        $(window).off("resize.wmks", enterFullScreenHandler);
        $(window).on("resize.wmks", enterFullScreenHandler);
        WMKS.UTIL.toggleFullScreen(true, wmks[0]);
    };


    WMKS.CoreWMKS.prototype.exitFullScreen = function () {

        if (!WMKS.UTIL.isFullscreenNow())
            return;

        $(window).on("resize.wmks", exitFullScreenHandler);
        WMKS.UTIL.toggleFullScreen(false);
    };

};

/************************************************************************
 * Public API
 ************************************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * register
 *
 *    Attach the handler to the certain event for WMKS widget.
 *    This can be called by consumers of WMKS to register  the
 *    events to interact with the guest.
 *
 *    @param eventType: [String] any value in WMKS.CONST.Events
 *
 *    @param handler: [Function] A function to execute each time
 *    the event is triggered.
 *
 * Results:
 *    the coreWMKS object itself, for call chain.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.register = function (eventType, handler) {

    if(!eventType || !handler) return;
    //here maybe need to validate the eventName
    var handlersArray = this.eventHandlers[eventType];
    if (!handlersArray) {
        handlersArray = this.eventHandlers[eventType] = [];
    }
    handlersArray.push(handler);
    return this;
};

/*
 *------------------------------------------------------------------------------
 *
 * unregister
 *
 *    Remove a previously-attached event handler for WMKS widget.
 *
 *    @param eventType: [String] any value in WMKS.CONST.Events
 *
 *    @param handler: [Function] The function that is to be no longer executed.
 *
 *    if the second parameter handler is empty, then would remove all the handlers
 *    corresponding to eventType.
 *    if no parameter, then would remove all the handlers.
 *
 * Results:
 *    the coreWMKS object itself, for call chain.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.unregister = function (eventType, handler) {
    if(!eventType && !handler)
    {
        this.eventHandlers = {};
        return this;
    }

    if(eventType && !handler)
    {
       delete  this.eventHandlers[eventType];
       return this;
    }

    var handlersArray = this.eventHandlers[eventType];
    if (handlersArray && handlersArray.length > 0) {
        var len = handlersArray.length;
        for (var i = 0; i < len; i++) {
            if (handlersArray[i] === handler) {
                handlersArray.splice(i, 1);
                break;
            }
        }
        if(handlersArray.length === 0)
            delete  this.eventHandlers[eventType];
    }
    return this;
};

/*
 *------------------------------------------------------------------------------
 *
 * getVersion
 *
 *    This method retrieves the current version number of the WMKS SDK.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.getVersion = function () {
    return WMKS.version;
};

/*
 *------------------------------------------------------------------------------
 *
 * getConnectionState
 *
 *    This method retrieves the current connection state. Could be any value in
 *    WMKS.CONST.ConnectionState
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.getConnectionState = function () {
    return this.connectionState;
};

//Lifecycle
/*
 *------------------------------------------------------------------------------
 *
 * connect
 *
 *    Connects the WMKS widget to a WebSocket URL.
 *
 *    Consumers should call this after they've created the WMKS by invoking the method
 *    createWMKS(), and then ready to start displaying a stream from the VM.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Connects to the server and sets up the WMKS UI.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.connect = function (url) {
    this.wmksData.connect(url);
};

/*
 *------------------------------------------------------------------------------
 *
 * disconnect
 *
 *    Disconnects the WMKS with the VM.
 *
 *    Consumers should call this when they are done with the WMKS
 *    component. Destroying the WMKS will also result in a disconnect.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Disconnects from the server and tears down the WMKS UI.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.disconnect = function () {
    this.wmksData.disconnect();
};

/*
 *------------------------------------------------------------------------------
 *
 * destroy
 *
 *    Destroys the WMKS widget.
 *
 *    This will disconnect the WMKS connection (if active) and remove
 *    the widget from the associated element.
 *
 *    Consumers should call this before removing the element from the DOM.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Disconnects from the server and removes the WMKS class and canvas
 *    from the HTML code.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.destroy = function () {
    if (this.wmksData) {
        clearTimeout(this.wmksData._vncDecoder.resolutionTimer);
        this.wmksData.destroy();
    }

    $(document).off(this.fullScreenChangeEventStr, this.fullScreenChangeHandler);
    $(window).off("resize.wmks");
    this.wmksData = null;
    this.wmks = null;
};

/*
 *------------------------------------------------------------------------------
 *
 * setRemoteScreenSize
 *
 *    This function could work if the option changeResolution is true and
 *    the server sends back a CAPS message indicating that it can handle
 *    resolution change requests.
 *
 *    It will send the request about desired resolution (both width and height)
 *    to the connect VM.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    It would not guarantee the request would success.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.setRemoteScreenSize = function (width, height) {
    this.wmksData.setRemoteScreenSize(width, height);
};

/*
 *------------------------------------------------------------------------------
 *
 * getRemoteScreenSize
 *
 *    This method retrieves the screen width and height in pixels of currently
 *    connected VM.
 *
 * Results:
 *    Object in format of {width:, height:}.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.getRemoteScreenSize = function () {

    return {width: this.wmksData._guestWidth, height: this.wmksData._guestHeight};
};

/*
 *------------------------------------------------------------------------------
 *
 * updateScreen
 *
 *    This method can be invoked if the size of WMKS widget container changed.
 *    The behavior of updateScreen depends on the option changeResolution,
 *    rescale and position:
 *    1) if the option changeResolution is true, it would send the change resolution
 *    request to the connected VM, the request resolution(width & height) is the
 *    same as the container's allocated size.
 *
 *    2) check rescale option: if true, rescale the remote screen to fit the
 *    container's allocated size.
 *
 *    3) check position option: If the remote screen's size is not same with
 *    the container's allocated size, then put the remote screen in the center
 *    or left top of the container based on its value.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates this._scale and modifies the canvas size and position.
 *    Possibly triggers a resolutionRequest message to the server.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.updateScreen = function () {
    this.wmksData.rescaleOrResize(true);
};

/*
 *---------------------------------------------------------------------------
 *
 * canFullScreen
 *
 *    Indicates if fullscreen feature is enabled on the browser.
 *
 *    Fullscreen mode is disabled on Safari as it does not support keyboard
 *    input in fullscreen for "security reasons". See bug 1296505.
 *
 * Results:
 *    Boolean, true mean can enter full screen.
 *
 *---------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.canFullScreen = function () {
    return WMKS.UTIL.isFullscreenEnabled();
};

/*
 *---------------------------------------------------------------------------
 *
 * isFullScreen
 *
 *    Inform if the browser is in full-screen mode.
 *
 *---------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.isFullScreen = function () {
    return WMKS.UTIL.isFullscreenNow();
};


/*
 *------------------------------------------------------------------------------
 *
 * sendInputString
 *
 *    Sends a unicode string as keyboard input to the server.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.sendInputString = function (str) {
    this.wmksData.sendInputString(str);
};

/*
 *------------------------------------------------------------------------------
 *
 * sendKeyCodes
 *
 *    Sends a series of special key codes to the VM.
 *
 *    This takes an array of special key codes and sends keydowns for
 *    each in the order listed. It then sends keyups for each in
 *    reverse order.
 *
 *    Keys usually handled via keyPress are also supported: If a keycode
 *    is negative, it is interpreted as a Unicode value and sent to
 *    keyPress. However, these need to be the final key in a combination,
 *    as they will be released immediately after being pressed. Only
 *    letters not requiring modifiers of any sorts should be used for
 *    the latter case, as the keyboardMapper may break the sequence
 *    otherwise. Mixing keyDown and keyPress handlers is semantically
 *    incorrect in JavaScript, so this separation is unavoidable.
 *
 *    This can be used to send key combinations such as
 *    Control-Alt-Delete, as well as Ctrl-V to the guest, e.g.:
 *    [17, 18, 46]      Control-Alt-Del
 *    [17, 18, 45]      Control-Alt-Ins
 *    [17, -118]        Control-v (note the lowercase 'v')
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends keyboard data to the server.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.sendKeyCodes = function (keyCodes) {
    this.wmksData.sendKeyCodes(keyCodes);
};

/*
 *------------------------------------------------------------------------------
 *
 * sendInputString
 *
 *    Send key combination Control-Alt-Del .
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.sendCAD = function () {
    this.wmksData.sendKeyCodes([17, 18, 46]);
};


/*
 *------------------------------------------------------------------------------
 * showKeyboard
 *
 *     This method used to show the keyboard on the mobile device
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.showKeyboard = function() {
    this.wmksData.showKeyboard();
};

/*
 *------------------------------------------------------------------------------
 * showKeyboard
 *
 *     This method used to hide the keyboard on the mobile device
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.hideKeyboard = function() {
    this.wmksData.hideKeyboard();
};

/*
 *------------------------------------------------------------------------------
 *
 * toggleExtendedKeypad
 *
 *    This method used to show/hide the extendedKeypad  on the mobile device
 *    depend on the current visibility.
 *
 *
 *    options: a map, could include minToggleTime(ms) such as {minToggleTime: 50}
 *    if the user try to call this toggle method too frequency, the duration less
 *    then the minToggleTime, it would not been excuted.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.toggleExtendedKeypad = function(options) {
    this.wmksData.toggleExtendedKeypad(options);
};

/*
 *------------------------------------------------------------------------------
 *
 * toggleTrackpad
 *
 *    This method used to show/hide the trackpad  on the mobile device
 *    depend on the current visibility.
 *
 *
 *    options: a map, could include minToggleTime(ms) such as {minToggleTime: 50}
 *    if the user try to call this toggle method too frequency, the duration less
 *    then the minToggleTime, it would not been excuted.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.toggleTrackpad = function(options) {
    this.wmksData.toggleTrackpad(options);
};


/*
 *------------------------------------------------------------------------------
 *
 * enableInputDevice
 *
 *    This method used to enable the input device on the mobile device according to
 *    the deviceType(any value in WMKS.CONST.InputDeviceType)
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.enableInputDevice = function (deviceType) {
    var cons = WMKS.CONST.InputDeviceType
    innerType = null;
    switch (deviceType) {
        case cons.KEYBOARD:
            this.wmksData.options.allowMobileKeyboardInput = true;
            innerType = WMKS.CONST.TOUCH.FEATURE.SoftKeyboard;
            break;
        case cons.EXTENDED_KEYBOARD:
            this.wmksData.options.allowMobileExtendedKeypad = true;
            innerType = WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad;
            break;
        case cons.TRACKPAD:
            this.wmksData.options.allowMobileTrackpad = true;
            innerType = WMKS.CONST.TOUCH.FEATURE.Trackpad;
            break;
    }
    if (innerType !== null) {
        this.wmksData._updateMobileFeature(false, innerType);
        this.wmksData._updateMobileFeature(true, innerType);
    }
};

/*
 *------------------------------------------------------------------------------
 *
 * disableInputDevice
 *
 *    This method used to disable the input device on the mobile device according to
 *    the deviceType(any value in WMKS.CONST.InputDeviceType)
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.disableInputDevice = function (deviceType) {
    var cons = WMKS.CONST.InputDeviceType;
    switch (deviceType) {
        case cons.KEYBOARD:
            this.wmksData.options.allowMobileKeyboardInput = false;
            this.wmksData._updateMobileFeature(false, WMKS.CONST.TOUCH.FEATURE.SoftKeyboard);
            break;
        case cons.EXTENDED_KEYBOARD:
            this.wmksData.options.allowMobileExtendedKeypad = false;
            this.wmksData._updateMobileFeature(false, WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad);
            break;
        case cons.TRACKPAD:
            this.wmksData.options.allowMobileTrackpad = false;
            this.wmksData._updateMobileFeature(false, WMKS.CONST.TOUCH.FEATURE.Trackpad);
            break;
    }
};

/*
 *------------------------------------------------------------------------------
 *
 * setOption
 *
 *    Changes a WMKS option.
 *
 *    Only these options changed in this way would have effect
 *    - rescale
 *    - position
 *    - changeResolution
 *	  - useNativePixels
 *    -	reverseScrollY
 *	  - fixANSIEquivalentKeys
 *	  - sendProperMouseWheelDeltas
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates the given option in this.options.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.setOption = function(key, value) {

    this.wmksData._setOption(key, value);
};
/*
 *------------------------------------------------------------------------------
 *
 * createWMKS
 *
 *    This is a factory method. It should be the first method when you use WMKS SDK.
 *    By using this method, it would generate the widget which could display the
 *    remote screen, and then return the WMKS core object which could use all the
 *    WMKS API to connect to a VM and perform operations.
 *
 *------------------------------------------------------------------------------
 */
WMKS.createWMKS = function (id, options) {
    var wmks = $("#" + id).nwmks(options);
    var coreAPI = new WMKS.CoreWMKS(wmks);

    return coreAPI;
};


WMKS.version = "1.0.0";
})();
