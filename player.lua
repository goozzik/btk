

function drawPlayer()
  if love.keyboard.isDown('a') then
    player_walk_left_anim:draw(image_walk_left, player.x, player.y)
    player.direction = 1
  elseif love.keyboard.isDown('d') then
    player_walk_right_anim:draw(image_walk_right, player.x, player.y)
    player.direction = 2
  else
    if player.direction == 1 then
      animation1:gotoFrame(2)
      animation1:draw(imageR, player.x, player.y)
    elseif player.direction == 2 then
      animation2:gotoFrame(1)
      animation2:draw(imageL, player.x, player.y)
    end
  end
end
