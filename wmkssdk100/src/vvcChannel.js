'use strict';

/**
 * Use {@link VVCSession#openChannel} to create a channel.
 *
 * @classdesc  Represents a VVC channel which exposes a websocket-like API.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket}
 *
 * @constructor
 * @protected
 * @param {VVCSession} session  Session this channel belongs to.
 * @param {String}     name     Channel name.
 * @param {Number}     priority Channel priority.
 * @param {Number}     flags    Channel flags.
 * @param {Number}     timeout  Channel connect timeout.
 * @return {VVCChannel}
 */
var VVCChannel = function(session, id, name, priority, flags, timeout)
{
   /**
    * Channel id.
    * @type {Number}
    */
   this.id = id;

   /**
    * Channel name.
    * @type {String}
    */
   this.name = name;

   /**
    * Channel priority.
    * @type {Number}
    */
   this.priority = priority || 0;

   /**
    * Channel flags.
    * @type {Number}
    */
   this.flags = flags || 0;

   /**
    * Channel timeout.
    * @type {Number}
    */
   this.timeout = timeout || 0;

   /**
    * The protocol used by the channel, currently fixed to binary.
    * @type {String}
    */
   this.protocol = 'binary';

   /**
    * The current state of the channel.
    * @type {VVC.CHANNEL_STATE}
    */
   this.state = VVC.CHANNEL_STATE.INIT;

   /**
    * Callback for when the channel opens.
    * @type {VVCChannel~onopen?}
    */
   this.onopen = null;

   /**
    * Callback for when the channel closes.
    * @type {VVCChannel~onclose?}
    */
   this.onclose = null;

   /**
    * Callback for when there is an error on the channel.
    * @type {VVCChannel~onerror?}
    */
   this.onerror = null;

   /**
    * Callback for when a message is received on the channel.
    * @type {VVCChannel~onmessage?}
    */
   this.onmessage = null;

   /**
    * The session this channel belongs to.
    * @protected
    * @type {VVCSession}
    */
   this._session     = session;

   /**
    * The VVC instance this channel belongs to.
    * @protected
    * @type {VVC}
    */
   this._vvcInstance = session.vvcInstance;

   return this;
};


/**
 * VVCChannel state
 * @enum {Number}
 * @readonly
 */
VVC.CHANNEL_STATE = {
   INIT:         0,
   OPEN_FAILED:  1,
   OPEN:         2,
   CLOSING:      3,
   PEER_CLOSING: 4,
   PEER_CLOSED:  5,
   CLOSED:       6
};


/**
 * Sends data over a channel
 *
 * @param  {Uint8Array|ArrayBuffer} data    Data to send
 * @return {Boolean}                success True on success
 */
VVCChannel.prototype.send = function(data)
{
   return this._session.send(this, data);
};


/**
 * Closes this channel
 *
 * @return {Boolean} success True on success
 */
VVCChannel.prototype.close = function()
{
   return this._session.closeChannel(this);
};


/**
 * Called when the channel opens
 *
 * @callback VVCChannel~onopen
 * @param {Event} event
 */


/**
 * Called when the channel closes
 *
 * @callback VVCChannel~onclose
 * @param {CloseEvent} event
 */


/**
 * Called when there is an error with the channel
 *
 * @callback VVCChannel~onerror
 * @param {Event} event
 */


/**
 * Called when a message is received from the channel
 *
 * @callback VVCChannel~onmessage
 * @param {MessageEvent} event
 */
