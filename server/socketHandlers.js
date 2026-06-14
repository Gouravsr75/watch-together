const { getRoom, removeUserFromRoom } = require('./roomManager');

function handleSockets(io) {
    io.on('connection', (socket) => {
        let currentRoom = null;

        socket.on('join-room', ({ roomId, username }) => {
            currentRoom = roomId;
            socket.join(roomId);
            
            const room = getRoom(roomId);
            if (!room.host) room.host = socket.id;
            
            room.users.set(socket.id, { username, id: socket.id });

            // Notify others
            socket.to(roomId).emit('user-joined', { 
                id: socket.id, 
                username, 
                users: Array.from(room.users.values()) 
            });

            // Send current state to new user
            socket.emit('room-state', {
                host: room.host,
                users: Array.from(room.users.values()),
                hasVideo: !!room.videoFile,
                currentTime: room.currentTime,
                isPlaying: room.isPlaying
            });
        });

        // Video Sync Events
        socket.on('video-state', (state) => {
            if (!currentRoom) return;
            const room = getRoom(currentRoom);
            if (socket.id !== room.host) return; // Only host controls state globally

            room.currentTime = state.time;
            room.isPlaying = state.playing;
            socket.to(currentRoom).emit('sync-video', state);
        });

        socket.on('video-uploaded', () => {
            if (!currentRoom) return;
            io.to(currentRoom).emit('video-ready');
        });

        // Chat
        socket.on('chat-message', (data) => {
            if (!currentRoom) return;
            io.to(currentRoom).emit('new-message', {
                sender: data.username,
                text: data.text,
                timestamp: new Date().toLocaleTimeString()
            });
        });

        // WebRTC Signaling
        socket.on('webrtc-offer', ({ target, offer }) => {
            socket.to(target).emit('webrtc-offer', { sender: socket.id, offer });
        });

        socket.on('webrtc-answer', ({ target, answer }) => {
            socket.to(target).emit('webrtc-answer', { sender: socket.id, answer });
        });

        socket.on('webrtc-ice', ({ target, candidate }) => {
            socket.to(target).emit('webrtc-ice', { sender: socket.id, candidate });
        });

        socket.on('disconnect', () => {
            if (currentRoom) {
                removeUserFromRoom(currentRoom, socket.id);
                const room = getRoom(currentRoom);
                io.to(currentRoom).emit('user-left', { 
                    id: socket.id,
                    newHost: room ? room.host : null
                });
            }
        });
    });
}

module.exports = { handleSockets };