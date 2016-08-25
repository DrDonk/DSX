
/*
 * wmks/websocketInit.js
 *
 *   Contains a helper function to instantiate WebSocket object.
 *
 */




/*
 *------------------------------------------------------------------------------
 *
 * WMKSWebSocket
 *
 *    Create an alternate class that consumes WebSocket and provides a
 *    non-native code constructor we can use to stub out in Jasmine (a
 *    testing framework).
 *
 * Results:
 *    Newly constructed WebSocket.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

WMKS.WebSocket = function(url, protocol) {
   return new window.WebSocket(url, protocol);
};
