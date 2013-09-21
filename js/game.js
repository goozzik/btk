// Generated by CoffeeScript 1.6.3
(function() {
  var onReady;

  window.game = {
    onload: function() {
      if (!me.video.init("screen", 640, 480, true, "auto")) {
        alert("Your browser does not support HTML5 canvas.");
        return;
      }
      if (document.location.hash === "#debug") {
        window.onReady(function() {
          return me.plugin.register.defer(debugPanel, "debug");
        });
      }
      me.audio.init("mp3,ogg");
      me.loader.onload = this.loaded.bind(this);
      me.loader.preload(window.game.resources);
      return me.state.change(me.state.LOADING);
    },
    loaded: function() {
      me.state.set(me.state.PLAY, new window.game.PlayScreen());
      return me.state.change(me.state.PLAY);
    }
  };

  window.onReady(onReady = function() {
    return window.game.onload();
  });

}).call(this);
