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
    me.entityPool.add('bullet', game.BulletEntity, true)

    @defineKeys()
    me.state.change me.state.PLAY

  defineKeys: ->
    me.input.bindKey(me.input.KEY.A,  "left")
    me.input.bindKey(me.input.KEY.D, "right")
    me.input.bindKey(me.input.KEY.SPACE, "jump", true)
    me.input.bindKey(me.input.KEY.P, "shoot", true)
    me.input.bindMouse(me.input.mouse.LEFT, me.input.KEY.P)

  connect: ->
    @socket = io.connect('http://192.168.1.101:3000')
    @socket.on 'setSessionId', (id) =>
      @mainPlayer = new me.entityPool.newInstanceOf('mainPlayer', 150, 400, { id: id })
      me.game.add(@mainPlayer, 3)
      me.game.sort()
      @socket.emit 'addPlayer',
        @mainPlayer.id, { x: @mainPlayer.pos.x, y: @mainPlayer.pos.y }
    @defineNetworkEvents()

  # Network events
  defineNetworkEvents: ->
    @socket.on 'addPlayer', (id, data) => @addPlayer(id, data)
    @socket.on 'addPlayers', (players) => @addPlayers(players)
    @socket.on 'updatePlayerState', (id, data) => @updatePlayerState(id, data)
    @socket.on 'fireBullet', (id, data) => @fireBullet(id, data)
    @socket.on 'killPlayer', (id) => @killPlayer(id)
    @socket.on 'removePlayer', (id) => @removePlayer(id)

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

  updatePlayerState: (id, data) ->
    if @players[id]? && @mainPlayer.id != id
      player = @players[id]
      player.pos.x = data.x
      player.pos.y = data.y
      player.direction = data.direction
      player.stateChanged = true

  fireBullet: (id, data) ->
    bullet = new me.entityPool.newInstanceOf('bullet',
      data.x, data.y, { target: data.target, id: id })
    me.game.add(bullet, 3)
    if @mainPlayer.id == id
      game.socket.emit 'fireBullet',
        { x: data.x, y: data.y, target: data.target }

  killPlayer: (id) ->
    console.log "Player #{id} died"

  removePlayer: (id) ->
    if @players[id]?
      me.game.remove @players[id]
      delete @players[id]

window.onReady onReady = ->
  game.onload()
