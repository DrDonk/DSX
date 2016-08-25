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
