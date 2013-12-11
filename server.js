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
  console.log(socket.id)
  socket.on('addPlayer', function (id, data) {
    players[id] = { x: data.x, y: data.y, id: id }
    socket.broadcast.emit('addPlayer', id, { x: data.x, y: data.y })
    socket.emit('addPlayers', players);
  });
});

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
