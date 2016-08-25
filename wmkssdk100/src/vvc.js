'use strict';

/**
 * Creates a new VVC instance.
 *
 * @classdesc The root VVC instance which owns listeners and sessions.
 * @constructor
 * @protected
 * @return {VVC}
 */
var VVC = function()
{
   /**
    * Array of open sessions.
    * @type {VVCSession[]}
    */
   this._sessions = [];

   /**
    * Array of active listeners.
    * @type {VVCListener[]}
    */
   this._listeners = [];

   /**
    * The last error to occur within this VVC instance and all objects it owns.
    * @type {VVCError}
    */
   this._lastError = null;

   return this;
};


/**
 * Major version number.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MAJOR_VER = 1;


/**
 * Minor version number.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MINOR_VER = 0;


/**
 * Version 1 caps part 1.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CAPS_V10_1 = 0;


/**
 * Version 1 caps part 2.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CAPS_V10_2 = 0;


/**
 * Used for createListener to listen on all sessions.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.ALL_SESSIONS = -1;


/**
 * The maximum number of round trip times to remember.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.RTT_HISTORY_SIZE = 30;


/**
 * Minimum length of a channel name.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MIN_CHANNEL_NAME_LEN = 1;


/**
 * Maximum length of a channel name.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MAX_CHANNEL_NAME_LEN = 255;


/**
 * Maximum length of 'initialData'.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.MAX_INITIAL_DATA_LEN = 4096;


/**
 * VVC status codes.
 * @enum {Number}
 * @readonly
 */
VVC.STATUS = {
   SUCCESS:         0,
   ERROR:           1,
   OUT_OF_MEMORY:   2,
   INVALID_ARGS:    3,
   INVALID_STATE:   4,
   CLOSED:          5,
   PROTOCOL_ERROR:  6,
   TRANSPORT_ERROR: 7,
   OPEN_REJECTED:   8,
   OPEN_TIMEOUT:    9
};


/**
 * Creates a session object and wraps it around a WebSocket.
 *
 * @param  {WebSocket}   socket A valid connected WebSocket.
 * @return {?VVCSession}        The new VVCSession object.
 */
VVC.prototype.openSession = function(socket)
{
   var session;

   if (!(socket instanceof WebSocket)) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.openSession',
                         'Invalid socket, not instanceof WebSocket');
      return null;
   }

   session = new VVCSession(this);
   session.attachToWebSocket(socket);
   this._sessions.push(session);

   return session;
};


/**
 * Closes a session.
 *
 * @param  {VVCSession} session A valid open VVCSession.
 * @return {Boolean}            Returns true on success.
 */
VVC.prototype.closeSession = function(session)
{
   var index;

   if (!(session instanceof VVCSession)) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.closeSession',
                         'Invalid session, not instanceof VVCSession');
      return false;
   }

   if (session.state === VVC.SESSION_STATE.CLOSING) {
      return true;
   }

   index = this._sessions.indexOf(session);

   if (index === -1) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.closeSession',
                         'Invalid session, '
                         + 'session is not registered with this vvc instance');
      return false;
   }

   session.onSessionClose();
   this._sessions = this._sessions.splice(index, 1);
   return true;
};


/**
 * Creates a listener object.
 *
 * @param  {VVCSession|VVC.ALL_SESSIONS} session A valid open VVCSession.
 * @param  {String}                      name    Name of the new listener.
 * @return {?VVCListener}                        The new VVCListener object.
 */
VVC.prototype.createListener = function(session, name)
{
   var listener, sessionListeners, i;

   if (!(session instanceof VVCSession)) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.createListener',
                         'Invalid session: not an instanceof VVCSession');
      return null;
   }

   if (name.length < VVC.MIN_CHANNEL_NAME_LEN ||
       name.length > VVC.MAX_CHANNEL_NAME_LEN) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.createListener',
                         'Invalid name "' + name + '",'
                         + ' length must be between ' + VVC.MIN_CHANNEL_NAME_LEN
                         + ' and ' + VVC.MAX_CHANNEL_NAME_LEN
                         + ' characters.');
      return null;
   }

   sessionListeners = this._findSessionListeners(session);

   for (i = 0; i < sessionListeners.length; ++i) {
      if (sessionListeners[i].name === name) {
         this.setLastError(VVC.STATUS.INVALID_ARGS,
                            'VVC.createListener',
                            'Invalid name "' + name + '",'
                            + ' a listener on this session'
                            + ' with this name already exists.');
         return null;
      }
   }

   listener = new VVCListener(this, session, name);
   this._listeners.push(listener);
   return listener;
};


/**
 * Closes a VVC listener.
 *
 * @param  {VVCListener} listener A valid connected VVCListener.
 * @return {Boolean}              Returns true on success.
 */
VVC.prototype.closeListener = function(listener)
{
   var index = this._listeners.indexOf(listener);

   if (!(listener instanceof VVCListener)) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.closeListener',
                         'Invalid listener, not instanceof VVCListener');
      return false;
   }

   if (listener.state === VVC.LISTENER_STATE.CLOSING) {
      return true;
   }

   if (index === -1) {
      this.setLastError(VVC.STATUS.INVALID_ARGS,
                         'VVC.closeListener',
                         'Invalid listener, '
                         + 'listener is not registered with this vvc instance');
      return false;
   }

   if (listener.onclose) {
      listener.onclose();
   }

   this._listeners = this._listeners.splice(index, 1);
   return true;
};


/**
 * Finds a registered listener with a specific name.
 *
 * @protected
 * @param  {String}       name
 * @return {?VVCListener} listener
 */
VVC.prototype._findListenerByName = function(name)
{
   var listener, i;

   for (i = 0; i < this._listeners.length; ++i) {
      listener = this._listeners[i];

      if (listener.name === name) {
         return listener;
      }
   }

   return null;
};


/**
 * Finds all listeners for a session.
 *
 * @protected
 * @param  {VVCSession}    session
 * @return {VVCListener[]} listeners
 */
VVC.prototype._findSessionListeners = function(session)
{
   var listener, i, sessionListeners = [];

   for (i = 0; i < this._listeners.length; ++i) {
      listener = this._listeners[i];

      if (listener.session === VVC.ALL_SESSIONS ||
          listener.session === session) {
         sessionListeners.push(listener);
      }
   }

   return sessionListeners;
};


/**
 * Creates a new VVC Error object.
 *
 * @classdesc A container for a VVC error status.
 *
 * @constructor
 * @private
 * @param {VVC.STATUS} status The VVC status code.
 * @param {String} where      What function the error occurred in.
 * @param {String} msg        A description of the error.
 * @return {VVCError}
 */
var VVCError = function(status, where, msg)
{
   /**
    * The VVC status code.
    * @type {VVC.STATUS}
    */
   this.status = status;

   /**
    * What function the error occurred in.
    * @type {String}
    */
   this.where = where;

   /**
    * A description of what caused the error.
    * @type {String}
    */
   this.msg = msg;

   return this;
};


/**
 * Returns the last error to occur within this VVC instance and all objects
 * that it owns.
 *
 * @return {VVCError?} error
 */
VVC.prototype.getLastError = function()
{
   return this._lastError;
};


/**
 * Sets the last error.
 * Also will output the error to console.
 *
 * @protected
 * @param {VVC.STATUS} status The VVC status code.
 * @param {String} where      What function the error occurred in.
 * @param {String} msg        A full description of the error.
 */
VVC.prototype.setLastError = function(status, where, msg)
{
   this._lastError = new VVCError(status, where, msg);

   if (status !== VVC.STATUS.SUCCESS) {
      console.error(where + ': ' + msg);
   }
};
