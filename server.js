// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // npm install uuid

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

const PORT = process.env.PORT || 3000;

// Spiel Konstanten
const CELL_SIZE = 20;
const WIDTH = 800;
const HEIGHT = 600;
const MAX_X = WIDTH / CELL_SIZE;
const MAX_Y = HEIGHT / CELL_SIZE;
const MAX_PLAYERS = 2;

// Spielzustand
let snakes = [];
let directions = [];
let scores = [];
let food = null;

// Spieler-Daten
let players = {}; // { playerName: { id: UUID, score: 0 } }

// Initialisierung
function resetGame() {
  snakes = [
    [{ x: 5*CELL_SIZE, y: 5*CELL_SIZE }],
    [{ x: 30*CELL_SIZE, y: 20*CELL_SIZE }]
  ];
  directions = ['RIGHT','LEFT'];
  scores = [0,0];
  food = randomFood();
}

function randomFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random()*MAX_X)*CELL_SIZE, y: Math.floor(Math.random()*MAX_Y)*CELL_SIZE };
  } while(snakes.some(snake=>snake.some(seg=>seg.x===pos.x && seg.y===pos.y)));
  return pos;
}

function moveSnake(snake, dir) {
  const head = {...snake[0]};
  switch(dir){
    case 'UP': head.y -= CELL_SIZE; break;
    case 'DOWN': head.y += CELL_SIZE; break;
    case 'LEFT': head.x -= CELL_SIZE; break;
    case 'RIGHT': head.x += CELL_SIZE; break;
  }
  if(head.x<0) head.x=WIDTH-CELL_SIZE;
  if(head.x>=WIDTH) head.x=0;
  if(head.y<0) head.y=HEIGHT-CELL_SIZE;
  if(head.y>=HEIGHT) head.y=0;

  snake.unshift(head);
  if(head.x===food.x && head.y===food.y) return true;
  snake.pop();
  return false;
}

// --- Socket.IO Events ---
io.on('connection', socket => {
  console.log('Player connected:', socket.id);

  // Spieler tritt bei mit Name
  socket.on('joinGame', playerName => {
    let player;
    if(players[playerName]) player = players[playerName]; // bestehende ID
    else {
      player = { id: uuidv4(), score: 0 };
      players[playerName] = player;
    }
    socket.playerName = playerName;
    socket.playerId = player.id;

    // ID zuweisen
    let index = io.engine.clientsCount - 1;
    if(index >= MAX_PLAYERS) {
      socket.emit('init', { playerId: -1, playerName });
      return;
    }

    socket.emit('init', { playerId: player.id, playerName });
  });

  // Richtung ändern
  socket.on('direction', dir => {
    if(socket.playerId && socket.playerId!==-1){
      directions[0] = dir; // Simplified für 2 Spieler
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    resetGame();
  });
});

// --- Game Loop ---
setInterval(() => {
  snakes.forEach((snake,i)=>{
    const ate = moveSnake(snake,directions[i]);
    if(ate){
      scores[i]++;
      food = randomFood();
    }
  });
  io.emit('state',{ snakes, food, scores });
}, 150);

// Statische Dateien
app.use(express.static(path.join(__dirname,'public')));

// Server starten
resetGame();
server.listen(PORT, ()=>console.log(`Server läuft auf Port ${PORT}`));
