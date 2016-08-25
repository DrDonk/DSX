/*********************************************************
 * Copyright (C) 2015 VMware, Inc. All rights reserved.
 *********************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * wmks\coreAPI.js
 *
 *    The CoreWMKS class defined all the Public API(22) provided by the wmks:
 *
 *    * General API:
 *      - getVersion()
 *      - getConnectionState()
 *
 *    * Lifecycle related API:
 *      - connect()
 *      - disconnect()
 *      - destroy()
 *
 *    * Display related API:
 *      - setRemoteScreenSize()
 *      - getRemoteScreenSize()
 *      - updateScreen()
 *
 *    * Full screen related API:
 *      - canFullScreen()
 *      - isFullScreen()
 *      - enterFullScreen()
 *      - exitFullScreen()
 *
 *    * Input related API:
 *      - sendInputString()
 *      - sendKeyCodes()
 *      - sendCAD()
 *
 *    * Mobile related API:
 *      - enableInputDevice()
 *      - disableInputDevice()
 *      - showKeyboard()
 *      - hideKeyboard()
 *      - toggleExtendedKeypad()
 *      - toggleTrackpad()
 *
 *    * Option related API:
 *      - setOption()
 *
 *    * Events related API:
 *      - register()
 *      - unregister()
 *
 *   Trigger the following events:
 *   - FULL_SCREEN_CHANGE event (new added)
 *   - CONNECTION_STATE_CHANGE
 *   - REMOTE_SCREEN_SIZE_CHANGE
 *   - ERROR
 *   - KEYBOARD_LEDS_CHANGE
 *   - HEARTBEAT
 *   - AUDIO
 *   - COPY
 *   - TOGGLE
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS = function (wmks) {
    this.wmks = wmks;
    //different version jquery has different way to get the data
    this.wmksData = wmks.data("nwmks") || wmks.data("wmks-nwmks") ;
    this.oldCssText = "";
    this.connectionState = WMKS.CONST.ConnectionState.DISCONNECTED;
    this.eventHandlers = {};

    var Event_Prefix = this.wmksData.widgetEventPrefix;
    var self = this;

    var triggerEvents = function (eventName, event, data) {
        var handlerArray = self.eventHandlers[eventName];
        if (handlerArray && handlerArray.length > 0) {
            var len = handlerArray.length;
            for (var i = 0; i < len; i++) {
                handlerArray[i].apply(wmks, [event, data]);
            }
        }
    };

    /* ----------------------- CONNECTION_STATE_CHANGE event ---------------------- */
    var connectEventsNameStr = [Event_Prefix + "connecting",
            Event_Prefix + "connected",
            Event_Prefix + "disconnected"].join(" ");
    wmks.bind(connectEventsNameStr, function (event, data) {
        data = data || {};
        var eventName = event.type;
        self.connectionState = eventName.substring(Event_Prefix.length, eventName.length);

        data.state = self.connectionState;

        triggerEvents(WMKS.CONST.Events.CONNECTION_STATE_CHANGE, event, data);
    });


    /* ---------------------------- ERROR event ---------------------------------- */

    var errorEventsNameStr = [Event_Prefix + "authenticationfailed",
            Event_Prefix + "error",
            Event_Prefix + "protocolerror" ].join(" ");

    wmks.bind(errorEventsNameStr, function (event, data) {
        var errorType,
            cons = WMKS.CONST.ErrorType
            type = event.type.substring(Event_Prefix.length,event.type.length);

        data = data || {};
        switch (type) {
            case "authenticationfailed":
                errorType = cons.AUTHENTICATION_FAILED;
                break;
            case "error":
                errorType = cons.WEBSOCKET_ERROR;
                break;
            case "protocolerror":
                errorType = cons.PROTOCOL_ERROR;
                break;
        }
        if (errorType) {
            data.errorType = errorType;
            triggerEvents(WMKS.CONST.Events.ERROR, event, data);
        }
    });

    /* ---------------------- REMOTE_SCREEN_SIZE_CHANGE event -------------------- */
    wmks.bind(Event_Prefix + "resolutionchanged", function (event, data) {
        triggerEvents(WMKS.CONST.Events.REMOTE_SCREEN_SIZE_CHANGE, event, data);
    });

    /* -------KEYBOARD_LEDS_CHANGE, HEARTBEAT,AUDIO,COPY,TOGGLE ----------------- */
    var eventsNameStr = [Event_Prefix + "keyboardledschanged",
            Event_Prefix + "heartbeat",
            Event_Prefix + "copy",
            Event_Prefix + "audio",
            Event_Prefix + "toggle"].join(" ");
    wmks.bind(eventsNameStr, function (event, data) {
        var type = event.type.substring(Event_Prefix.length,event.type.length);
        if(type == "toggle")
        {
            data = {"type":arguments[1],"visibility":arguments[2]};
        }
        triggerEvents(type, event, data);
    });


    /* ------------------------ FULL_SCREEN_CHANGE event ------------------------ */

    // here the enterFullScreenHandler would be remove in the exitFullScreenHandler
    // cause the resize event maybe would be triggered for more than once,
    // and only the last one is the really fullscreen
    var enterFullScreenHandler = function (e) {

        if (!WMKS.UTIL.isFullscreenNow()) return;
        //make the wmks can occupy the whole screen
        self.wmks[0].style.cssText = "position:fixed; margin:0px; left:0px; top:0px; height:" +
            window.innerHeight + "px;" + "width:" + window.innerWidth + "px;";
        self.wmksData.rescaleOrResize(true);

        // $(window).off("resize.nwmks", enterFullScreenHandler);
        triggerEvents(WMKS.CONST.Events.FULL_SCREEN_CHANGE, e, {isFullScreen: true});
    };

    var exitFullScreenHandler = function (e) {

        $(window).off("resize.wmks", enterFullScreenHandler);

        self.wmks[0].style.cssText = self.oldCssText;
        self.wmksData.rescaleOrResize(true);

        $(window).off("resize.wmks", exitFullScreenHandler);
        triggerEvents(WMKS.CONST.Events.FULL_SCREEN_CHANGE, e, {isFullScreen: false});
    };

    this.fullScreenChangeEventStr = ["fullscreenchange",
        "webkitfullscreenchange",
        "mozfullscreenchange",
        "MSFullscreenChange"].join(" ");
     this.fullScreenChangeHandler = function(){
        if (!WMKS.UTIL.isFullscreenNow()) {
            $(window).off("resize.wmks", exitFullScreenHandler);
            $(window).on("resize.wmks", exitFullScreenHandler);
        }
    };
    $(document).on(this.fullScreenChangeEventStr, this.fullScreenChangeHandler);

    /************************************************************************
     * Public API
     ************************************************************************/
    // put the public API method enterFullScreen and exitFullScreen
    // here, cause need to trigger the FULL_SCREEN_CHANGE event
    WMKS.CoreWMKS.prototype.enterFullScreen = function () {

        if (WMKS.UTIL.isFullscreenNow() || !WMKS.UTIL.isFullscreenEnabled())
            return;
        this.oldCssText = wmks[0].style.cssText;
        console.log("old css is " + this.oldCssText);

        $(window).off("resize.wmks", enterFullScreenHandler);
        $(window).on("resize.wmks", enterFullScreenHandler);
        WMKS.UTIL.toggleFullScreen(true, wmks[0]);
    };


    WMKS.CoreWMKS.prototype.exitFullScreen = function () {

        if (!WMKS.UTIL.isFullscreenNow())
            return;

        $(window).on("resize.wmks", exitFullScreenHandler);
        WMKS.UTIL.toggleFullScreen(false);
    };

};

/************************************************************************
 * Public API
 ************************************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * register
 *
 *    Attach the handler to the certain event for WMKS widget.
 *    This can be called by consumers of WMKS to register  the
 *    events to interact with the guest.
 *
 *    @param eventType: [String] any value in WMKS.CONST.Events
 *
 *    @param handler: [Function] A function to execute each time
 *    the event is triggered.
 *
 * Results:
 *    the coreWMKS object itself, for call chain.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.register = function (eventType, handler) {

    if(!eventType || !handler) return;
    //here maybe need to validate the eventName
    var handlersArray = this.eventHandlers[eventType];
    if (!handlersArray) {
        handlersArray = this.eventHandlers[eventType] = [];
    }
    handlersArray.push(handler);
    return this;
};

/*
 *------------------------------------------------------------------------------
 *
 * unregister
 *
 *    Remove a previously-attached event handler for WMKS widget.
 *
 *    @param eventType: [String] any value in WMKS.CONST.Events
 *
 *    @param handler: [Function] The function that is to be no longer executed.
 *
 *    if the second parameter handler is empty, then would remove all the handlers
 *    corresponding to eventType.
 *    if no parameter, then would remove all the handlers.
 *
 * Results:
 *    the coreWMKS object itself, for call chain.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.unregister = function (eventType, handler) {
    if(!eventType && !handler)
    {
        this.eventHandlers = {};
        return this;
    }

    if(eventType && !handler)
    {
       delete  this.eventHandlers[eventType];
       return this;
    }

    var handlersArray = this.eventHandlers[eventType];
    if (handlersArray && handlersArray.length > 0) {
        var len = handlersArray.length;
        for (var i = 0; i < len; i++) {
            if (handlersArray[i] === handler) {
                handlersArray.splice(i, 1);
                break;
            }
        }
        if(handlersArray.length === 0)
            delete  this.eventHandlers[eventType];
    }
    return this;
};

/*
 *------------------------------------------------------------------------------
 *
 * getVersion
 *
 *    This method retrieves the current version number of the WMKS SDK.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.getVersion = function () {
    return WMKS.version;
};

/*
 *------------------------------------------------------------------------------
 *
 * getConnectionState
 *
 *    This method retrieves the current connection state. Could be any value in
 *    WMKS.CONST.ConnectionState
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.getConnectionState = function () {
    return this.connectionState;
};

//Lifecycle
/*
 *------------------------------------------------------------------------------
 *
 * connect
 *
 *    Connects the WMKS widget to a WebSocket URL.
 *
 *    Consumers should call this after they've created the WMKS by invoking the method
 *    createWMKS(), and then ready to start displaying a stream from the VM.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Connects to the server and sets up the WMKS UI.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.connect = function (url) {
    this.wmksData.connect(url);
};

/*
 *------------------------------------------------------------------------------
 *
 * disconnect
 *
 *    Disconnects the WMKS with the VM.
 *
 *    Consumers should call this when they are done with the WMKS
 *    component. Destroying the WMKS will also result in a disconnect.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Disconnects from the server and tears down the WMKS UI.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.disconnect = function () {
    this.wmksData.disconnect();
};

/*
 *------------------------------------------------------------------------------
 *
 * destroy
 *
 *    Destroys the WMKS widget.
 *
 *    This will disconnect the WMKS connection (if active) and remove
 *    the widget from the associated element.
 *
 *    Consumers should call this before removing the element from the DOM.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Disconnects from the server and removes the WMKS class and canvas
 *    from the HTML code.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.destroy = function () {
    if (this.wmksData) {
        clearTimeout(this.wmksData._vncDecoder.resolutionTimer);
        this.wmksData.destroy();
    }

    $(document).off(this.fullScreenChangeEventStr, this.fullScreenChangeHandler);
    $(window).off("resize.wmks");
    this.wmksData = null;
    this.wmks = null;
};

/*
 *------------------------------------------------------------------------------
 *
 * setRemoteScreenSize
 *
 *    This function could work if the option changeResolution is true and
 *    the server sends back a CAPS message indicating that it can handle
 *    resolution change requests.
 *
 *    It will send the request about desired resolution (both width and height)
 *    to the connect VM.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    It would not guarantee the request would success.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.setRemoteScreenSize = function (width, height) {
    this.wmksData.setRemoteScreenSize(width, height);
};

/*
 *------------------------------------------------------------------------------
 *
 * getRemoteScreenSize
 *
 *    This method retrieves the screen width and height in pixels of currently
 *    connected VM.
 *
 * Results:
 *    Object in format of {width:, height:}.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.getRemoteScreenSize = function () {

    return {width: this.wmksData._guestWidth, height: this.wmksData._guestHeight};
};

/*
 *------------------------------------------------------------------------------
 *
 * updateScreen
 *
 *    This method can be invoked if the size of WMKS widget container changed.
 *    The behavior of updateScreen depends on the option changeResolution,
 *    rescale and position:
 *    1) if the option changeResolution is true, it would send the change resolution
 *    request to the connected VM, the request resolution(width & height) is the
 *    same as the container's allocated size.
 *
 *    2) check rescale option: if true, rescale the remote screen to fit the
 *    container's allocated size.
 *
 *    3) check position option: If the remote screen's size is not same with
 *    the container's allocated size, then put the remote screen in the center
 *    or left top of the container based on its value.
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates this._scale and modifies the canvas size and position.
 *    Possibly triggers a resolutionRequest message to the server.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.updateScreen = function () {
    this.wmksData.rescaleOrResize(true);
};

/*
 *---------------------------------------------------------------------------
 *
 * canFullScreen
 *
 *    Indicates if fullscreen feature is enabled on the browser.
 *
 *    Fullscreen mode is disabled on Safari as it does not support keyboard
 *    input in fullscreen for "security reasons". See bug 1296505.
 *
 * Results:
 *    Boolean, true mean can enter full screen.
 *
 *---------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.canFullScreen = function () {
    return WMKS.UTIL.isFullscreenEnabled();
};

/*
 *---------------------------------------------------------------------------
 *
 * isFullScreen
 *
 *    Inform if the browser is in full-screen mode.
 *
 *---------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.isFullScreen = function () {
    return WMKS.UTIL.isFullscreenNow();
};


/*
 *------------------------------------------------------------------------------
 *
 * sendInputString
 *
 *    Sends a unicode string as keyboard input to the server.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.sendInputString = function (str) {
    this.wmksData.sendInputString(str);
};

/*
 *------------------------------------------------------------------------------
 *
 * sendKeyCodes
 *
 *    Sends a series of special key codes to the VM.
 *
 *    This takes an array of special key codes and sends keydowns for
 *    each in the order listed. It then sends keyups for each in
 *    reverse order.
 *
 *    Keys usually handled via keyPress are also supported: If a keycode
 *    is negative, it is interpreted as a Unicode value and sent to
 *    keyPress. However, these need to be the final key in a combination,
 *    as they will be released immediately after being pressed. Only
 *    letters not requiring modifiers of any sorts should be used for
 *    the latter case, as the keyboardMapper may break the sequence
 *    otherwise. Mixing keyDown and keyPress handlers is semantically
 *    incorrect in JavaScript, so this separation is unavoidable.
 *
 *    This can be used to send key combinations such as
 *    Control-Alt-Delete, as well as Ctrl-V to the guest, e.g.:
 *    [17, 18, 46]      Control-Alt-Del
 *    [17, 18, 45]      Control-Alt-Ins
 *    [17, -118]        Control-v (note the lowercase 'v')
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Sends keyboard data to the server.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.sendKeyCodes = function (keyCodes) {
    this.wmksData.sendKeyCodes(keyCodes);
};

/*
 *------------------------------------------------------------------------------
 *
 * sendInputString
 *
 *    Send key combination Control-Alt-Del .
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.sendCAD = function () {
    this.wmksData.sendKeyCodes([17, 18, 46]);
};


/*
 *------------------------------------------------------------------------------
 * showKeyboard
 *
 *     This method used to show the keyboard on the mobile device
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.showKeyboard = function() {
    this.wmksData.showKeyboard();
};

/*
 *------------------------------------------------------------------------------
 * showKeyboard
 *
 *     This method used to hide the keyboard on the mobile device
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.hideKeyboard = function() {
    this.wmksData.hideKeyboard();
};

/*
 *------------------------------------------------------------------------------
 *
 * toggleExtendedKeypad
 *
 *    This method used to show/hide the extendedKeypad  on the mobile device
 *    depend on the current visibility.
 *
 *
 *    options: a map, could include minToggleTime(ms) such as {minToggleTime: 50}
 *    if the user try to call this toggle method too frequency, the duration less
 *    then the minToggleTime, it would not been excuted.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.toggleExtendedKeypad = function(options) {
    this.wmksData.toggleExtendedKeypad(options);
};

/*
 *------------------------------------------------------------------------------
 *
 * toggleTrackpad
 *
 *    This method used to show/hide the trackpad  on the mobile device
 *    depend on the current visibility.
 *
 *
 *    options: a map, could include minToggleTime(ms) such as {minToggleTime: 50}
 *    if the user try to call this toggle method too frequency, the duration less
 *    then the minToggleTime, it would not been excuted.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.toggleTrackpad = function(options) {
    this.wmksData.toggleTrackpad(options);
};


/*
 *------------------------------------------------------------------------------
 *
 * enableInputDevice
 *
 *    This method used to enable the input device on the mobile device according to
 *    the deviceType(any value in WMKS.CONST.InputDeviceType)
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.enableInputDevice = function (deviceType) {
    var cons = WMKS.CONST.InputDeviceType
    innerType = null;
    switch (deviceType) {
        case cons.KEYBOARD:
            this.wmksData.options.allowMobileKeyboardInput = true;
            innerType = WMKS.CONST.TOUCH.FEATURE.SoftKeyboard;
            break;
        case cons.EXTENDED_KEYBOARD:
            this.wmksData.options.allowMobileExtendedKeypad = true;
            innerType = WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad;
            break;
        case cons.TRACKPAD:
            this.wmksData.options.allowMobileTrackpad = true;
            innerType = WMKS.CONST.TOUCH.FEATURE.Trackpad;
            break;
    }
    if (innerType !== null) {
        this.wmksData._updateMobileFeature(false, innerType);
        this.wmksData._updateMobileFeature(true, innerType);
    }
};

/*
 *------------------------------------------------------------------------------
 *
 * disableInputDevice
 *
 *    This method used to disable the input device on the mobile device according to
 *    the deviceType(any value in WMKS.CONST.InputDeviceType)
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.disableInputDevice = function (deviceType) {
    var cons = WMKS.CONST.InputDeviceType;
    switch (deviceType) {
        case cons.KEYBOARD:
            this.wmksData.options.allowMobileKeyboardInput = false;
            this.wmksData._updateMobileFeature(false, WMKS.CONST.TOUCH.FEATURE.SoftKeyboard);
            break;
        case cons.EXTENDED_KEYBOARD:
            this.wmksData.options.allowMobileExtendedKeypad = false;
            this.wmksData._updateMobileFeature(false, WMKS.CONST.TOUCH.FEATURE.ExtendedKeypad);
            break;
        case cons.TRACKPAD:
            this.wmksData.options.allowMobileTrackpad = false;
            this.wmksData._updateMobileFeature(false, WMKS.CONST.TOUCH.FEATURE.Trackpad);
            break;
    }
};

/*
 *------------------------------------------------------------------------------
 *
 * setOption
 *
 *    Changes a WMKS option.
 *
 *    Only these options changed in this way would have effect
 *    - rescale
 *    - position
 *    - changeResolution
 *	  - useNativePixels
 *    -	reverseScrollY
 *	  - fixANSIEquivalentKeys
 *	  - sendProperMouseWheelDeltas
 *
 * Results:
 *    None.
 *
 * Side Effects:
 *    Updates the given option in this.options.
 *
 *------------------------------------------------------------------------------
 */
WMKS.CoreWMKS.prototype.setOption = function(key, value) {

    this.wmksData._setOption(key, value);
};
/*
 *------------------------------------------------------------------------------
 *
 * createWMKS
 *
 *    This is a factory method. It should be the first method when you use WMKS SDK.
 *    By using this method, it would generate the widget which could display the
 *    remote screen, and then return the WMKS core object which could use all the
 *    WMKS API to connect to a VM and perform operations.
 *
 *------------------------------------------------------------------------------
 */
WMKS.createWMKS = function (id, options) {
    var wmks = $("#" + id).nwmks(options);
    var coreAPI = new WMKS.CoreWMKS(wmks);

    return coreAPI;
};


