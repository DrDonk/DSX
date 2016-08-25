/*
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
