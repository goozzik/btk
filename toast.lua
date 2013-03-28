Toast = {}
Toast.__index = Toast

toastImage = love.graphics.newImage("textures/toast.png")

function Toast.create(startX, startY, mouseX, mouseY)
  local self = {}
  setmetatable(self, Toast)
  self:initialize(startX, startY, mouseX, mouseY)
  return self
end

function Toast:initialize(startX, startY, mouseX, mouseY)
  self.speed = 750
  self.x = startX
  self.y = startY
  self.angle = math.atan2((mouseY - startY), (mouseX - startX))
  self.dX = self.speed * math.cos(self.angle)
  self.dY = self.speed * math.sin(self.angle)
  self.width = 12
  self.height = 12
end

function Toast:update(dt)
  self.x = self.x + (self.dX * dt)
  self.y = self.y + (self.dY * dt)
end

function Toast:draw()
  love.graphics.draw(toastImage, self.x, self.y, self.angle)
end

function Toast:isOut()
  return (self.x > MAP_WIDTH) or (self.y > MAP_HEIGHT)
end

function Toast:x1()
  return self.x
end

function Toast:x2()
  return self.x + self.width
end

function Toast:y1()
  return self.y
end

function Toast:y2()
  return self.y + self.height
end

function Toast:touchesObject(object)
  return ((self:x2() - 1 >= object:x1()) and (self:x1() <= object:x2() - 1)
  and (self:y2() - 1 >= object:y1()) and (self:y1() <= object:y2() - 1))
end
