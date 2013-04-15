Enemy = {}
Enemy.__index = Enemy

function Enemy.create(x, y)
  local self = {}
  setmetatable(self, Enemy)
  self:initialize(x, y)
  return self
end

function Enemy:initialize(x, y)
  self.x = x
  self.y = y
  self.runSpeed = 80
  self.width = 50
  self.height = 80
  self.ySpeedMax = 800
  self.xSpeedMax = 800
  self.ySpeed = 0
  self.xSpeed = 0
end

function Enemy:update(dt, map)
  if not(player.y ~= self.y) then
    if player.x < self.x then
      self:moveLeft()
    elseif player.x > self.x then
      self:moveRight()
    end
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

  local nextX = self.x + (self.xSpeed * dt)
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
end

function Enemy:moveLeft()
  self.xSpeed = -1 * self.runSpeed
end

function Enemy:moveRight()
  self.xSpeed = self.runSpeed
end

function Enemy:draw()
  love.graphics.rectangle("fill", self.x, self.y, self.width, self.height)
end

function Enemy:x1()
  return self.x
end

function Enemy:x2()
  return self.x + self.width
end

function Enemy:y1()
  return self.y
end

function Enemy:y2()
  return self.y + self.height
end

function Enemy:isColliding(map, x, y)
  local tileX, tileY = math.floor(x / map.tileWidth), math.floor(y / map.tileHeight)
  local tile = map("walls")(tileX, tileY)
  return not(tile == nil)
end

function Enemy:collide(event)
  if event == "floor" then
    self.ySpeed = 0
    self.onFloor = true
  end
  if event == "ceiling" then
    self.ySpeed = 0
  end
end
