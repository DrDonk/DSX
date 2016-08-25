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
