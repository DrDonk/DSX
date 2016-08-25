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
