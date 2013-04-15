anim8 = require 'libs/anim8'
loader = require 'libs/Advanced-Tiled-Loader/Loader'
require 'camera'
require 'player'
require 'blotter'
require 'toast'
require 'enemy'

GRAVITY = 400
WIDTH = 800
HEIGHT = 600

function love.load()
  love.graphics.setBackgroundColor(34, 69, 103)

  -- load tiled-map
  loader.path = "maps/"
  map = loader.load("map01.tmx")
  MAP_WIDTH = map.width * map.tileWidth
  MAP_HEIGHT = map.height * map.tileHeight
  map:setDrawRange(0, 0, MAP_WIDTH, MAP_HEIGHT)
  camera:setBounds(0, 0, MAP_WIDTH - WIDTH, MAP_HEIGHT - HEIGHT)

  -- create player
  player = Player.create()

  -- create blotters
  math.randomseed(os.time())
  numBlotters = 25
  blotters = {}
  for i = 1, numBlotters do
    local blotterCollides = true
    while blotterCollides do
      local blotterX = math.random(1, map.width - 1) * map.tileWidth + map.tileWidth / 2
      local blotterY = math.random(1, map.height - 1) * map.tileHeight + map.tileHeight / 2
      blotters[i] = Blotter.create(blotterX, blotterY)
      blotterCollides = blotters[i]:isColliding(map)
    end
  end

  toasts = {}
  enemies = {}
  for i = 1, 25 do
    local enemyCollides = true
    while enemyCollides do
      local enemyX = math.random(1, map.width - 1) * map.tileWidth + map.tileWidth / 2
      local enemyY = math.random(1, map.height - 1) * map.tileHeight + map.tileHeight / 2
      enemies[i] = Enemy.create(enemyX, enemyY)
      enemyCollides = enemies[i]:isColliding(map, enemyX, enemyY)
    end
  end

  score = 0
end

function love.update(dt)
  player:update(dt, map)
  Blotter.updateAnimation(dt)
  for i in ipairs(blotters) do
    if blotters[i]:touchesObject(player) then
      score = score + 1
      table.remove(blotters, i)
    end
  end
  for i, enemy in ipairs(enemies) do
    enemy:update(dt, map)
  end
  for i, toast in ipairs(toasts) do
    toast:update(dt)
    if toast:isOut() then
      table.remove(toasts, i)
    end
    for j, enemy in ipairs(enemies) do
      if toast:touchesObject(enemy) then
        table.remove(enemies, j)
        table.remove(toasts, i)
      end
    end
  end
  camera:setPosition(math.floor(player.x - WIDTH / 2 + 200), math.floor(player.y - HEIGHT / 2))
end

function love.draw()
  camera:set()
  map:draw()
  player:draw()
  for i in ipairs(blotters) do
    blotters[i]:draw()
  end
  for i, toast in ipairs(toasts) do
    toast:draw()
  end
  for i, enemy in ipairs(enemies) do
    enemy:draw()
  end
  camera:unset()
  local tileX = math.floor(player.x / map.tileWidth)
  local tileY = math.floor(player.y / map.tileHeight)
  love.graphics.print("player.x: " .. player.x, 10, 10)
  love.graphics.print("player.y: " .. player.y, 10, 20)
  love.graphics.print("Current tile: ("..tileX..", "..tileY..")", 10, 30)
  love.graphics.print("Score: "..score, 700, 10)
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

function love.mousepressed(x, y, button)
  if button == "l" then
    toast = Toast.create(player:x2(), player.y + 40, getMapPositionFromDisplayPosition(x, y))
    table.insert(toasts, toast)
  end
end

function getMapPositionFromDisplayPosition(x, y)
  local _x, _y
  if player.x >= MAP_WIDTH - 600 then
    _x = MAP_WIDTH - WIDTH + x
  elseif player.x <= 200 then
    _x = x
  else
    _x = player.x + x - 200
  end

  if player.y >= MAP_HEIGHT - 300 then
    _y = MAP_HEIGHT - HEIGHT + y
  elseif player.y <= 300 then
    _y = y
  else
    _y = player.y + y - 300
  end

  return _x, _y
end
