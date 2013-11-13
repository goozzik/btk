game.ToastEntity = me.ObjectEntity.extend(

  init: (x, y) ->
    settings = { image: 'toast', spritewidth: '12', spriteheight: '12' }
    @parent x, y, settings

  update: ->
    console.log @pos
    @updateMovement()

)
