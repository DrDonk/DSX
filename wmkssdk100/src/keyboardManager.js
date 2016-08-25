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
