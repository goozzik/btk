game.BulletEntity = me.ObjectEntity.extend(

  init: (x, y, settings) ->
    settings.image = 'toast'
    settings.spritewidth = '12'
    settings.spriteheight = '12'
    @parent x, y, settings
    @id = settings.id
    @collidable = true
    @maxVelocity = 5
    @gravity = 0
    @target = settings.target
    targetVector = new me.Vector2d(settings.target.x - x, settings.target.y - y)
    targetVector.normalize()
    targetVector.scale(new me.Vector2d(@maxVelocity, @maxVelocity))
    @setVelocity(targetVector.x, targetVector.y)

  update: ->
    @vel.x += @accel.x * me.timer.tick
    @vel.y += @accel.y * me.timer.tick
    @computeVelocity(@vel)
    @updateMovement()
    @checkForEnvCollision(me.game.collide(@))

  checkForEnvCollision: (res) ->
    if res && res.obj.id != @id
      if res.obj.id == game.mainPlayer.id
        game.socket.emit('killPlayer', @id)
        game.mainPlayer.respawn()
      me.game.remove(@)
    if @vel.x == 0 || @vel.y == 0
      me.game.remove(@)

)
