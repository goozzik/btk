game.BunnyEntity = me.ObjectEntity.extend(

  init: (x, y, settings) ->
    @parent x, y, settings
    @setVelocity 3, 15
    @updateColRect(8, 32, -1, 0);
    me.game.viewport.follow @pos, me.game.viewport.AXIS.BOTH

  update: ->
    if me.input.isKeyPressed("left")
      @flipX true
      @vel.x -= @accel.x * me.timer.tick
    else if me.input.isKeyPressed("right")
      @flipX false
      @vel.x += @accel.x * me.timer.tick
    else
      @vel.x = 0
    if me.input.isKeyPressed("jump")
      if not @jumping and not @falling
        @vel.y = -@maxVel.y * me.timer.tick
        @jumping = true
    @updateMovement()
    if @vel.x isnt 0 or @vel.y isnt 0
      @parent()
      return true
    false

    # debug hitbox
    #
    me.debug.renderHitBox = window.debug
)
