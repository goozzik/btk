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
  self.width = 50
  self.height = 80
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

