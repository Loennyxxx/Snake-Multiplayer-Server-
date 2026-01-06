// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // erlaubt alle Clients
    methods: ['GET', 'POST']
  }
});

// Serverport Render automatisch, lokal 3000
const PORT = process.env.PORT || 3000;

// --- Spielkonstanten ---
const CELL_SIZE = 20;
const WIDTH = 800;
const HEIGHT = 600;
const MAX_X = WIDTH / CELL_SIZE;
const MAX_Y = HEIGHT / CELL_SIZE;

// --- Spielzustand ---
let snakes = [
  [{ x: 5 * CELL_SIZE, y: 5 * CELL_SIZE }],
  [{ x: 30 * CELL_SIZE, y: 20 * CELL_SIZE }]
];
let directions = ['RIGHT', 'LEFT'];
let scores = [0, 0];
let food = randomFood();

// --- Hilfsfunktionen ---
function randomFood() {
  return {
    x: Math.floor(Math.random() * MAX_X) * CELL_SIZE,
    y: Math.floor(Math.random() * MAX_Y) * CELL_SIZE
  };
}

function moveSnake(snake, dir) {
  const head = { ...snake[0] };
  if (dir === 'UP') head.y -= CELL_SIZE;
  if (dir === 'DOWN') head.y += CELL_SIZE;
  if (dir === 'LEFT') head.x -= CELL_SIZE;
  if (dir === 'RIGHT') head.x += CELL_SIZE;

  // Wandkollision (Wrap-around)
  if (head.x < 0) head.x = WIDTH - CELL_SIZE;
  if (head.x >= WIDTH) head.x = 0;
  if (head.y < 0) head.y = HEIGHT - CELL_SIZE;
  if (head.y >= HEIGHT) head.y = 0;

  snake.unshift(head);

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
  if (playerId > 1) playerId = 1; 
  socket.emit('init', { playerId });

  // Richtung ändern
  socket.on('direction', (dir) => {
    directions[playerId] = dir;
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    // Spiel zurücksetzen
    snakes = [
      [{ x: 5 * CELL_SIZE, y: 5 * CELL_SIZE }],
      [{ x: 30 * CELL_SIZE, y: 20 * CELL_SIZE }]
    ];
    directions = ['RIGHT', 'LEFT'];
    scores = [0, 0];
    food = randomFood();
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

// --- Statische Dateien (HTML/JS/CSS) ---
app.use(express.static(path.join(__dirname, 'public')));
// Falls du index.html direkt im Hauptordner hast, alternativ:
// app.use(express.static(__dirname));

server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
