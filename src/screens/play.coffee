window.game.PlayScreen = me.ScreenObject.extend(

  onResetEvent: ->
    me.levelDirector.loadLevel "map01"

  onDestroyEvent: ->

)
