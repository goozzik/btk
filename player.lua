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
  self.xSpeed = 0
  self.runSpeed = 200
  self.ySpeed = 0
  self.jumpSpeed = -500
  self.xSpeedMax = 800
  self.ySpeedMax = 800
  self.direction = 2
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

function Player:update(dt, map)
  if love.keyboard.isDown('a') then
    self:moveLeft()
  elseif love.keyboard.isDown('d') then
    self:moveRight()
  end

  self.ySpeed = self.ySpeed + (GRAVITY * dt)
  self.xSpeed = math.clamp(self.xSpeed, -self.xSpeedMax, self.xSpeedMax)
  self.ySpeed = math.clamp(self.ySpeed, -self.ySpeedMax, self.ySpeedMax)

  local nextY = math.floor(self.y + (self.ySpeed * dt))

  if self.ySpeed < 0 then
    if not(self:isColliding(map, self.x, nextY))
    and not(self:isColliding(map, self.x + self.width - 1, nextY)) then
      self.y = nextY
      self.onFloor = false
    else
      self.y = nextY + map.tileHeight - ((nextY) % map.tileHeight)
      self:collide("ceiling")
    end
  elseif self.ySpeed > 0 then
    if not(self:isColliding(map, self.x, nextY + self.height))
    and not(self:isColliding(map, self.x + self.width - 1, nextY + self.height)) then
      self.y = nextY
      self.onFloor = false
    else
      self.y = nextY - ((nextY + self.height) % map.tileHeight)
      self:collide("floor")
    end
  end

  local nextX = math.floor(self.x + (self.xSpeed * dt))

  if self.xSpeed > 0 then
    if not(self:isColliding(map, nextX + self.width, self.y))
    and not(self:isColliding(map, nextX + self.width, self.y + self.width - 1)) then
      self.x = nextX
    else
      self.x = nextX - ((nextX + self.width) % map.tileWidth)
    end
  elseif self.xSpeed < 0 then
    if not(self:isColliding(map, nextX, self.y))
    and not(self:isColliding(map, nextX, self.y + self.width - 1)) then
      self.x = nextX
    else
      self.x = nextX + map.tileWidth - ((nextX) % map.tileWidth)
    end
  end

  self.state = self:getState()
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
  if self.onFloor then
    self.ySpeed = self.jumpSpeed
  end
end

function Player:getState()
  local myState = ""
  if self.onFloor then
    if self.xSpeed > 0 then
      myState = "moveRight"
    elseif self.xSpeed < 0 then
      myState = "moveLeft"
    else
      myState = "stand"
    end
  end
  if self.ySpeed < 0 then
    myState = "jump"
  elseif self.ySpeed > 0 then
    myState = "fall"
  end
  return myState
end

function Player:isColliding(map, x, y)
  local tileX, tileY = math.floor(x / map.tileWidth), math.floor(y / map.tileHeight)
  local tile = map("walls")(tileX, tileY)
  return not(tile == nil)
end

function Player:collide(event)
  if event == "floor" then
    self.ySpeed = 0
    self.onFloor = true
  end
  if event == "ceiling" then
    self.ySpeed = 0
  end
end

function Player:moveLeft()
  self.xSpeed = -1 * self.runSpeed
end

function Player:moveRight()
  self.xSpeed = self.runSpeed
end

function Player:stop()
  self.xSpeed = 0
end
