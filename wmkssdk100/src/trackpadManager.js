/*
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
