// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Socket.IO mit CORS für Browser-Zugriffe
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// --- Server Port ---
const PORT = process.env.PORT || 3000;

// --- Spielkonstanten ---
const CELL_SIZE = 20;
const WIDTH = 800;
const HEIGHT = 600;
const MAX_X = WIDTH / CELL_SIZE;
const MAX_Y = HEIGHT / CELL_SIZE;
const MAX_PLAYERS = 2;

// --- Spielzustand ---
let snakes = [];
let directions = [];
let scores = [];
let food = null;

// --- Initialisierung ---
function resetGame() {
  snakes = [
    [{ x: 5 * CELL_SIZE, y: 5 * CELL_SIZE }],
    [{ x: 30 * CELL_SIZE, y: 20 * CELL_SIZE }],
  ];
  directions = ['RIGHT', 'LEFT'];
  scores = [0, 0];
  food = randomFood();
}

// --- Hilfsfunktionen ---
function randomFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * MAX_X) * CELL_SIZE,
      y: Math.floor(Math.random() * MAX_Y) * CELL_SIZE,
    };
    // Stelle sicher, dass Food nicht auf einer Schlange spawnt
  } while (snakes.some(snake => snake.some(seg => seg.x === pos.x && seg.y === pos.y)));
  return pos;
}

function moveSnake(snake, dir) {
  const head = { ...snake[0] };
  switch (dir) {
    case 'UP': head.y -= CELL_SIZE; break;
    case 'DOWN': head.y += CELL_SIZE; break;
    case 'LEFT': head.x -= CELL_SIZE; break;
    case 'RIGHT': head.x += CELL_SIZE; break;
  }

  // Wandkollision (Wrap-around)
  if (head.x < 0) head.x = WIDTH - CELL_SIZE;
  if (head.x >= WIDTH) head.x = 0;
  if (head.y < 0) head.y = HEIGHT - CELL_SIZE;
  if (head.y >= HEIGHT) head.y = 0;

  snake.unshift(head);

  // Prüfen ob Food gefressen wurde
  if (head.x === food.x && head.y === food.y) {
    return true;
  } else {
    snake.pop();
    return false;
  }
}

// --- Socket.IO Events ---
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Spieler-ID zuweisen (0 oder 1)
  let playerId = io.engine.clientsCount - 1;
  if (playerId >= MAX_PLAYERS) {
    // Mehr als 2 Spieler -> spectate mode
    socket.emit('init', { playerId: -1 });
    return;
  }

  socket.emit('init', { playerId });

  // Richtung ändern
  socket.on('direction', dir => {
    if (playerId >= 0) directions[playerId] = dir;
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    resetGame();
  });
});

// --- Game Loop ---
setInterval(() => {
  snakes.forEach((snake, i) => {
    const ate = moveSnake(snake, directions[i]);
    if (ate) {
      scores[i]++;
      food = randomFood();
    }
  });

  io.emit('state', { snakes, food, scores });
}, 150);

// --- Statische Dateien bereitstellen ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Server starten ---
resetGame();

server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});



