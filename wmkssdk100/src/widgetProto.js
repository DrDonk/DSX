
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
