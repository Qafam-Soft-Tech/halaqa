require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const http    = require('http');
const { Server } = require('socket.io');

// Routes
const authRoutes  = require('./routes/auth');
const proxyRoutes = require('./routes/proxy');
const roomRoutes  = require('./routes/rooms');
const goalRoutes  = require('./routes/goals');

// Socket
const { initSocket } = require('./sockets/sessionSocket');

const app  = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

initSocket(io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/goals', goalRoutes);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Halaqa backend running on port ' + PORT);
});

module.exports = { app, server };