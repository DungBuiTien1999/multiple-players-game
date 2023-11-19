const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');

const socket = io();

const scoreEl = document.querySelector('#scoreEl');

const devicePixelRadio = window.devicePixelRatio || 1;

canvas.width = 1024 * devicePixelRadio;
canvas.height = 576 * devicePixelRadio;

c.scale(devicePixelRadio, devicePixelRadio);

const x = canvas.width / 2;
const y = canvas.height / 2;

const frontEndPlayers = {};
const frontEndProjectiles = {};

const keys = {
  a: {
    pressed: false
  },
  d: {
    pressed: false
  },
  w: {
    pressed: false
  },
  s: {
    pressed: false
  }
};
let lastKey = '';
const SPEED = 10;
const playerInputs = [];

socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id];
    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color || 'white',
        velocity: backEndProjectile.velocity
      });
    } else {
      gsap.to(frontEndProjectiles[id], {
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        duration: 0.015,
        ease: 'linear'
      });
    }
  }

  for (const id in frontEndProjectiles) {
    if (!backEndProjectiles[id]) delete frontEndProjectiles[id];
  }
});

socket.on('updatePlayers', (backendPlayers) => {
  for (const id in backendPlayers) {
    const backendPlayer = backendPlayers[id];
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backendPlayer.x,
        y: backendPlayer.y,
        radius: 10,
        color: backendPlayer.color,
        username: backendPlayer.username
      });

      document.querySelector(
        '#playerLabels'
      ).innerHTML += `<div data-id="${id}" data-score="${backendPlayer.score}">${backendPlayer.username}: ${backendPlayer.score}</div>`;
    } else {
      // update player score
      const divToUpdate = document.querySelector(`div[data-id="${id}"]`);
      divToUpdate.innerHTML = `${backendPlayer.username}: ${backendPlayer.score}`;
      divToUpdate.setAttribute('data-score', backendPlayer.score);

      // sort player div
      const parentsDiv = document.querySelector('#playerLabels');
      const childDivs = Array.from(parentsDiv.querySelectorAll('div'));
      childDivs.sort(
        (a, b) => +b.getAttribute('data-score') - a.getAttribute('data-score')
      );

      // remove old children
      parentsDiv.innerHTML = '';

      // add sorted children
      childDivs.forEach((item) => {
        parentsDiv.appendChild(item);
      });

      if (id === socket.id) {
        // if a player is already exists
        frontEndPlayers[id].x = backendPlayer.x;
        frontEndPlayers[id].y = backendPlayer.y;

        const lastBEInputIndex = playerInputs.findIndex(
          (input) => input.sequenceNumber === backendPlayer.sequenceNumber
        );
        if (lastBEInputIndex) playerInputs.splice(0, lastBEInputIndex + 1);
        playerInputs.forEach((input) => {
          frontEndPlayers[id].x += input.dx;
          frontEndPlayers[id].y += input.dy;
        });
      } else {
        // for all other player
        gsap.to(frontEndPlayers[id], {
          x: backendPlayer.x,
          y: backendPlayer.y,
          duration: 0.015,
          ease: 'linear'
        });
      }
    }
  }

  // this is where we delete frontend players
  for (const id in frontEndPlayers) {
    if (!backendPlayers[id]) {
      const divToDelete = document.querySelector(`div[data-id="${id}"]`);
      divToDelete.parentNode.removeChild(divToDelete);

      if (id === socket.id)
        document.querySelector('#usernameForm').style.display = 'block';

      delete frontEndPlayers[id];
    }
  }
});

let animationId;
function animate() {
  animationId = requestAnimationFrame(animate);
  // c.fillStyle = 'rgba(0, 0, 0, 0.1)';
  // c.fillRect(0, 0, canvas.width, canvas.height);
  c.clearRect(0, 0, canvas.width, canvas.height);

  for (const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id];
    frontEndPlayer.draw();
  }

  for (const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id];
    frontEndProjectile.draw();
  }

  // for(let i = frontEndProjectiles.length - 1; i >= 0; i--) {
  //   frontEndProjectiles[i].update();
  // }
}

animate();

let sequenceNumber = 0;
setInterval(() => {
  if (keys.a.pressed) {
    sequenceNumber++;
    playerInputs.push({ sequenceNumber, dx: -SPEED, dy: 0 });
    frontEndPlayers[socket.id].x -= SPEED;
    socket.emit('keydown', { key: 'a', sequenceNumber });
  }
  if (keys.d.pressed) {
    sequenceNumber++;
    playerInputs.push({ sequenceNumber, dx: SPEED, dy: 0 });
    frontEndPlayers[socket.id].x += SPEED;
    socket.emit('keydown', { key: 'd', sequenceNumber });
  }
  if (keys.w.pressed) {
    sequenceNumber++;
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED });
    frontEndPlayers[socket.id].y -= SPEED;
    socket.emit('keydown', { key: 'w', sequenceNumber });
  }
  if (keys.s.pressed) {
    sequenceNumber++;
    playerInputs.push({ sequenceNumber, dx: 0, dy: SPEED });
    frontEndPlayers[socket.id].y += SPEED;
    socket.emit('keydown', { key: 's', sequenceNumber });
  }
}, 15);

addEventListener('keydown', ({ key }) => {
  if (!frontEndPlayers[socket.id]) return;
  switch (key) {
    case 'a':
      keys.a.pressed = true;
      lastKey = 'a';
      break;
    case 'd':
      keys.d.pressed = true;
      lastKey = 'd';
      break;
    case 'w':
      keys.w.pressed = true;
      lastKey = 'w';
      break;
    case 's':
      keys.s.pressed = true;
      lastKey = 's';
      break;
  }
});

addEventListener('keyup', ({ key }) => {
  switch (key) {
    case 'a':
      keys.a.pressed = false;
      break;
    case 'd':
      keys.d.pressed = false;
      break;
    case 'w':
      keys.w.pressed = false;
      break;
    case 's':
      keys.s.pressed = false;
      break;
  }
});

document.querySelector('#usernameForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.querySelector('#usernameForm').style.display = 'none';
  socket.emit('initGame', {
    username: document.querySelector('#usernameInput').value,
    width: canvas.width,
    height: canvas.height
  });
});
