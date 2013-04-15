Blotter = {}
Blotter.__index = Blotter

blotterImage = love.graphics.newImage("textures/blotter_anim.png")
local blotterGrid = anim8.newGrid(32, 32, blotterImage:getWidth(), blotterImage:getHeight())
blotterAnimation = anim8.newAnimation('loop', blotterGrid('1-6,1'), 0.2)

function Blotter.updateAnimation(dt)
  blotterAnimation:update(dt)
end

function Blotter.create(blotterX, blotterY)
  local self = {}
  setmetatable(self, Blotter)
  self:initialize(blotterX, blotterY)
  return self
end

function Blotter:initialize(blotterX, blotterY)
  self.x = blotterX
  self.y = blotterY
  self.width = 32
  self.height = 32
  self.delay = 200
  self.delta = 0
  self.maxDelta = 10
end

function Blotter:draw()
  blotterAnimation:draw(blotterImage, self.x, self.y)
end

function Blotter:isColliding(map)
  local tileX, tileY = math.floor(self.x / map.tileWidth), math.floor(self.y / map.tileHeight)
  local tile = map("walls")(tileX, tileY)
  return not(tile == nil)
end

function Blotter:x1()
  return self.x
end

function Blotter:x2()
  return self.x + self.width
end

function Blotter:y1()
  return self.y
end

function Blotter:y2()
  return self.y + self.height
end

function Blotter:touchesObject(object)
  return ((self:x2() - 1 >= object:x1()) and (self:x1() <= object:x2() - 1)
  and (self:y2() - 1 >= object:y1()) and (self:y1() <= object:y2() - 1))
end
