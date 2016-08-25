/*********************************************************
 * Copyright (C) 2015 VMware, Inc. All rights reserved.
 *********************************************************/

/*
 * wmks/mp4Decoder.js
 *
 *   WebMKS MP4 decoder prototype.
 *
 */

function MP4Decoder() {
   this._mediaSource = null;
   this._sourceBuffer = null;
   this._tempQueue = [];
   this._mediaPlayer = null;
   MP4Decoder.instanceNumber++;
   this._name = "MP4Decoder" + MP4Decoder.instanceNumber;
};

MP4Decoder.instanceNumber = 0;
MP4Decoder.byteStreamFormat = 'video/mp4; codecs="avc1.640030"';

MP4Decoder.prototype.toString = function() {
   return this._name;
};


/*
 *------------------------------------------------------------------------------
 *
 * _init
 *
 *    Generate a Media Source object and associate it with video DOM element.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype.init = function(mediaPlayer, urlObject, mediaSourceObject) {
   var self = this,
       URL = urlObject || window.URL || window.webkitURL,
       MediaSource = mediaSourceObject || window.MediaSource || window.WebKitMediaSource;

   this.reset();

   this._mediaPlayer = mediaPlayer;
   this._mediaSource = new MediaSource();
   // Attach a media source object to HTMLMediaElement.
   this._mediaPlayer.src = URL.createObjectURL(this._mediaSource);
   this._mediaSource.addEventListener('sourceopen',
   function(e) {
      return self._onMediaSourceOpen(e);
   }, false);
   this._mediaSource.addEventListener('webkitsourceopen',
   function(e) {
      return self._onMediaSourceOpen(e);
   }, false);
};


/*
 *------------------------------------------------------------------------------
 *
 * _onMediaSourceOpen
 *
 *       After media source is open, create a source buffer with MP4 decoder and
 *    attach it to media source object. If there is any MP4 data in the buffer,
 *    add it to source buffer so that media source can play it.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype._onMediaSourceOpen = function (e) {
   var self = this;

   WMKS.LOGGER.log(this + " media source status is changed to open.");
   this._sourceBuffer = this._mediaSource.addSourceBuffer(
      MP4Decoder.byteStreamFormat);

   /*
    * Listen to update event. It will fire after current buffer data is
    * handled by media source object.
    */
   this._sourceBuffer.addEventListener('update', function () {
      self._flushPayloads();
   });

   // If we receive any MP4 during MediaSource initialization process, decode it now.
   this._flushPayloads();
   return;
};


/*
 *------------------------------------------------------------------------------
 *
 * _flushPayloads
 *
 *    Append all the data in our temp buffer to sourceBuffer object.
 *
 * Side Effects:
 *    Display MP4 video.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype._flushPayloads = function () {
   if (!this._sourceBuffer) {
      WMKS.LOGGER.log(this + "source buffer is not ready yet.");
      return;
   }

   while (this._tempQueue.length > 0 && !this._sourceBuffer.updating) {
      this._sourceBuffer.appendBuffer(this._tempQueue.shift());
   }
};


/*
 *------------------------------------------------------------------------------
 *
 * reset
 *
 *    Reset all the resources used by MP4 Decoder object.
 *
 * Side Effects:
 *    None.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype.reset = function() {
   WMKS.LOGGER.log(this + " is reset.");
   if (this._mediaSource) {
      if (this._sourceBuffer) {
         this._mediaSource.removeSourceBuffer(this._sourceBuffer);
         this._sourceBuffer = null;
      }

      /*
       * Only end the stream if media source is open. Otherwise
       * Chrome browser will throw exception.
       */
      if (this._mediaSource.readyState === "open") {
         this._mediaSource.endOfStream();
      }
      this._mediaSource = null;
   }

   if (this._mediaPlayer) {
      this._mediaPlayer.src = "";
      this._mediaPlayer = null;
   }
   this._tempQueue = [];
};


/*
 *------------------------------------------------------------------------------
 *
 * appendData
 *
 *    Append MP4 data to media source object. If media source is not ready, put
 *    it into temporary buffer.
 *
 * Side Effects:
 *    Display MP4 video.
 *
 *------------------------------------------------------------------------------
 */

MP4Decoder.prototype.appendData = function(payload) {
   if (this._sourceBuffer !== null &&
       this._mediaSource.readyState === "open" &&
       !this._sourceBuffer.updating) {
      this._sourceBuffer.appendBuffer(payload);
   } else {
      this._tempQueue.push(payload);
   }

   if (this._mediaPlayer && this._mediaPlayer.paused) {
      this._mediaPlayer.play();
   }
};