const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const { handleSockets } = require('./socketHandlers');
const { setupUploads, streamVideo } = require('./uploadManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

// Set up routes
setupUploads(app);
app.get('/stream/:roomId', streamVideo);

// Set up WebSockets
handleSockets(io);

// Fallback routing
app.get('/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/room.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Watch Together running on http://localhost:${PORT}`);
});