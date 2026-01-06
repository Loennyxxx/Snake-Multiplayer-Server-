<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Snake Multiplayer</title>
  <style>
    canvas { background: black; display:block; margin:auto; }
  </style>
</head>
<body>
<canvas id="gameCanvas" width="800" height="600"></canvas>

<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
const socket = io('http://localhost:3000'); // hier später öffentliche URL

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CELL_SIZE = 20;

let playerId = 0;

// Initialisierung
socket.on('init', (data) => { playerId = data.playerId; });

// Spielzustand empfangen
let snakes = [], food = {}, scores = [0,0];
socket.on('state', (data)=>{
  snakes = data.snakes;
  food = data.food;
  scores = data.scores;
  draw();
});

// Tasteneingaben
document.addEventListener('keydown', e => {
  let dir;
  if(e.key === 'ArrowUp') dir='UP';
  if(e.key === 'ArrowDown') dir='DOWN';
  if(e.key === 'ArrowLeft') dir='LEFT';
  if(e.key === 'ArrowRight') dir='RIGHT';
  if(dir) socket.emit('direction', dir);
});

// Zeichnen
function draw(){
  ctx.fillStyle='black';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const colors = ['green','yellow'];
  // Schlangen
  snakes.forEach((snake,i)=>{
    ctx.fillStyle = colors[i];
    snake.forEach(seg=>{
      ctx.fillRect(seg.x, seg.y, CELL_SIZE, CELL_SIZE);
    });
  });
  // Apfel
  ctx.fillStyle='red';
  ctx.fillRect(food.x, food.y, CELL_SIZE, CELL_SIZE);

  // Scores
  ctx.fillStyle='white';
  ctx.font='30px Arial';
  ctx.fillText(`Player 1: ${scores[0]}`,10,30);
  ctx.fillText(`Player 2: ${scores[1]}`,10,70);
}
</script>
</body>
</html>
