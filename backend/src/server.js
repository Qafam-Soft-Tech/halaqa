require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

// Routes
const authRoutes       = require('./routes/auth');
const proxyRoutes      = require('./routes/proxy');
const roomRoutes       = require('./routes/rooms');
const goalRoutes       = require('./routes/goals');
const readingRoutes    = require('./routes/reading');    // ← Step 10.2
const dailyRoutes      = require('./routes/daily');
const learnRoutes      = require('./routes/learn');      // ← Phase 13A
const tournamentRoutes = require('./routes/tournament'); // ← Phase 13B

// Socket
const { initSocket } = require('./sockets/sessionSocket');
const pool = require('./db/pool'); 

const app = express();
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
app.use('/api/auth',       authRoutes);
app.use('/api/daily',      dailyRoutes);
app.use('/api/proxy',      proxyRoutes);
app.use('/api/rooms',      roomRoutes);
app.use('/api/goals',      goalRoutes);
app.use('/api/reading',    readingRoutes);    // ← Step 10.2
app.use('/api/learn',      learnRoutes);      // ← Phase 13A  (words, answer, progress)
app.use('/api/coins',      learnRoutes);      // ← Phase 13A  (alias: GET /api/coins/coins)
app.use('/api/tournament', tournamentRoutes); // ← Phase 13B  (status, enter, submit)

// ── Health / Root ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ service: "Halaqa Backend API", status: "live", version: "1.0.0" });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      success: true,
      message: 'Halaqa API is running',
      db: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      success: false,
      message: 'Database unreachable',
      db: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});
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