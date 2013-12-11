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
    @checkMovement()
    @checkDirection() if game.mouseTarget
    @checkShoot()
    @updateMovement()
    @parent() if @vel.x isnt 0 or @vel.y isnt 0
    # debug hitbox
    me.debug.renderHitBox = window.debug
    return true

  checkMovement: ->
    if me.input.isKeyPressed("left")
      @vel.x -= @accel.x * me.timer.tick
    else if me.input.isKeyPressed("right")
      @vel.x += @accel.x * me.timer.tick
    else
      @vel.x = 0
    if me.input.isKeyPressed("jump")
      if not @jumping and not @falling
        @vel.y = -@maxVel.y * me.timer.tick
        @jumping = true

  checkDirection: ->
    if game.mouseTarget.x > @pos.x
      @flipX false
      @direction = true
    else
      @flipX true
      @direction = false

  checkShoot: ->
    @shoot() if me.input.isKeyPressed('shoot')

  shoot: ->
    pos = @shootPosition()
    toast = new me.entityPool.newInstanceOf('toast', pos.x, pos.y, { target: game.mouseTarget })
    me.game.add(toast, @z)
    me.game.sort()

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

    @flipX true if @state['left']
    @flipX false if @state['right']

    @updateMovement()
    @parent()
    @state = {}
    return true

)
