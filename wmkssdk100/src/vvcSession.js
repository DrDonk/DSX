'use strict';

/**
 * Use {@link VVC#openSession} to create a session.
 *
 * @classdesc A VVC session represents a physical connection to a remote server
 *
 * @constructor
 * @protected
 * @param {VVC}    vvcInstance The owner VVC instance
 * @param {Object} options     Optional settings
 * @return {VVCSession}
 */
var VVCSession = function(vvcInstance, options)
{
   var server = false;

   if (options) {
      if ('server' in options) {
         server = options.server;
      }
   }

   /**
    * The current state of the session.
    * @type {VVC.SESSION_STATE}
    */
   this.state = VVC.SESSION_STATE.INIT;

   /**
    * Callback for when an error occurs on the session.
    * @type {VVCSession~onerror?}
    */
   this.onerror = null;

   /**
    * Callback for when the transport closes.
    * @type {VVCSession~ontransportclose?}
    */
   this.ontransportclose = null;

   /**
    * Callback for when there is an error on the transport.
    * @type {VVCSession~ontransporterror?}
    */
   this.ontransporterror = null;

   /**
    * The VVC instance this session belongs to.
    * @private
    * @type {VVC}
    */
   this._vvcInstance     = vvcInstance;

   /**
    * Is this session a server or client.
    * @private
    * @type {Boolean}
    */
   this._server          = server;

   /**
    * The channels opened on this session.
    * @private
    * @type {VVCChannel[]}
    */
   this._channels        = [];

   /**
    * Used for unique channel id generation, always an odd or even number
    * depending on whether we are server or client respectively.
    * @private
    * @type {Number}
    */
   this._channelIdCtrl   = this._server ? 1 : 2;

   /**
    * Bytes read of current chunk.
    * @private
    * @type {Number}
    */
   this._bytesRead       = 0;

   /**
    * Bytes requested of current chunk.
    * @private
    * @type {Number}
    */
   this._bytesRequested  = VVC.CHUNK_COMMON_HEADER_SIZE;

   /**
    * History of round trip times, limited to VVC.RTT_HISTORY_SIZE.
    * @private
    * @type {Number[]}
    */
   this._rttHistory      = [];

   /**
    * Current index used for the circular buffer of VVCSession._rttHistory.
    * @private
    * @type {Number[]}
    */
   this._rttHistoryIndex = 0;

   /**
    * Current read chunk.
    * @private
    * @type {Object}
    */
   this._chunk = {};
   this._chunk.channel = 0;
   this._chunk.flags   = 0;
   this._chunk.length  = 0;
   this._chunk.ext = {};
   this._chunk.ext.code   = 0;
   this._chunk.ext.flags  = 0;
   this._chunk.ext.param  = 0;
   this._chunk.ext.length = 0;

   /**
    * Reusable buffers for reading and writing.
    * @private
    * @type {Object}
    */
   this._buffers = {};
   this._buffers.ext = null;
   this._buffers.data = [];
   this._buffers.send = WMKS.Packet.createNewPacket(32);
   this._buffers.header = WMKS.Packet.createNewPacket(VVC.CHUNK_COMMON_HEADER_SIZE +
                                                      VVC.CHUNK_LARGE_HEADER_SIZE +
                                                      VVC.CHUNK_EXTENSION_HEADER_SIZE);

   /**
    * The current receive state.
    * @private
    * @type {VVC.SESSION_RECEIVE_STATE}
    */
   this._receiveState = VVC.SESSION_RECEIVE_STATE.COMMON_HEADER;
   this._setReceiveState(VVC.SESSION_RECEIVE_STATE.COMMON_HEADER);

   return this;
};


/**
 * Size of the COMMON chunk header.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_COMMON_HEADER_SIZE = 4;


/**
 * Size of the LARGE chunk header.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_LARGE_HEADER_SIZE = 4;


/**
 * Size of the EXTENSION chunk header.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_EXTENSION_HEADER_SIZE = 4;


/**
 * Maximum COMMON chunk data length.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_MAX_LEN = 0x00010000;


/**
 * Maximum LARGE chunk data length.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CHUNK_LARGE_MAX_LEN = 0xfffffc00;


/**
 * VVCSession state
 * @enum {Number}
 * @readonly
 */
VVC.SESSION_STATE = {
   INIT:        0,
   ESTABLISHED: 1,
   ERROR:       2,
   CLOSING:     3
};


/**
 * VVCSession receive state
 * @enum {Number}
 * @readonly
 */
VVC.SESSION_RECEIVE_STATE = {
   COMMON_HEADER:    0,
   LARGE_HEADER:     1,
   EXTENSION_HEADER: 2,
   EXTENSION_DATA:   3,
   DATA:             4
};


/**
 * Chunk header flags
 * @enum {Number}
 * @readonly
 */
VVC.CHUNK_FLAG = {
   /** Chunk and extension data are padded to a multiple of 4 */
   PAD: 0x10,
   /** Extension header is present */
   EXT: 0x20,
   /** Large chunk data length is present */
   LC:  0x40,
   /** Indicates last chunk in a message */
   FIN: 0x80
};


/**
 * Chunk extension header flags
 * @enum {Number}
 * @readonly
 */
VVC.CHUNK_EXT_FLAG = {
   /** Extension data is present */
   EDAT: 0x80
};


/**
 * Closes the session
 *
 * @return {Boolean} Returns true on success
 */
VVCSession.prototype.close = function()
{
   return this._vvcInstance.closeSession(this);
};


/**
 * Opens a channel on this session
 *
 * @param  {String}      name          Name of the channel to open
 * @param  {Number}      [priority]    Priority of the channel
 * @param  {Number}      [flags]       Channel flags
 * @param  {Number}      [timeout]     Channel timeout
 * @param  {Uint8Array}  [initialData] Data to send with the open request
 * @return {?VVCChannel}               A VVCChannel object, or null on error.
 */
VVCSession.prototype.openChannel = function(name,
                                            priority,
                                            flags,
                                            timeout,
                                            initialData)
{
   var channel;

   priority    = priority || 0;
   flags       = flags || 0;
   timeout     = timeout || 0;
   initialData = initialData || null;

   if (!this._checkErrorNameLength('openChannel', name)) {
      return null;
   }

   if (!this._checkErrorSessionState('openChannel',
                                     VVC.SESSION_STATE.ESTABLISHED)) {
      return null;
   }

   if (!this._checkErrorInitialData('openChannel', initialData)) {
      return null;
   }

   channel = this.createChannel(this._nextChannelId(),
                                name,
                                priority,
                                flags,
                                timeout);

   this.controlChannel.sendOpenChannel(channel, initialData);
   return channel;
};


/**
 * Accepts a channel on this session
 *
 * @param  {VVCChannel}  channel       The channel provided by onpeeropen
 * @param  {Number}      [flags]       Accept channel flags
 * @param  {Uint8Array}  [initialData] Data to send with the accept message
 * @return {?VVCChannel}               A VVCChannel object, or null on error.
 */
VVCSession.prototype.acceptChannel = function(channel,
                                              flags,
                                              initialData)
{
   flags       = flags || 0;
   initialData = initialData || null;

   if (!this._checkErrorSessionState('acceptChannel',
                                     VVC.SESSION_STATE.ESTABLISHED)) {
      return null;
   }

   if (!this._checkErrorInitialData('acceptChannel', initialData)) {
      return null;
   }

   if (!this._checkErrorIsChannel('acceptChannel', channel)) {
      return null;
   }

   this.controlChannel.sendOpenChannelAck(channel,
                                          VVC.OPEN_CHAN_STATUS.SUCCESS,
                                          initialData);

   this.onChannelOpen(channel,
                      VVC.OPEN_CHAN_STATUS.SUCCESS,
                      channel.initialData);

   delete channel.initialData;
   return channel;
};


/**
 * Rejects a channel open request
 *
 * @param  {VVCChannel} channel       The channel to reject opening
 * @param  {Uint8Array} [initialData] Data to send with the reject channel op
 * @return {Boolean}                  Returns true on succes
 */
VVCSession.prototype.rejectChannel = function(channel, initialData)
{
   initialData = initialData || null;

   if (!this._checkErrorSessionState('rejectChannel',
                                     VVC.SESSION_STATE.ESTABLISHED)) {
      return false;
   }

   if (!this._checkErrorInitialData('rejectChannel', initialData)) {
      return false;
   }

   if (!this._checkErrorIsChannel('rejectChannel', channel)) {
      return false;
   }

   this.controlChannel.sendOpenChannelAck(channel,
                                          VVC.OPEN_CHAN_STATUS.REJECT,
                                          initialData);

   channel.state = VVC.CHANNEL_STATE.CLOSED;
   this._releaseChannel(channel);
   return true;
};


/**
 * Closes a channel
 *
 * @param  {VVCChannel} channel A valid VVCChannel to close
 * @return {Boolean}            Returns true on success
 */
VVCSession.prototype.closeChannel = function(channel)
{
   if (!this._checkErrorSessionState('closeChannel',
                                     VVC.SESSION_STATE.ESTABLISHED)) {
      return false;
   }

   if (!this._checkErrorIsChannel('closeChannel', channel)) {
      return false;
   }

   if (!this._checkErrorChannelState('closeChannel', channel,
                                     VVC.CHANNEL_STATE.OPEN)) {
      return false;
   }

   channel.state = VVC.CHANNEL_STATE.CLOSING;
   this.controlChannel.sendCloseChannel(channel, VVC.CLOSE_CHAN_REASON.NORMAL);
   return true;
};


/**
 * Add a RTT time to our circular buffer history.
 *
 * @protected
 * @param {Number} rttMS
 */
VVCSession.prototype.addRttTime = function(rttMS)
{
   this._rttHistory[this._rttHistoryIndex] = rttMS;
   this._rttHistoryIndex++;

   if (this._rttHistoryIndex >= VVC.RTT_HISTORY_SIZE) {
      this._rttHistoryIndex = 0;
   }
};


/**
 * Attaches the session to a websocket.
 * Modifies the websocket's callbacks to point to our internal functions.
 * Sets the websocket's binary type to ArrayBuffer.
 *
 * @protected
 * @param  {VVCChannel} channel A valid VVCChannel to close
 * @return {Boolean}            Returns true on success
 */
VVCSession.prototype.attachToWebSocket = function(socket)
{
   var self = this;

   if (!(socket instanceof WebSocket)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.attachToWebSocket',
                                     'Invalied socket,'
                                     + ' must be instanceof WebSocket');
      return false;
   }

   this.socket = socket;

   socket.onopen = function(evt) {
      this.binaryType = 'arraybuffer';
      self._onTransportOpen();
   };

   socket.onclose = function(evt) {
      self._onTransportClose(evt);
   };

   socket.onerror = function(evt) {
      self._onTransportError(evt);
   };

   socket.onmessage = function(evt) {
      if (!(evt.data instanceof ArrayBuffer)) {
         throw 'Expected ArrayBuffer from websocket';
      }

      self._onTransportRecv(new Uint8Array(evt.data));
   };

   // If socket is already open lets fake call onopen to start our session
   if (socket.readyState) {
      socket.onopen({});
   }

   return true;
};


/**
 * Generates an id value for a new channel.
 *
 * @private
 * @return {Number} New channel id
 */
VVCSession.prototype._nextChannelId = function()
{
   var id = this._channelIdCtrl;
   this._channelIdCtrl += 2;
   return id;
};


/**
 * Creates a VVCChannel object and adds it to the channel list.
 *
 * @protected
 * @param  {Number}     id
 * @param  {String}     name
 * @param  {Number}     [priority]
 * @param  {Number}     [flags]
 * @param  {Number}     [timeout]
 * @return {VVCChannel}
 */
VVCSession.prototype.createChannel = function(id,
                                              name,
                                              priority,
                                              flags,
                                              timeout)
{
   var channel;

   priority = priority || 0;
   timeout  = timeout || 0;
   flags    = flags || 0;

   channel = new VVCChannel(this, id, name, priority, flags, timeout);
   this._channels[id] = channel;
   this._buffers.data[id] = [];
   return channel;
};


/**
 * Removes a channel from this session
 *
 * @private
 * @param  {VVCChannel} channel
 */
VVCSession.prototype._releaseChannel = function(channel)
{
   if (channel.state === VVC.CHANNEL_STATE.OPEN) {
      this._vvcInstance.setLastError(VVC.STATUS.PROTOCOL_ERROR,
                                     'VVCSession._releaseChannel',
                                     'Releasing an open channel!');
   }

   delete this._channels[channel.id];
   delete this._buffers.data[channel.id];
};


/**
 * Gets a channel by id
 *
 * @protected
 * @param  {Number}      id      Channel ID
 * @return {?VVCChannel} channel
 */
VVCSession.prototype.getChannel = function(id)
{
   if (!!this._channels[id]) {
      return this._channels[id];
   }

   return null;
};


/**
 * Called when there is a error within the session.
 * Triggers the session.onerror callback.
 *
 * @protected
 * @param {VVC.STATUS} status  Error status code
 * @param {String}     where   Where the error occurred
 * @param {String}     message A hopefully useful description of error
 */
VVCSession.prototype.onSessionError = function(status, where, message)
{
   this.state = VVC.SESSION_STATE.ERROR;
   this._vvcInstance.setLastError(status, where, message);

   if (this.onerror) {
      this.onerror(status);
   }
};


/**
 * Called when the session is closed.
 * Closes all open channels and calls either channel.onerror or channel.onclose
 *
 * @protected
 */
VVCSession.prototype.onSessionClose = function()
{
   var channel, closeChanReason, i;

   if (this.state === VVC.SESSION_STATE.ERROR) {
      closeChanReason = VVC.CLOSE_CHAN_REASON.ERROR;
   } else {
      closeChanReason = VVC.CLOSE_CHAN_REASON.NORMAL;
   }

   this.state = VVC.SESSION_STATE.CLOSING;
   this.socket.close();

   for (i = 0; i < this._channels.length; ++i) {
      channel = this._channels[i];

      if (channel) {
         if (channel.state === VVC.CHANNEL_STATE.INIT) {
            this.onChannelOpen(channel, VVC.STATUS.ERROR);
         } else if (channel.state === VVC.CHANNEL_STATE.OPEN
                 || channel.state === VVC.CHANNEL_STATE.CLOSING) {
            channel.state = VVC.CHANNEL_STATE.CLOSING;
            this.onChannelClose(channel, closeChanReason);
         }
      }
   }
};


/**
 * Called when the control channel receives an INIT or INIT_ACK message.
 * Triggers the listener.onconnect callback.
 *
 * @protected
 */
VVCSession.prototype.onConnect = function()
{
   var i, listener, listeners;

   listeners = this._vvcInstance._findSessionListeners(this);
   this.state = VVC.SESSION_STATE.ESTABLISHED;

   for (i = 0; i < listeners.length; ++i) {
      listener = listeners[i];

      if (listener.onconnect) {
         listener.onconnect(this);
      }
   }
};


/**
 * Called when the control channel receives an OPEN_CHAN message.
 * Triggers the listener.onpeeropen callback.
 *
 * @protected
 * @param {VVCChannel} channel The new channel being opened
 */
VVCSession.prototype.onPeerOpen = function(channel)
{
   var i, listener, listeners;

   listeners = this._vvcInstance._findSessionListeners(this);

   for (i = 0; i < listeners.length; ++i) {
      listener = listeners[i];

      if (listener.matchName(channel.name)) {
         if (listener.onpeeropen) {
            listener.onpeeropen(this, channel);
         }
      }
   }
};


/**
 * Called when the control channel receives an OPEN_CHAN_ACK message.
 * Triggers the channel.onopen callback.
 *
 * @protected
 * @param {VVCChannel}           channel     The new channel being opened
 * @param {VVC.OPEN_CHAN_STATUS} status      The status of the open
 * @param {Uint8Array?}          initialData Data that came with the open msg
 */
VVCSession.prototype.onChannelOpen = function(channel, status, initialData)
{
   if (status === VVC.OPEN_CHAN_STATUS.SUCCESS) {
      channel.state = VVC.CHANNEL_STATE.OPEN;
      if (channel.onopen) {
         channel.onopen(this._createEvent('open', { data: initialData }));
      }
   } else {
      channel.state = VVC.CHANNEL_STATE.OPEN_FAILED;
      this._releaseChannel(channel);
      this.onChannelError(channel);
   }
};


/**
 * Called when an error occurs on a channel.
 * Triggers the channel.onerror callback.
 *
 * @protected
 * @param {VVCChannel} channel The channel which had the error
 */
VVCSession.prototype.onChannelError = function(channel)
{
   if (channel.onerror) {
      channel.onerror(this._createEvent('error'));
   }
};


/**
 * Called when a channel receives a message.
 * Triggers the channel.onmessage callback.
 *
 * @protected
 * @param {VVCChannel} channel The channel receiving the message
 * @param {ArrayBuffer} data   The message data
 */
VVCSession.prototype.onChannelMessage = function(channel, data)
{
   if (!channel) {
      this.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                          'VVCSession.onChannelMessage',
                          'Unknown channel in chunk');
      return;
   }

   if (channel.onmessage) {
      channel.onmessage(this._createEvent('message', { data: data }));
   }
};


/**
 * Called when the control channel receives an CLOSE_CHAN or CLOSE_CHAN_ACK.
 * Triggers the channel.onclose callback.
 * Removes the channel from the session's channel list.
 *
 * @protected
 * @param {VVCChannel}            channel The channel being close
 * @param {VVC.CLOSE_CHAN_REASON} reason  The reason for closing
 */
VVCSession.prototype.onChannelClose = function(channel, reason)
{
   var code;

   if (reason === VVC.CLOSE_CHAN_REASON.NORMAL) {
      code = 1000; // WebSocket 'normal close'

      if (channel.state === VVC.CHANNEL_STATE.CLOSING) {
         channel.state = VVC.CHANNEL_STATE.PEER_CLOSED;
      } else {
         channel.state = VVC.CHANNEL_STATE.PEER_CLOSING;
         this.controlChannel.sendCloseChannelAck(channel, VVC.CLOSE_CHAN_STATUS.SUCCESS);
      }
   } else {
      code = 1002; // WebSocket 'protocol error'
   }

   if (channel.onclose) {
      channel.onclose(this._createEvent('close', {
         wasClean: (reason === VVC.CLOSE_CHAN_REASON.NORMAL),
         reason: reason,
         code: code
      }));
   }

   channel.state = VVC.CHANNEL_STATE.CLOSED;
   this._releaseChannel(channel);
};


/**
 * Called when the transport opens.
 * @private
 */
VVCSession.prototype._onTransportOpen = function()
{
   // Create a channel with our control channel id & name
   this.controlChannel = this.createChannel(VVC.CONTROL_CHANNEL_ID,
                                            VVC.CONTROL_CHANNEL_NAME);

   // Wrap it in our custom VVCControlChannel object
   this.controlChannel = new VVCControlChannel(this.controlChannel);

   // It is the clients responsibility to send the first control init message
   if (!this._server) {
      this.controlChannel.sendInit(VVC.CTRL_OP.INIT);
   }
};


/**
 * Called when the transport closes.
 * @private
 */
VVCSession.prototype._onTransportClose = function(evt)
{
   if (this.state === VVC.SESSION_STATE.ESTABLISHED) {
      this.onSessionError(VVC.TRANSPORT_ERROR,
                          'VVCSession._onTransportClose',
                          'The WebSocket closed whilst the session was open.');
   }

   if (this.ontransportclose) {
      this.ontransportclose(evt);
   }
};


/**
 * Called when the transport errors.
 * @private
 */
VVCSession.prototype._onTransportError = function(evt)
{
   this.onSessionError(VVC.TRANSPORT_ERROR,
                       'VVCSession._onTransportError',
                       'An error occurred in the WebSocket.');

   if (this.ontransporterror) {
      this.ontransporterror(evt);
   }
};


/**
 * Combines multiple Uint8Array into a single ArrayBuffer.
 *
 * @private
 * @param  {Uint8Array[]} buffers  The split multiple Uint8Array buffers.
 * @return {ArrayBuffer}  combined The combined single ArrayBuffer
 */
VVCSession.prototype._combineBuffers = function(buffers)
{
   var array, buffer, i, size;

   if (buffers.length === 0) {
      return null;
   }

   size = 0;

   for (i = 0; i < buffers.length; ++i) {
      size += buffers[i].length;
   }

   buffer = new ArrayBuffer(size);
   array  = new Uint8Array(buffer);
   size   = 0;

   for (i = 0; i < buffers.length; ++i) {
      array.set(buffers[i], size);
      size += buffers[i].length;
   }

   return buffer;
};


/**
 * Sets the next receive state.
 * Asks for the appropriate amount of bytes to be read from transport.
 *
 * @private
 * @param  {VVC.SESSION_RECEIVE_STATE} state The next receive state
 */
VVCSession.prototype._setReceiveState = function(state)
{
   this._receiveState = state;

   switch(state) {
      case VVC.SESSION_RECEIVE_STATE.COMMON_HEADER:
         this._bytesRequested = VVC.CHUNK_COMMON_HEADER_SIZE;
         this._bytesRead = 0;
         this._buffers.header.reset();
         break;
      case VVC.SESSION_RECEIVE_STATE.LARGE_HEADER:
         this._bytesRequested += VVC.CHUNK_LARGE_HEADER_SIZE;
         break;
      case VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER:
         this._bytesRequested += VVC.CHUNK_EXTENSION_HEADER_SIZE;
         break;
      case VVC.SESSION_RECEIVE_STATE.EXTENSION_DATA:
         this._bytesRequested += this._chunk.ext.length;
         break;
      case VVC.SESSION_RECEIVE_STATE.DATA:
         this._bytesRequested += this._chunk.length;
         break;
   }
};


/**
 * Called when the underlying transport receives data.
 * Reads the chunk headers and forwards messages to the correct channel.
 *
 * @private
 * @param  {Uint8Array} data The raw binary data from the transport.
 */
VVCSession.prototype._onTransportRecv = function(data)
{
   var buffer, bytesNeeded, bytesRead, dataRead;

   bytesNeeded = this._bytesRequested - this._bytesRead;
   bytesRead   = Math.min(data.length, bytesNeeded);
   dataRead    = data.subarray(0, bytesRead);
   buffer      = null;

   switch(this._receiveState) {
   case VVC.SESSION_RECEIVE_STATE.COMMON_HEADER:
   case VVC.SESSION_RECEIVE_STATE.LARGE_HEADER:
   case VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER:
      buffer = this._buffers.header;
      break;
   case VVC.SESSION_RECEIVE_STATE.EXTENSION_DATA:
      buffer = this._buffers.ext;
      break;
   case VVC.SESSION_RECEIVE_STATE.DATA:
      this._buffers.data[this._chunk.channel].push(dataRead);

      if (this._chunk.channel !== VVC.CONTROL_CHANNEL_ID && bytesRead) {
         this.controlChannel.sendRecvAck(bytesRead);
      }
      break;
   }

   if (buffer) {
      buffer.writeArray(dataRead);
   }

   this._bytesRead += bytesRead;

   if (data.length < bytesNeeded) {
      return;
   }

   switch (this._receiveState) {
   case VVC.SESSION_RECEIVE_STATE.COMMON_HEADER:
      this._chunk.channel = buffer.readUint8();
      this._chunk.flags   = buffer.readUint8();
      this._chunk.length  = buffer.readUint16() + 1;

      if (this._chunk.flags & VVC.CHUNK_FLAG.LC) {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.LARGE_HEADER);
      } else if (this._chunk.flags & VVC.CHUNK_FLAG.EXT) {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER);
      } else {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.DATA);
      }
      break;
   case VVC.SESSION_RECEIVE_STATE.LARGE_HEADER:
      this._chunk.length = buffer.readUint32() + 1;

      if (this._chunk.flags & VVC.CHUNK_FLAG.EXT) {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER);
      } else {
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.DATA);
      }
      break;
   case VVC.SESSION_RECEIVE_STATE.EXTENSION_HEADER:
      this._chunk.ext.code  = buffer.readUint8();
      this._chunk.ext.flags = buffer.readUint8();
      this._chunk.ext.param = buffer.readUint16();

      if (this._chunk.ext.flags & VVC.CHUNK_EXT_FLAG.EDAT) {
         this._chunk.ext.length = this._chunk.ext.param + 1;
         this._buffers.ext = new WMKS.Packet.createNewPacket(this._chunk.ext.length);
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.EXTENSION_DATA);
      } else {
         this._chunk.ext.length = 0;
         this._setReceiveState(VVC.SESSION_RECEIVE_STATE.DATA);
      }
      break;
   case VVC.SESSION_RECEIVE_STATE.EXTENSION_DATA:
      this._buffers.ext = null;
      this._setReceiveState(VVC.SESSION_RECEIVE_STATE.DATA);
      break;
   case VVC.SESSION_RECEIVE_STATE.DATA:
      if (this._chunk.flags & VVC.CHUNK_FLAG.FIN) {
         buffer = this._combineBuffers(this._buffers.data[this._chunk.channel]);
         this.onChannelMessage(this._channels[this._chunk.channel], buffer);
         this._buffers.data[this._chunk.channel] = [];
      }

      this._setReceiveState(VVC.SESSION_RECEIVE_STATE.COMMON_HEADER);
      break;
   }

   if (data.length > bytesRead) {
      this._onTransportRecv(data.subarray(bytesRead));
   }
};


/**
 * Send data on a channel.
 * Constructs the appropriate chunk header.
 *
 * @protected
 * @param  {VVCChannel}             channel The channel to send data on
 * @param  {Uint8Array|ArrayBuffer} data    The data to send
 * @return {Boolean}                        Returns true on succesful send.
 */
VVCSession.prototype.send = function(channel, data)
{
   var header, flags, length;

   if (!this._checkErrorIsChannel('send', channel)) {
      return false;
   }

   if (!this._checkErrorChannelState('send', channel,
                                     VVC.CHANNEL_STATE.OPEN)) {
      return false;
   }

   if (!(data instanceof Uint8Array) && !(data instanceof ArrayBuffer)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.send',
                                     'Invalid data, must be Uint8Array'
                                     + ' or ArrayBuffer');
      return false;
   }

   header = this._buffers.send;
   header.reset();
   header.writeUint8(channel.id);

   length = data.byteLength;
   flags  = VVC.CHUNK_FLAG.FIN;

   if (length > VVC.CHUNK_MAX_LEN) {
      header.writeUint8(VVC.CHUNK_FLAG.LC | flags);
      header.writeUint16(0);
      header.writeUint32(length - 1);
   } else {
      header.writeUint8(flags);
      header.writeUint16(length - 1);
   }

   this.socket.send(header.getData());
   this.socket.send(data);
   return true;
};


/**
 * Creates an Event object.
 *
 * Needed because Internet Explorer does not allow new Event();
 *
 * @private
 * @param {String} name       The event name
 * @param {Object} properties Properties to copy to the event
 * @return {Event}            Returns newly constructed event
 */
VVCSession.prototype._createEvent = function(name, properties)
{
   var evt = document.createEvent('Event');
   evt.initEvent(name, false, false);

   for (var key in properties) {
      evt[key] = properties[key];
   }

   return evt;
};


/**
 * Returns false and sets an error if the provided object is not a channel.
 * object must be instanceof VVCChannel
 *
 * @private
 * @param  {String}  func   Function name for error logging
 * @param  {Object}  object Object to check type of
 * @return {Boolean}        Returns true if object is a VNCChannel
 */
VVCSession.prototype._checkErrorIsChannel = function(func, object)
{
   if (!(object instanceof VVCChannel)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.' + func,
                                     'Invalid channel,'
                                      + ' must be instanceof VVCChannel');
      return false;
   }

   return true;
};


/**
 * Returns false and sets an error if the session state is not a value.
 *
 * @private
 * @param  {String}            func  Function name for error logging
 * @param  {VVC.SESSION_STATE} state State the session must be in
 * @return {Boolean}                 Returns true if state is correct
 */
VVCSession.prototype._checkErrorSessionState = function(func, state)
{
   if (this.state !== state) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_STATE,
                                     'VVCSession.' + func,
                                     'Invalid state ' + this.state
                                     + ' expected ' + state);
      return false;
   }

   return true;
};


/**
 * Returns false and sets an error if the channel state is not a value.
 *
 * @private
 * @param  {String}            func    Function name for error logging
 * @param  {VVCChannel}        channel The channel for which state to check
 * @param  {VVC.SESSION_STATE} state   State the session must be in
 * @return {Boolean}                   Returns true if state is correct
 */
VVCSession.prototype._checkErrorChannelState = function(func, channel, state)
{
   if (channel.state !== state) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_STATE,
                                     'VVCSession.' + func,
                                     'Invalid state ' + channel.state
                                     + ' expected ' + state);
      return false;
   }

   return true;
};


/**
 * Returns false and sets an error if the length of name is invalid.
 * name must be between VVC.MIN_CHANNEL_NAME_LEN and VVC.MAX_CHANNEL_NAME_LEN.
 *
 * @private
 * @param  {String}  func Function name for error logging
 * @param  {String}  name Name to check
 * @return {Boolean}      Returns true if name length is valid
 */
VVCSession.prototype._checkErrorNameLength = function(func, name)
{
   if (name.length < VVC.MIN_CHANNEL_NAME_LEN ||
       name.length > VVC.MAX_CHANNEL_NAME_LEN) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.' + func,
                                     'Invalid name ' + name
                                     + ' length must be between '
                                     + VVC.MIN_CHANNEL_NAME_LEN + ' and '
                                     + VVC.MAX_CHANNEL_NAME_LEN + ' bytes');
      return false;
   }

   return true;
};


/**
 * Returns false and sets an error if the initialData is invalid.
 * initialData must be a Uint8Array smaller than VVC.MAX_INITIAL_DATA_LEN.
 *
 * @private
 * @param  {String}     func        Function name for error logging
 * @param  {Uint8Array} initialData Data to check
 * @return {Boolean}                Returns true if initialData is valid
 */
VVCSession.prototype._checkErrorInitialData = function(func, initialData)
{
   if (initialData && !(initialData instanceof Uint8Array)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.' + func,
                                     'Invalid initial data,'
                                      + ' must be instanceof Uint8Array');
      return false;
   }

   if (initialData && initialData.length > VVC.MAX_INITIAL_DATA_LEN) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                     'VVCSession.' + func,
                                     'Invalid initial data,'
                                      + ' must be smaller than '
                                      + VVC.MAX_INITIAL_DATA_LEN + ' bytes');
      return false;
   }

   return true;
};


/**
 * Called when there is an error with the channel.
 * @callback VVCSession~onerror
 */


/**
 * Called when the transport closes.
 * @callback VVCSession~ontransportclose
 * @param {Event} event
 */


/**
 * Called when there is an error on the transport.
 * @callback VVCSession~ontransporterror
 * @param {Event} event
 */
