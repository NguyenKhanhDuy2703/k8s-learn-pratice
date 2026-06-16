/**
 * K8s Cluster Visualizer - Backend Entry Point
 * Build: 2
 *
 * Khởi động Express server + Socket.io, sau đó bắt đầu
 * watch Pod events để push realtime về FE.
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const nodesRouter = require('./routes/nodes');
const podsRouter = require('./routes/pods');
const servicesRouter = require('./routes/services');
const execRouter = require('./routes/exec');
const { watchPods } = require('./services/watchService');

const app = express();
const server = http.createServer(app);

// --- CORS: cho phép FE (Vite mặc định :5173) gọi tới ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- REST Routes ---
app.use('/api/nodes', nodesRouter);
app.use('/api/pods', podsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/exec', execRouter);

// Health check đơn giản
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Socket.io setup ---
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// --- Bắt đầu watch Pod events, truyền io để emit về FE ---
watchPods(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
