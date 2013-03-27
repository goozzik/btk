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
