addEventListener('click', (event) => {
  if (!frontEndPlayers[socket.id]) return;
  const canvas = document.querySelector('canvas');
  const { left, top } = canvas.getBoundingClientRect();
  const playerPosition = {
    x: frontEndPlayers[socket.id].x,
    y: frontEndPlayers[socket.id].y
  };

  const angle = Math.atan2(
    event.clientY - top - playerPosition.y,
    event.clientX - left - playerPosition.x
  );

  socket.emit('shot', {
    x: playerPosition.x,
    y: playerPosition.y,
    angle
  });
});
