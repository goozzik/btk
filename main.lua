anim8 = require 'libs/anim8'

function love.load()
   love.graphics.setBackgroundColor(34, 69, 103)

   player = {
     x = 50,
     y = 400,
     x_speed = 200,
     y_speed = 0,
     jump_height = 300,
     direction = 2
   }

   gravity = 400

   loadAnimations()
end

function love.update(dt)
  updatePlayerPosition(dt)
  updateAnimations(dt)
end

function love.draw()
  drawAnimations()
  love.graphics.print("player.x: " .. player.x, 10, 10)
  love.graphics.print("player.y: " .. player.y, 10, 20)
end

function love.keypressed(key)
  if key == "w" then
    if player.y_speed == 0 then -- we're probably on the ground, let's jump
      player.y_speed = player.jump_height
    end
  end
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
    player.x = player.x - dt * player.x_speed
  elseif love.keyboard.isDown('d') then
    player.x = player.x + dt * player.x_speed
  end
  if player.y_speed ~= 0 then
    player.y = player.y - player.y_speed * dt
    player.y_speed = player.y_speed - gravity * dt
    if player.y > 400 then
      player.y_speed = 0
      player.y = 400
    end
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
