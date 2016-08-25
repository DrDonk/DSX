/*********************************************************
 * Copyright (C) 2015 VMware, Inc. All rights reserved.
 *********************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * wmks\const.js
 *
 *    This file expanded the original WMKS.CONST, all constants used in
 *    the new SDK all defined here.
 *
 *    This contains the following:
 *    1. Position: provides the possible option value when create wmks about
 *       how to position the remote screen to make it within the container.
 *
 *    2. ConnectionState: the value of 3 possible connection states when try
 *       to connect the remote VM.
 *
 *	  3. Events: all the events name the new SDK could trigger are listed here.
 *
 *	  4. ErrorType: possible error types in the lifecycle of wmks.
 *
 *	  5. AudioEncodeType: provides the possible audio encode type when create wmks
 *
 *
 *	  6. InputDeviceType: the supported mobile input devices type.
 *
 *
 *------------------------------------------------------------------------------
 */
$.extend(WMKS.CONST, {

    Position: {
        CENTER:   0,
        LEFT_TOP: 1
    },

    ConnectionState: {
        CONNECTING: "connecting",
        CONNECTED: "connected",
        DISCONNECTED: "disconnected"
    },

    Events: {
        CONNECTION_STATE_CHANGE: "connectionstatechange",
        REMOTE_SCREEN_SIZE_CHANGE: "screensizechange",
        FULL_SCREEN_CHANGE: "fullscreenchange",
        ERROR: "error",
        KEYBOARD_LEDS_CHANGE: "keyboardledschanged",
        HEARTBEAT: "heartbeat",
        AUDIO: "audio",
        COPY: "copy",
        TOGGLE: "toggle"
    },

    ErrorType: {
        AUTHENTICATION_FAILED: "authenticationfailed",
        WEBSOCKET_ERROR: "websocketerror",
        PROTOCOL_ERROR: "protocolerror"
    },

    AudioEncodeType: {
        VORBIS: "vorbis",
        OPUS: "opus",
        AAC: "aac"
    },

    InputDeviceType: {
        KEYBOARD: 0,
        EXTENDED_KEYBOARD: 1,
        TRACKPAD: 2
    }
});



