Player = {}
Player.__index = Player

function Player.create()
  local self = {}
  setmetatable(self, Player)
  self:initialize()
  return self
end

function Player:initialize()
  self.x = 50
  self.y = 400
  self.x_speed = 200
  self.y_speed = 0
  self.direction = 2
  self.jump_height = 200
  self.width = 50
  self.height = 80
  self:loadAnimations()
end

function Player:loadAnimations()
   self.image_walk_left = love.graphics.newImage("textures/bunny_anim_left.png")
   local walk_left_grid = anim8.newGrid(50, 80, self.image_walk_left:getWidth(), self.image_walk_left:getHeight())
   self.walk_left_anim = anim8.newAnimation('loop', walk_left_grid('1-2,1'), 0.1)

   self.image_walk_right = love.graphics.newImage("textures/bunny_anim_right.png")
   local walk_right_grid = anim8.newGrid(50, 80, self.image_walk_right:getWidth(), self.image_walk_right:getHeight())
   self.walk_right_anim = anim8.newAnimation('loop', walk_right_grid('1-2,1'), 0.1)
end

function Player:update(dt)
  if love.keyboard.isDown('a') then
    self.x = self.x - dt * self.x_speed
  elseif love.keyboard.isDown('d') then
    self.x = self.x + dt * self.x_speed
  end
  self.x = math.clamp(self.x, 0, WIDTH * 2 - 50)
  if self.y_speed ~= 0 then
    self.y = self.y - self.y_speed * dt
    self.y_speed = self.y_speed - GRAVITY * dt
    if self.y > 400 then
      self.y_speed = 0
      self.y = 400
    end
  end
  self:updateAnimations(dt)
end

function Player:updateAnimations(dt)
  if self.direction == 1 then
    self.walk_left_anim:update(dt)
  elseif self.direction == 2 then
    self.walk_right_anim:update(dt)
  end
end

function Player:draw()
  if love.keyboard.isDown('a') then
    self.walk_left_anim:draw(self.image_walk_left, self.x, self.y)
    self.direction = 1
  elseif love.keyboard.isDown('d') then
    self.walk_right_anim:draw(self.image_walk_right, self.x, self.y)
    self.direction = 2
  else
    if self.direction == 1 then
      self.walk_left_anim:gotoFrame(2)
      self.walk_left_anim:draw(self.image_walk_left, self.x, self.y)
    elseif self.direction == 2 then
      self.walk_right_anim:gotoFrame(1)
      self.walk_right_anim:draw(self.image_walk_right, self.x, self.y)
    end
  end
end

function Player:jump()
  if self.y_speed == 0 then -- we're probably on the ground, let's jump
    self.y_speed = self.jump_height
  end
end
