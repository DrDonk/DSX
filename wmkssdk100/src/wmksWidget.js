/*********************************************************
 * Copyright (C) 2015 VMware, Inc. All rights reserved.
 *********************************************************/

/*
 *------------------------------------------------------------------------------
 *
 * wmks\wmksWidget.js
 *
 * A widget inherited from the original wmks to provide better behavior
 *
 * Some of the options of the original wmks been modified to The options used to
 * optimize the behavior of the WebMKS, here is the mapping:
 *
 * * fitToParent:
 *   - deprecated. Add rescale and position to instead it. Option rescale is a
 *   boolean, indcates whether rescale the remote screen to fit the container's
 *   allocated size. Option position is an enum, could be any value of
 *   WMKS.CONST.Position, it means put the remote screen in the center or left
 *   top of the container.
 *
 * * fitGuest:
 *   - change the name of fitGuest to **changeResolution**. When the option
 *   changeResolution is true, it means it would send the change resolution request
 *   to the connected VM, the request resolution(width & height) is the same as the
 *   container's allocated size. If the request failed, the option transMode would be
 *   used to transform the remote screen to fit the container.
 *
 * * audioEncodeType:
 *   - combined the options: enableVorbisAudioClips, enableOpusAudioClips,
 *   enableAacAudioClips into one audioEncodeType. It's an enum, could be any value
 *   of WMKS.CONST.AudioEncodeType.
 *
 * * allowMobileKeyboardInput, allowMobileTrackpad, allowMobileExtendedKeypad
 *   - removed. Add enableInputDevice() and disableInputDevice() methods
 *   to provide the same capability.
 *
 *
 * * useNativePixels
 * * useUnicodeKeyboardInput
 * * useVNCHandshake
 * * sendProperMouseWheelDeltas
 * * reverseScrollY
 * * retryConnectionInterval
 * * ignoredRawKeyCodes
 * * fixANSIEquivalentKeys
 *   - The same as original.
 *------------------------------------------------------------------------------
 */
$.widget("wmks.nwmks", $.wmks.wmks, {

    //the default value of the options
    options: {
        rescale: true,
        position: WMKS.CONST.Position.CENTER,
        changeResolution: true,
        audioEncodeType: null,
        useNativePixels: false,
        useUnicodeKeyboardInput: false,
        useVNCHandshake: true,
        sendProperMouseWheelDeltas: false,
        reverseScrollY: false,
        retryConnectionInterval: -1,
        ignoredRawKeyCodes: [],
        fixANSIEquivalentKeys: false
    },

    /************************************************************************
     * jQuery instantiation
     ************************************************************************/

    /*
     *------------------------------------------------------------------------------
     *
     * _create
     *
     *    jQuery-UI initialisation function, called by $.widget()
     *
     *
     *    First mapping some of the options to the original wmks options,
     *    then still use the super class's _create() method for instantiation.
     *
     * Results:
     *    None.
     *
     * Side Effects:
     *    Injects the WMKS canvas into the WMKS container HTML, sets it up
     *    and connects to the server.
     *
     *------------------------------------------------------------------------------
     */
    _create: function () {

        if (this.options.changeResolution) {
            this.options.fitGuest = true;
        }
        if (this.options.audioEncodeType) {
            var constType = WMKS.CONST.AudioEncodeType;
            switch (this.options.audioEncodeType) {
                case constType.AAC:
                    this.options.enableAacAudioClips = true;
                    break;
                case constType.OPUS:
                    this.options.enableOpusAudioClips = true;
                    break;
                case constType.VORBIS:
                    this.options.enableVorbisAudioClips = true;
                    break;
            }
        }
        this.element.unbind();
        WMKS.widgetProto._create.apply(this);

    },

    /*
     *------------------------------------------------------------------------------
     *
     * _init
     *
     *    jQuery-UI initialisation function, called by $.widget
     *    Here initialize the attribute transformOrigin in cross browser environment.
     *
     *------------------------------------------------------------------------------
     */
    _init: function () {
        var self = this;
        var checkProperty = function (prop) {
            return typeof self._canvas[0].style[prop] !== 'undefined' ? prop : null;
        };

        this.transformOrigin = (checkProperty('transformOrigin') ||
            checkProperty('WebkitTransformOrigin') ||
            checkProperty('MozTransformOrigin') ||
            checkProperty('msTransformOrigin') ||
            checkProperty('OTransformOrigin'));
    },

    /*
     *------------------------------------------------------------------------------
     *
     * rescaleOrResize
     *
     *    Override the superClass widgetProto's rescaleOrResize method.
     *
     *    The behavior depends on the option changeResolution, rescale, position:
     *    1) check changeResolution and parameter tryChangeResolution: if both true,
     *    then send the change resolution request to the connected VM, the request
     *    resolution(width & height) is the same as the container's allocated size.
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
    rescaleOrResize: function (tryChangeResolution) {
        var newScale = 1.0, x = 0, y = 0, origin = "center center";
        var parentWidth = this.element.width(),
            parentHeight = this.element.height();

        this._canvas.css({
            width: this._guestWidth / this._pixelRatio,
            height: this._guestHeight / this._pixelRatio
        });

        var width = this._canvas.width();
        var height = this._canvas.height();

        if (tryChangeResolution && this.options.changeResolution) {
            this.updateFitGuestSize(true);
        }

        if (this.transform !== null) {

            if(this.options.rescale)
            {
                var horizScale = parentWidth / width,
                    vertScale = parentHeight / height;
                newScale = Math.max(0.1, Math.min(horizScale, vertScale));
            }
            if(this.options.position !== null)
            {
                switch (this.options.position) {
                    case WMKS.CONST.Position.CENTER:
                        x = (parentWidth - width) / 2;
                        y = (parentHeight - height) / 2;
                        break;
                    case WMKS.CONST.Position.LEFT_TOP:
                        origin = "left top";
                        break;
                }
            }

            if (newScale !== this._scale) {
                this._scale = newScale;
                this._canvas.css(this.transform, "scale(" + this._scale + ")");
                this._canvas.css(this.transformOrigin, origin);
            }

            if (x !== this._x || y !== this._y) {
                this._x = x;
                this._y = y;
                this._canvas.css({top: y, left: x});
            }
        }
        else {
            WMKS.LOGGER.warn("No scaling support");
        }

    },

    /*
     *------------------------------------------------------------------------------
     *
     * _setOption
     *
     *    Changes a WMKS option.
     *
     * Results:
     *    None.
     *
     * Side Effects:
     *    Updates the given option in this.options.
     *
     *------------------------------------------------------------------------------
     */
    _setOption: function (key, value) {

        // mixin the option to this.options
        $.Widget.prototype._setOption.apply(this, arguments);

        switch (key) {
            case 'rescale':
            case 'position':
            case 'changeResolution':
                this.rescaleOrResize(true);
                break;

            case 'useNativePixels':
                // Return if useNativePixels is true and browser indicates no-support.
                if (value && !WMKS.UTIL.isHighResolutionSupported()) {
                    WMKS.LOGGER.warn('Browser/device does not support this feature.');
                    return;
                }
                this._updatePixelRatio();
                this.rescaleOrResize(true);
                break;
            case 'fixANSIEquivalentKeys':
                this._keyboardManager.fixANSIEquivalentKeys = value;
                break;
        }
    },

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
    setRemoteScreenSize: function (width, height) {
        var newW = width * this._pixelRatio,
            newH = height * this._pixelRatio;

        if (!this.options.changeResolution
            || (this._guestWidth === newW
                && this._guestHeight === newH)) {
            return;
        }
        // New resolution based on pixelRatio in case of changeResolution.
        this._vncDecoder.onRequestResolution(newW, newH);
    }
});


