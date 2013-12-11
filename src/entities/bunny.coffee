game.PlayerEntity = me.ObjectEntity.extend(

  init: (x, y, settings) ->
    settings.image = 'bunny_run_right'
    settings.spritewidth = '50'
    settings.spriteheight = '80'
    @parent x, y, settings
    @setVelocity 3, 15
    @updateColRect(8, 32, -1, 0)
    @id = settings.id
    me.game.viewport.follow @pos, me.game.viewport.AXIS.BOTH
    #socket.emit 'addPlayer', { x: @pos.x, y: @pos.y }

  update: ->
    @stateChanged = false
    @checkMovement()
    @checkDirection() if game.mouseTarget
    @checkShoot()
    @updateMovement()
    @parent() if @vel.x isnt 0 or @vel.y isnt 0
    if @stateChanged
      game.socket.emit 'updatePlayerState',
        { x: @pos.x, y: @pos.y, direction: @direction }

    return true

  checkMovement: ->
    if me.input.isKeyPressed("left")
      @vel.x -= @accel.x * me.timer.tick
      @stateChanged = true
    else if me.input.isKeyPressed("right")
      @vel.x += @accel.x * me.timer.tick
      @stateChanged = true
    else
      @vel.x = 0
    if me.input.isKeyPressed("jump")
      if not @jumping and not @falling
        @vel.y = -@maxVel.y * me.timer.tick
        @jumping = true
    @stateChanged = true if @jumping || @falling

  checkDirection: ->
    if game.mouseTarget.x > @pos.x
      @flipX false
      @stateChanged = true unless @direction
      @direction = true
    else
      @flipX true
      @stateChanged = true if @direction
      @direction = false

  checkShoot: ->
    @shoot() if me.input.isKeyPressed('shoot')

  shoot: ->
    pos = @shootPosition()
    game.fireBullet(@id, { x: pos.x, y: pos.y, target: game.mouseTarget })

  shootPosition: ->
    x: (if @direction then @pos.x + 45 else @pos.x + 5)
    y: @pos.y + 30

)

game.NetworkPlayerEntity = me.ObjectEntity.extend(

  init: (x, y, settings) ->
    settings.image = 'bunny_run_right'
    settings.spritewidth = '50'
    settings.spriteheight = '80'
    @parent x, y, settings
    @setVelocity 3, 15
    @updateColRect(8, 32, -1, 0)
    @gravity = 0
    @state = {}

  update: ->
    @vel.x = 0
    @vel.y = 0

    @flipX !@direction

    @updateMovement()
    if @stateChanged
      @parent()
      @stateChanged = false
    return true

)
