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
    me.state.set me.state.PLAY, new game.PlayScreen()

    me.entityPool.add("mainBunny", game.BunnyEntity, true)
    me.entityPool.add('toast', game.ToastEntity, true)

    @defineKeys()
    me.state.change me.state.PLAY

  defineKeys: ->
    me.input.bindKey(me.input.KEY.A,  "left")
    me.input.bindKey(me.input.KEY.D, "right")
    me.input.bindKey(me.input.KEY.SPACE, "jump", true)
    me.input.bindKey(me.input.KEY.P, "shoot", true)
    me.input.bindMouse(me.input.mouse.LEFT, me.input.KEY.P)

window.onReady onReady = ->
  window.game.onload()
