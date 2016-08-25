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
