const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let waitingPlayer = null;
let rooms = {};

io.on('connection', (socket) => {
  socket.on('find_game', (playerName) => {
    if (waitingPlayer) {
      const roomId = `room_${socket.id}_${waitingPlayer.id}`;
      rooms[roomId] = { players: [waitingPlayer.id, socket.id] };
      
      waitingPlayer.join(roomId);
      socket.join(roomId);

      io.to(waitingPlayer.id).emit('game_start', { roomId, color: 'white', opponentName: playerName });
      io.to(socket.id).emit('game_start', { roomId, color: 'black', opponentName: waitingPlayer.name });
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      waitingPlayer.name = playerName;
      socket.emit('waiting_for_opponent');
    }
  });

  socket.on('make_move', (data) => {
    socket.to(data.roomId).emit('opponent_moved', data);
  });

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
    for (const roomId in rooms) {
      if (rooms[roomId].players.includes(socket.id)) {
        socket.to(roomId).emit('opponent_disconnected');
        delete rooms[roomId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on ${PORT}`));