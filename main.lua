anim8 = require 'libs/anim8'

function love.load()
   love.graphics.setBackgroundColor(34, 69, 103)

   player = {
     x = 50,
     y = 400,
     speed = 200,
     direction = 2
   }

   loadAnimations()
end

function love.update(dt)
  updatePlayerPosition(dt)
  updateAnimations(dt)
end

function love.draw()
  drawAnimations()
end

function loadAnimations()
   image_walk_left = love.graphics.newImage("textures/bunny_anim_left.png")
   player_walk_left_grid = anim8.newGrid(50, 80, image_walk_left:getWidth(), image_walk_left:getHeight())
   player_walk_left_anim = anim8.newAnimation('loop', player_walk_left_grid('1-2,1'), 0.1)

   image_walk_right = love.graphics.newImage("textures/bunny_anim_right.png")
   player_walk_right_grid = anim8.newGrid(50, 80, image_walk_right:getWidth(), image_walk_right:getHeight())
   player_walk_right_anim = anim8.newAnimation('loop', player_walk_right_grid('1-2,1'), 0.1)
end

function updatePlayerPosition(dt)
  if love.keyboard.isDown('a') then
    player.x = player.x - dt * player.speed
  elseif love.keyboard.isDown('d') then
    player.x = player.x + dt * player.speed
  end
end

function updateAnimations(dt)
  if player.direction == 1 then
    player_walk_left_anim:update(dt)
  elseif player.direction == 2 then
    player_walk_right_anim:update(dt)
  end
end

function drawAnimations()
  drawPlayer()
end

function drawPlayer()
  if love.keyboard.isDown('a') then
    player_walk_left_anim:draw(image_walk_left, player.x, player.y)
    player.direction = 1
  elseif love.keyboard.isDown('d') then
    player_walk_right_anim:draw(image_walk_right, player.x, player.y)
    player.direction = 2
  else
    if player.direction == 1 then
      player_walk_left_anim:gotoFrame(2)
      player_walk_left_anim:draw(image_walk_left, player.x, player.y)
    elseif player.direction == 2 then
      player_walk_right_anim:gotoFrame(1)
      player_walk_right_anim:draw(image_walk_right, player.x, player.y)
    end
  end
end
