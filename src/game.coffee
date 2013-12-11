window.game =

  players: {}

  onload: ->
    unless me.video.init("screen", 640, 480, true, "auto")
      alert "Your browser does not support HTML5 canvas."
      return
    if document.location.hash is "#debug"
      window.onReady ->
        me.plugin.register.defer debugPanel, "debug"
    me.audio.init "mp3,ogg"

    me.input.registerPointerEvent "mousemove", me.game.viewport, (e) ->
      game.mouseTarget = { x: e.gameWorldX, y: e.gameWorldY }

    me.loader.onload = @loaded.bind(this)
    me.loader.preload window.game.resources
    me.state.change me.state.LOADING

  loaded: ->
    me.state.set me.state.PLAY, new game.PlayScreen()

    me.entityPool.add('mainPlayer', game.PlayerEntity)
    me.entityPool.add('enemyPlayer', game.NetworkPlayerEntity)
    me.entityPool.add('toast', game.ToastEntity, true)

    @defineKeys()
    me.state.change me.state.PLAY

  defineKeys: ->
    me.input.bindKey(me.input.KEY.A,  "left")
    me.input.bindKey(me.input.KEY.D, "right")
    me.input.bindKey(me.input.KEY.SPACE, "jump", true)
    me.input.bindKey(me.input.KEY.P, "shoot", true)
    me.input.bindMouse(me.input.mouse.LEFT, me.input.KEY.P)

  connect: ->
    @socket = io.connect('http://localhost:3000')
    @mainPlayer = new me.entityPool.newInstanceOf(
      'mainPlayer', 150, 400, { id: @socket.socket.sessionid}
    )
    me.game.add(@mainPlayer, 3)
    me.game.sort()
    @defineNetworkEvents()
    @socket.emit 'addPlayer',
      @mainPlayer.id, { x: @mainPlayer.pos.x, y: @mainPlayer.pos.y }

  # Network events
  defineNetworkEvents: ->
    @socket.on 'addPlayer', (id, data) => @addPlayer(id, data)
    @socket.on 'addPlayers', (players) => @addPlayers(players)

  addPlayer: (id, data) ->
    if @mainPlayer.id != id
      player = new me.entityPool.newInstanceOf(
        'enemyPlayer', data.x, data.y, { id: id }
      )
      @players[id] = player
      me.game.add(player, 3)
      me.game.sort

  addPlayers: (players) ->
    for id of players
      @addPlayer(id, players[id])

window.onReady onReady = ->
  game.onload()
