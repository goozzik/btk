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

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(socket.id);
  });
});

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
