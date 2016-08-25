'use strict';

/**
 * This is only to be created by a VVCSession.
 *
 * @classdesc The control channel created and owned by a VVCSession.
 *
 * @constructor
 * @protected
 * @extends {VVCChannel}
 * @param {VVCChannel} channel The VVCChannel to wrap
 * @return {VVCControlChannel}
 */
var VVCControlChannel = function(channel)
{
   /**
    * The current rtt ping send time.
    * @type {Number}
    */
   this._rttSendTimeMS = 0;

   // The control channel's initial state is open!
   this.state = VVC.CHANNEL_STATE.OPEN;

   return $.extend(channel, this);
};


/**
 * Size of CTRL header.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CTRL_HEADER_SIZE = 4;


/**
 * Control channel id.
 *
 * @type {Number}
 * @readonly
 * @default
 */
VVC.CONTROL_CHANNEL_ID = 0;


/**
 * Control channel name.
 *
 * @type {String}
 * @readonly
 * @default
 */
VVC.CONTROL_CHANNEL_NAME = 'vvcctrl';


/**
 * Control channel message opcodes.
 * @enum {Number}
 * @readonly
 */
VVC.CTRL_OP = {
   /** Receive acknowledgement, used for bandwidth estimation */
   RECV_ACK:             0x01,

   /** Initiate VVC, first op sent from client to server */
   INIT:                 0x02,

   /** Initiate VVC acknowledgement */
   INIT_ACK:             0x03,

   /** Open channel */
   OPEN_CHAN:            0x04,

   /** Open channel acknowledgement */
   OPEN_CHAN_ACK:        0x05,

   /** Open channel cancel */
   OPEN_CHAN_CANCEL:     0x06,

   /** Close channel */
   CLOSE_CHAN:           0x07,

   /** Close channel acknowledgement */
   CLOSE_CHAN_ACK:       0x08,

   /** Round trip time ping */
   RTT:                  0x09,

   /** Round trip time pong */
   RTT_ACK:              0x0A
};


/**
 * Control channel message header flags.
 * @enum {Number}
 * @readonly
 */
VVC.CTRL_FLAG = {
   /** The control packet has data */
   ODAT:               0x80
};


/**
 * Open channel acknowledgement status
 * @enum {Number}
 * @readonly
 */
VVC.OPEN_CHAN_STATUS = {
   SUCCESS: 0,
   REJECT:  1,
   TIMEOUT: 2
};


/**
 * Close channel reason
 * @enum {Number}
 * @readonly
 */
VVC.CLOSE_CHAN_REASON = {
   NORMAL: 0,
   ERROR:  1
};


/**
 * Close channel acknowledgement status
 * @enum {Number}
 * @readonly
 */
VVC.CLOSE_CHAN_STATUS = {
   SUCCESS: 0,
   ERROR:   1
};


/**
 * Expected size of data for each control message
 * @type {Number[]}
 * @readonly
 */
VVC.CTRL_OP.SIZE = [];
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.RECV_ACK]         = 0;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.INIT]             = 12;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.INIT_ACK]         = 12;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.OPEN_CHAN]        = 20;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.OPEN_CHAN_ACK]    = 12;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.OPEN_CHAN_CANCEL] = 0;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.CLOSE_CHAN]       = 8;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.CLOSE_CHAN_ACK]   = 8;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.RTT]              = 0;
VVC.CTRL_OP.SIZE[VVC.CTRL_OP.RTT_ACK]          = 0;


/**
 * Text name of each CTRL_OP for debugging and error messages
 * @type {String[]}
 * @readonly
 */
VVC.CTRL_OP.NAME = [];
VVC.CTRL_OP.NAME[VVC.CTRL_OP.RECV_ACK]         = 'VVC.CTRL_OP.RECV_ACK';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.INIT]             = 'VVC.CTRL_OP.INIT';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.INIT_ACK]         = 'VVC.CTRL_OP.INIT_ACK';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.OPEN_CHAN]        = 'VVC.CTRL_OP.OPEN_CHAN';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.OPEN_CHAN_ACK]    = 'VVC.CTRL_OP.OPEN_CHAN_ACK';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.OPEN_CHAN_CANCEL] = 'VVC.CTRL_OP.OPEN_CHAN_CANCEL';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.CLOSE_CHAN]       = 'VVC.CTRL_OP.CLOSE_CHAN';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.CLOSE_CHAN_ACK]   = 'VVC.CTRL_OP.CLOSE_CHAN_ACK';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.RTT]              = 'VVC.CTRL_OP.RTT';
VVC.CTRL_OP.NAME[VVC.CTRL_OP.RTT_ACK]          = 'VVC.CTRL_OP.RTT_ACK';


/**
 * Sends a VVC.CTRL_OP.INIT message.
 * Requests to initiate the connection.
 *
 * @protected
 * @param  {VVC.CTRL_OP} [code] The CTRL_OP code to use so we can reuse this
 *                              function as both the INIT and INIT_ACK messages
 *                              have identical data.
 * @return {Boolean}            Returns true on successful send
 */
VVCControlChannel.prototype.sendInit = function(code)
{
   var packet;

   if (code === undefined) {
      code = VVC.CTRL_OP.INIT;
   }

   if (code !== VVC.CTRL_OP.INIT && code !== VVC.CTRL_OP.INIT_ACK) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                      'VVCControlChannel.sendInit',
                                      'Invalid code, '
                                      + ' expected INIT or INIT_ACK');
      return false;
   }

   packet = this._createControlPacket(code);
   packet.writeUint16(VVC.MAJOR_VER);
   packet.writeUint16(VVC.MINOR_VER);
   packet.writeUint32(VVC.CAPS_V10_1);
   packet.writeUint32(VVC.CAPS_V10_2);
   return this._sendControlPacket(packet);
};


/**
 * Sends a VVC.CTRL_OP.RTT message.
 * Used as a ping/pong system for measuring round trip times.
 *
 * @protected
 * @return {Boolean} Returns true on successful send
 */
VVCControlChannel.prototype.sendRtt = function()
{
   this._rttSendTimeMS = Date.now();
   return this._sendControlPacket(this._createControlPacket(VVC.CTRL_OP.RTT));
};


/**
 * Sends a VVC.CTRL_OP.RECV_ACK message.
 * Acknowledges receiving of chunk data.
 * Will send multiple messages if bytes is above 0xffff.
 *
 * @protected
 * @param  {Number}  bytes The number of bytes to acknowledge
 * @return {Boolean}       Returns true on successful send
 */
VVCControlChannel.prototype.sendRecvAck = function(bytes)
{
   var packet;

   while (bytes > 0xffff) {
      packet = this._createControlPacket(VVC.CTRL_OP.RECV_ACK, 0, 0xffff - 1);
      this._sendControlPacket(packet);
      bytes -= 0xffff;
   }

   if (bytes > 0) {
      packet = this._createControlPacket(VVC.CTRL_OP.RECV_ACK, 0, bytes - 1);
      this._sendControlPacket(packet);
   }

   return true;
};


/**
 * Sends a VVC.CTRL_OP.OPEN_CHAN message.
 *
 * Requests to open a new channel.
 *
 * @protected
 * @param  {VVCChannel} channel       The channel to open
 * @param  {Uint8Array} [initialData] Initial data to send with the open request
 * @return {Boolean}                  Returns true on successful send
 */
VVCControlChannel.prototype.sendOpenChannel = function(channel, initialData)
{
   var packet, initialDataLen = 0;

   if (!(channel instanceof VVCChannel)) {
      this._vvcInstance.setLastError(VVC.STATUS.INVALID_ARGS,
                                      'VVCControlChannel.sendOpenChannel',
                                      'Invalid channel, '
                                      + ' expected instanceof VVCChannel');
      return false;
   }

   initialDataLen = 0;

   if (!!initialData) {
      initialDataLen = initialData.length;
   }

   packet = this._createControlPacket(VVC.CTRL_OP.OPEN_CHAN);
   packet.writeUint32(channel.id);
   packet.writeUint32(channel.priority);
   packet.writeUint32(channel.flags);
   packet.writeUint32(channel.timeout);
   packet.writeUint16(0);  // Reserved
   packet.writeUint8(0);   // Reserved2
   packet.writeUint8(channel.name.length);
   packet.writeUint32(initialDataLen);
   packet.writeStringASCII(channel.name);

   if (initialDataLen) {
      packet.writeArray(initialData);
   }

   return this._sendControlPacket(packet);
};


/**
 * Sends a VVC.CTRL_OP.OPEN_CHAN_ACK message.
 *
 * Responds to requests to open a new channel.
 *
 * @protected
 * @param  {VVCChannel}           channel       The channel to open
 * @param  {VVC.OPEN_CHAN_STATUS} status        The acknowledgement status
 * @param  {Uint8Array}           [initialData] Initial data to send with ack
 * @return {Boolean}                            Returns true on successful send
 */
VVCControlChannel.prototype.sendOpenChannelAck = function(channel,
                                                          status,
                                                          initialData)
{
   var packet = this._createControlPacket(VVC.CTRL_OP.OPEN_CHAN_ACK);
   packet.writeUint32(channel.id);
   packet.writeUint32(status);

   if (!!initialData) {
      packet.writeUint32(initialData.length);
      packet.writeArray(initialData);
   } else {
      packet.writeUint32(0);
   }

   return this._sendControlPacket(packet);
};


/**
 * Sends a VVC.CTRL_OP.CLOSE_CHAN message.
 *
 * Requests to close a channel.
 *
 * @protected
 * @param  {VVCChannel}            channel The channel to close
 * @param  {VVC.CLOSE_CHAN_REASON} reason  The reason for closing
 * @return {Boolean}                       Returns true on successful send
 */
VVCControlChannel.prototype.sendCloseChannel = function(channel, reason)
{
   var packet = this._createControlPacket(VVC.CTRL_OP.CLOSE_CHAN);
   packet.writeUint32(channel.id);
   packet.writeUint32(reason);
   return this._sendControlPacket(packet);
};


/**
 * Sends a VVC.CTRL_OP.CLOSE_CHAN message.
 *
 * Responds to a close channel request.
 *
 * @protected
 * @param  {VVCChannel}            channel The channel to close
 * @param  {VVC.CLOSE_CHAN_STATUS} status  The close acknowledgement status
 * @return {Boolean}                       Returns true on successful send
 */
VVCControlChannel.prototype.sendCloseChannelAck = function(channel, status)
{
   var packet = this._createControlPacket(VVC.CTRL_OP.CLOSE_CHAN_ACK);
   packet.writeUint32(channel.id);
   packet.writeUint32(status);
   return this._sendControlPacket(packet);
};


/**
 * Called when the control channel receives a message.
 * Reads the message header and forwards it to the correct handler function.
 * Implements VVCChannel~onmessage.
 *
 * @protected
 * @param {MessageEvent} evt
 */
VVCControlChannel.prototype.onmessage = function(evt)
{
   var packet = WMKS.Packet.createFromBuffer(evt.data);
   var opcode = packet.readUint8();
   var flags  = packet.readUint8();
   var param  = packet.readUint16();

   switch (opcode) {
      case VVC.CTRL_OP.INIT:
      case VVC.CTRL_OP.INIT_ACK:
         this._onInit(packet, opcode);
         break;
      case VVC.CTRL_OP.RTT:
         this._onRtt(packet);
         break;
      case VVC.CTRL_OP.RTT_ACK:
         this._onRttAck(packet);
         break;
      case VVC.CTRL_OP.OPEN_CHAN:
         this._onOpenChannel(packet);
         break;
      case VVC.CTRL_OP.OPEN_CHAN_ACK:
         this._onOpenChannelAck(packet);
         break;
      case VVC.CTRL_OP.CLOSE_CHAN:
         this._onCloseChannel(packet);
         break;
      case VVC.CTRL_OP.CLOSE_CHAN_ACK:
         this._onCloseChannelAck(packet);
         break;
      case VVC.CTRL_OP.RECV_ACK:
         this._onRecvAck(packet, param);
         break;
      default:
         this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                       'VVCControlChannel.onmessage',
                                       'Unknown control opcode: ' + opcode);
         return false;
   }

   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.RTT message.
 * Immediately replies with a VVC.CTRL_OP.RTT_ACK.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onRtt = function(packet)
{
   var ack;

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.RTT, packet)) {
      return false;
   }

   ack = this._createControlPacket(VVC.CTRL_OP.RTT_ACK);
   return this._sendControlPacket(ack);
};


/**
 * Called when we receive a VVC.CTRL_OP.RTT_ACK message.
 * Records the time taken for the RTT_ACK to arrive since we sent the request.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onRttAck = function(packet)
{
   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.RTT_ACK, packet)) {
      return false;
   }

   this._session.addRttTime(Date.now() - this._rttSendTimeMS);
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.RECV_ACK message.
 * Does nothing.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onRecvAck = function(packet, bytesReceived)
{
   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.RECV_ACK, packet)) {
      return false;
   }

   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.INIT or VVC.CTRL_OP.INIT_ACK message.
 * If receiving an INIT then responds with an INIT_ACK message.
 * Will trigger the listener.onconnect callback.
 *
 * @private
 * @param {VVC.CTRL_OP} opcode  The opcode, expected to be INIT or INIT_ACK
 * @param {Packet}      packet  The INIT / INIT_ACK packet
 * @return {Boolean}    success Returns true on success
 */
VVCControlChannel.prototype._onInit = function(packet, opcode)
{
   var major, minor, caps1, caps2;

   if (!this._checkErrorMinimumSize(opcode, packet)) {
      return false;
   }

   if (!this._checkErrorSessionState(opcode, VVC.SESSION_STATE.INIT)) {
      return false;
   }

   major = packet.readUint16();
   minor = packet.readUint16();
   caps1 = packet.readUint32();
   caps2 = packet.readUint32();

   if (opcode === VVC.CTRL_OP.INIT) {
      this.sendInit(VVC.CTRL_OP.INIT_ACK);
   }

   this._session.onConnect();
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.OPEN_CHAN message.
 * Will trigger the listener.onpeeropen callback.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onOpenChannel = function(packet)
{
   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.OPEN_CHAN, packet)) {
      return false;
   }

   var name, initialData, channel;
   var id             = packet.readUint32();
   var priority       = packet.readUint32();
   var flags          = packet.readUint32();
   var timeout        = packet.readUint32();
   var reserved       = packet.readUint16();
   var reserved2      = packet.readUint8();
   var nameLen        = packet.readUint8();
   var initialDataLen = packet.readUint32();

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.OPEN_CHAN, packet,
                                    nameLen + initialDataLen)) {
      return false;
   }

   name         = packet.readStringASCII(nameLen);
   initialData  = packet.readArray(initialDataLen);

   channel      = this._session.createChannel(id,
                                              name,
                                              priority,
                                              flags,
                                              timeout);
   channel.initialData = initialData;
   this._session.onPeerOpen(channel);
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.OPEN_CHAN_ACK message.
 * Will trigger the channel.onopen callback.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onOpenChannelAck = function(packet)
{
   var id, status, initialDataLen, initialData;

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.OPEN_CHAN_ACK, packet)) {
      return false;
   }

   id             = packet.readUint32();
   status         = packet.readUint32();
   initialDataLen = packet.readUint32();

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.OPEN_CHAN_ACK, packet,
                                    initialDataLen)) {
      return false;
   }

   initialData = packet.readArray(initialDataLen);

   if (!this._checkErrorValidChannel(VVC.CTRL_OP.OPEN_CHAN_ACK, id,
                                     VVC.CHANNEL_STATE.INIT)) {
      return false;
   }

   this._session.onChannelOpen(this._session.getChannel(id),
                               status,
                               initialData);
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.CLOSE_CHAN message.
 * Will trigger the channel.onclose callback.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onCloseChannel = function(packet)
{
   var id, reason;

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.CLOSE_CHAN, packet)) {
      return false;
   }

   id     = packet.readUint32();
   reason = packet.readUint32();

   if (!this._checkErrorValidChannel(VVC.CTRL_OP.CLOSE_CHAN, id)) {
      return false;
   }

   this._session.onChannelClose(this._session.getChannel(id), reason);
   return true;
};


/**
 * Called when we receive a VVC.CTRL_OP.CLOSE_CHAN_ACK message.
 * Will trigger the channel.onclose callback.
 *
 * @private
 * @param  {Packet}  packet  Incoming message packet
 * @return {Boolean} success Returns true on success
 */
VVCControlChannel.prototype._onCloseChannelAck = function(packet)
{
   var id, status;

   if (!this._checkErrorMinimumSize(VVC.CTRL_OP.CLOSE_CHAN_ACK, packet)) {
      return false;
   }

   id     = packet.readUint32();
   status = packet.readUint32();

   if (!this._checkErrorValidChannel(VVC.CTRL_OP.CLOSE_CHAN_ACK, id,
                                     VVC.CHANNEL_STATE.CLOSING)) {
      return false;
   }

   this._session.onChannelClose(this._session.getChannel(id),
                                status);

   return true;
};


/**
 * Checks the size of the incoming packet is correct.
 * Triggers a session error if the size is unexpected.
 *
 * @private
 * @param  {VVC.CTRL_OP} opcode      The message opcode
 * @param  {Packet}      packet      The packet to check
 * @param  {Number}      [extraSize] Extra size needed
 * @return {Boolean}     success     Returns true on correct size
 */
VVCControlChannel.prototype._checkErrorMinimumSize = function(opcode,
                                                              packet,
                                                              extraSize)
{
   var packetSize = packet.length - 4;
   var expectSize = VVC.CTRL_OP.SIZE[opcode];
   extraSize      = extraSize || 0;

   if (packetSize < expectSize + extraSize) {
      var name = VVC.CTRL_OP.NAME[opcode];

      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorMinimumSize',
                                    'Received invalid ' + name + ' message, '
                                     + 'message too small, received '
                                     + packetSize + ' bytes, expected '
                                     + expectSize + ' + ' + extraSize);
      return false;
   }

   return true;
};


/**
 * Checks the session state.
 * Triggers a session error if the state is invalid.
 *
 * @private
 * @param  {VVC.CTRL_OP}        opcode  The message opcode
 * @param  {VVC.SESSSION_STATE} state   The state to check
 * @return {Boolean}            success Returns true on valid session state
 */
VVCControlChannel.prototype._checkErrorSessionState = function(opcode,
                                                               state)
{
   var opname = VVC.CTRL_OP.NAME[opcode];

   if (this._session.state !== state) {
      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorSessionState',
                                    'Received invalid ' + opname + ' message, '
                                     + 'invaild session state, '
                                     + 'found ' + this._session.state
                                     + ' expected ' + state);
      return false;
   }

   return true;
};


/**
 * Checks if the channel id is valid.
 * Ensures it is not the control channel.
 * Ensures channel exists.
 * Optionally checks the channel state;
 *
 * @private
 * @param  {VVC.CTRL_OP}       opcode  The message opcode
 * @param  {Number}            id      The channel id to check
 * @param  {VVC.CHANNEL_STATE} [state] The state the channel must be in
 * @return {Boolean}           success Returns true on valid channel id.
 */
VVCControlChannel.prototype._checkErrorValidChannel = function(opcode,
                                                               id,
                                                               state)
{
   var opname  = VVC.CTRL_OP.NAME[opcode];
   var channel = this._session.getChannel(id);

   if (id === VVC.CONTROL_CHANNEL_ID) {
      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorValidChannel',
                                    'Received invalid ' + opname + ' message, '
                                     + 'unexpected use of control channel id');
      return false;
   }

   if (!channel) {
      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorValidChannel',
                                    'Received invalid ' + opname + ' message, '
                                     + 'unknown channel ' + id);
      return false;
   }

   if (state !== undefined && channel.state !== state) {
      this._session.onSessionError(VVC.STATUS.PROTOCOL_ERROR,
                                    'VVCControlChannel._checkErrorValidChannel',
                                    'Received invalid ' + opname + ' message, '
                                     + 'unexpected channel state, '
                                     + 'found ' + channel.state + ' '
                                     + ' expected ' + state);
      return false;
   }

   return true;
};


/**
 * Creates a control packet.
 * Returns a new instance of Packet and inserts the control message header.
 *
 * @private
 * @param  {VVC.CTRL_OP} code
 * @param  {Number}      [flags]
 * @param  {Number}      [param]
 * @return {Packet}
 */
VVCControlChannel.prototype._createControlPacket = function(code, flags, param)
{
   var packet = WMKS.Packet.createNewPacket();

   param = param || 0;
   flags = flags || 0;

   packet.control = {
      code:  code,
      flags: flags,
      param: param
   };

   packet.writeUint8(code);
   packet.writeUint8(flags);
   packet.writeUint16(param);

   return packet;
};


/**
 * Send a control packet.
 * Automatically updates the length and data flag if required and then sends the
 * control packet using the normal VVCChannel.send.
 *
 * @private
 * @param  {Packet}  packet The packet to send
 * @return {Boolean}        Returns true on successful send
 */

VVCControlChannel.prototype._sendControlPacket = function(packet)
{
   if (packet.length > VVC.CTRL_HEADER_SIZE) {
      packet.control.flags |= VVC.CTRL_FLAG.ODAT;
      packet.control.param = packet.length - VVC.CTRL_HEADER_SIZE;
   }

   packet.setUint8(1, packet.control.flags);
   packet.setUint16(2, packet.control.param);

   return this.send(packet.getData());
};
