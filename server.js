var express = require('express');
var app = express();

app.engine('html', require('ejs').renderFile);
app.set('port', 3000);
app.set('view engine', 'html');
app.set('views', '.');

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.render('index');
});

var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var players = {};

io.sockets.on('connection', function (socket) {
  socket.emit('setSessionId', socket.id)
  socket.on('addPlayer', function (id, data) {
    players[id] = { x: data.x, y: data.y, id: id, direction: true }
    socket.broadcast.emit('addPlayer',
      id, { x: data.x, y: data.y, direction: true }
    );
    socket.emit('addPlayers', players);
  });

  socket.on('updatePlayerState', function(data) {
    if (player = players[socket.id]) {
      player.x = data.x;
      player.y = data.y;
      player.direction = data.direction;
      socket.broadcast.emit('updatePlayerState',
        player.id, { x: player.x, y: player.y, direction: player.direction }
      );
    }
  });

  socket.on('fireBullet', function(data) {
    socket.broadcast.emit('fireBullet', socket.id, data);
  });
});

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
