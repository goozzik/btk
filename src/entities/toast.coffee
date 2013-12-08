game.ToastEntity = me.ObjectEntity.extend(

  init: (x, y, settings) ->

    settings.image = 'toast'
    settings.spritewidth = '12'
    settings.spriteheight = '12'

    @parent x, y, settings

    @maxVelocity = 5
    @gravity = 0

    targetVector = new me.Vector2d(settings.target.x - x, settings.target.y - y)
    targetVector.normalize()
    targetVector.scale(new me.Vector2d(@maxVelocity, @maxVelocity))
    @setVelocity(targetVector.x, targetVector.y)

  update: ->
    @vel.x += @accel.x * me.timer.tick
    @vel.y += @accel.y * me.timer.tick
    @computeVelocity(@vel)

    @updateMovement()

)
