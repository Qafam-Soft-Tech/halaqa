// src/sockets/sessionSocket.js
const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);

    // ── join-session ────────────────────────────────────────────────────────
    socket.on('join-session', ({ roomId }) => {
      socket.join(roomId);
      console.log('User joined session room:', roomId);
    });

    // ── new-annotation ──────────────────────────────────────────────────────
    socket.on('new-annotation', ({ roomId, verseKey, note, username }) => {
      socket.to(roomId).emit('annotation-received', {
        verseKey,
        note,
        username,
        timestamp: new Date().toISOString(),
      });
    });

    // ── leave-session ───────────────────────────────────────────────────────
    socket.on('leave-session', ({ roomId }) => {
      socket.leave(roomId);
    });

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};

module.exports = { initSocket };
