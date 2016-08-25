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
