anim8 = require 'libs/anim8'
require 'player'

GRAVITY = 400

function love.load()
  love.graphics.setBackgroundColor(34, 69, 103)
  player = Player.create()
end

function love.update(dt)
  player:update(dt)
end

function love.draw()
  player:draw()
  love.graphics.print("player.x: " .. player.x, 10, 10)
  love.graphics.print("player.y: " .. player.y, 10, 20)
end

function love.keypressed(key)
  if key == "w" then
    player:jump()
  end
end
