anim8 = require 'libs/anim8'
loader = require 'libs/Advanced-Tiled-Loader/Loader'
require 'camera'
require 'player'

GRAVITY = 400
WIDTH = 800
HEIGHT = 600

function love.load()
  love.graphics.setBackgroundColor(34, 69, 103)
  player = Player.create()
  loader.path = "maps/"
  map = loader.load("map01.tmx")
  map:setDrawRange(0, 0, map.width * map.tileWidth, map.height * map.tileHeight)
  camera:setBounds(0, 0, map.width * map.tileWidth - WIDTH, map.height * map.tileHeight - HEIGHT)
end

function love.update(dt)
  player:update(dt, map)
  camera:setPosition(math.floor(player.x - WIDTH / 2 + 200), math.floor(player.y - HEIGHT / 2))
end

function love.draw()
  camera:set()
  map:draw()
  player:draw()
  camera:unset()
  local tileX = math.floor(player.x / map.tileWidth)
  local tileY = math.floor(player.y / map.tileHeight)
  love.graphics.print("player.x: " .. player.x, 10, 10)
  love.graphics.print("player.y: " .. player.y, 10, 20)
  love.graphics.print("Current tile: ("..tileX..", "..tileY..")", 10, 30)
end

function love.keypressed(key)
  if key == "w" then
    player:jump()
  end
end

function love.keyreleased(key)
  if (key == "a") or (key == "d") then
    player:stop()
  end
end

function math.clamp(x, min, max)
  return x < min and min or (x > max and max or x)
end
