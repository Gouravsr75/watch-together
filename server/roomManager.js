const rooms = new Map();

function getRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            users: new Map(),
            host: null,
            videoFile: null,
            currentTime: 0,
            isPlaying: false
        });
    }
    return rooms.get(roomId);
}

function removeUserFromRoom(roomId, socketId) {
    const room = rooms.get(roomId);
    if (room) {
        room.users.delete(socketId);
        if (room.users.size === 0) {
            rooms.delete(roomId);
        } else if (room.host === socketId) {
            room.host = Array.from(room.users.keys())[0]; // Reassign host
        }
    }
}

module.exports = { getRoom, removeUserFromRoom, rooms };