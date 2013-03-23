anim8 = require 'libs/anim8'
require 'camera'
require 'player'

GRAVITY = 400
WIDTH = 800
HEIGHT = 600
FLOOR_Y = 480

function love.load()
  love.graphics.setBackgroundColor(34, 69, 103)
  player = Player.create()
  camera:setBounds(0, 0, WIDTH, math.floor(HEIGHT / 8))
end

function love.update(dt)
  player:update(dt)
  camera:setPosition(math.floor(player.x - WIDTH / 2 + 200), math.floor(player.y - HEIGHT / 2))
end

function love.draw()
  camera:set()
  player:draw()
  love.graphics.rectangle("fill", 0, FLOOR_Y , WIDTH * 2, HEIGHT)
  camera:unset()
  love.graphics.print("player.x: " .. player.x, 10, 10)
  love.graphics.print("player.y: " .. player.y, 10, 20)
end

function love.keypressed(key)
  if key == "w" then
    player:jump()
  end
end

function math.clamp(x, min, max)
  return x < min and min or (x > max and max or x)
end
