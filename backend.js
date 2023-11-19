const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 });

const port = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const backEndPlayers = {};
const backEndProjectiles = {};
const SPEED = 10;
const PLAYER_RADIUS = 10;
const PROJECTILE_RADIUS = 5;

let projectileID = 0;
io.on('connection', (socket) => {
  io.emit('updatePlayers', backEndPlayers);

  socket.on('shot', ({ x, y, angle }) => {
    projectileID++;

    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    };
    backEndProjectiles[projectileID] = {
      x,
      y,
      velocity,
      playerId: socket.id
    };
  });

  socket.on('initGame', ({ username, width, height }) => {
    backEndPlayers[socket.id] = {
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      color: `hsl(${Math.random() * 260}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username
    };
    backEndPlayers[socket.id].canvas = {
      width,
      height
    };
    backEndPlayers[socket.id].radius = PLAYER_RADIUS;
  });

  socket.on('disconnect', (reason) => {
    delete backEndPlayers[socket.id];
    io.emit('updatePlayers', backEndPlayers);
  });

  socket.on('keydown', ({ key, sequenceNumber }) => {
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber;
    switch (key) {
      case 'a':
        backEndPlayers[socket.id].x -= SPEED;
        break;
      case 'd':
        backEndPlayers[socket.id].x += SPEED;
        break;
      case 'w':
        backEndPlayers[socket.id].y -= SPEED;
        break;
      case 's':
        backEndPlayers[socket.id].y += SPEED;
        break;
    }

    const playerSides = {
      left: backEndPlayers[socket.id].x - backEndPlayers[socket.id].radius,
      right: backEndPlayers[socket.id].x + backEndPlayers[socket.id].radius,
      top: backEndPlayers[socket.id].y - backEndPlayers[socket.id].radius,
      bottom: backEndPlayers[socket.id].y + backEndPlayers[socket.id].radius
    };
    if (playerSides.left < 0)
      backEndPlayers[socket.id].x = backEndPlayers[socket.id].radius;
    if (playerSides.right > 1024)
      backEndPlayers[socket.id].x = 1024 - backEndPlayers[socket.id].radius;
    if (playerSides.top < 0)
      backEndPlayers[socket.id].y = backEndPlayers[socket.id].radius;
    if (playerSides.bottom > 576)
      backEndPlayers[socket.id].y = 576 - backEndPlayers[socket.id].radius;
  });
});

// backend ticker
setInterval(() => {
  // update projectile positions
  for (const id in backEndProjectiles) {
    const backendProjectile = backEndProjectiles[id];
    backendProjectile.x += backendProjectile.velocity.x;
    backendProjectile.y += backendProjectile.velocity.y;

    if (
      backendProjectile.x - PROJECTILE_RADIUS >=
        backEndPlayers[backendProjectile?.playerId]?.canvas?.width ||
      backendProjectile.x + PROJECTILE_RADIUS <= 0 ||
      backendProjectile.y - PROJECTILE_RADIUS >=
        backEndPlayers[backendProjectile?.playerId]?.canvas?.height ||
      backendProjectile.y + PROJECTILE_RADIUS <= 0
    ) {
      delete backEndProjectiles[id];
      continue;
    }

    for (const playerId in backEndPlayers) {
      const backendPlayer = backEndPlayers[playerId];
      const distance = Math.hypot(
        backendProjectile.x - backendPlayer.x,
        backendProjectile.y - backendPlayer.y
      );

      // collision detection
      if (
        playerId !== backendProjectile.playerId &&
        distance <= backendPlayer.radius + PROJECTILE_RADIUS
      ) {
        if (backEndPlayers[backendProjectile.playerId])
          backEndPlayers[backendProjectile.playerId].score += 10;
        delete backEndProjectiles[id];
        delete backEndPlayers[playerId];
        break;
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles);
  io.emit('updatePlayers', backEndPlayers);
}, 15);

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
