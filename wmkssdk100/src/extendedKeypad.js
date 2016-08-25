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

}());