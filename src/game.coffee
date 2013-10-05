window.game =

  onload: ->
    unless me.video.init("screen", 640, 480, true, "auto")
      alert "Your browser does not support HTML5 canvas."
      return
    if document.location.hash is "#debug"
      window.onReady ->
        me.plugin.register.defer debugPanel, "debug"
    me.audio.init "mp3,ogg"
    me.loader.onload = @loaded.bind(this)
    me.loader.preload window.game.resources
    me.state.change me.state.LOADING

  loaded: ->
    me.state.set me.state.PLAY, new window.game.PlayScreen()
    me.state.change me.state.PLAY

window.onReady onReady = ->
  window.game.onload()