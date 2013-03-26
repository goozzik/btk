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
