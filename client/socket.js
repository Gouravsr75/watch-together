const socket = io();
const player = document.getElementById('main-player');
const uploadOverlay = document.getElementById('upload-overlay');

socket.emit('join-room', { roomId, username });

socket.on('room-state', (state) => {
    isHost = (socket.id === state.host);
    if (isHost) {
        document.getElementById('host-badge').classList.remove('hidden');
    } else {
        uploadOverlay.classList.add('hidden'); // Guests cannot upload
    }

    if (state.hasVideo) {
        loadVideoStream(state.currentTime, state.isPlaying);
    }
});

socket.on('user-joined', (data) => {
    showToast(`${data.username} joined the party`);
    updateUserList(data.users);
});

socket.on('user-left', (data) => {
    showToast(`Someone left the party`);
    // Remove their video
    const videoElem = document.getElementById(`cam-wrap-${data.id}`);
    if (videoElem) videoElem.remove();
});

socket.on('video-ready', () => {
    showToast('Video is ready to play!');
    loadVideoStream(0, false);
});

function loadVideoStream(time = 0, autoPlay = false) {
    uploadOverlay.classList.add('hidden');
    player.classList.remove('hidden');
    player.src = `/stream/${roomId}`;
    
    player.onloadedmetadata = () => {
        player.currentTime = time;
        if (autoPlay) player.play().catch(e => console.log('Autoplay prevented', e));
    };
}

// Intercept Local Player Events & Broadcast (Only if Host)
function emitVideoState() {
    if (!isHost || isProgrammaticUpdate) return;
    socket.emit('video-state', {
        time: player.currentTime,
        playing: !player.paused
    });
}

['play', 'pause', 'seeked'].forEach(evt => {
    player.addEventListener(evt, () => {
        if (!isProgrammaticUpdate) emitVideoState();
    });
});

// Receive Remote State Updates
socket.on('sync-video', (state) => {
    if (isHost) return; // Host dictates, doesn't listen

    isProgrammaticUpdate = true;
    
    // Check if time diff is significant to prevent stutter seeking
    if (Math.abs(player.currentTime - state.time) > 1.5) {
        player.currentTime = state.time;
    }

    if (state.playing && player.paused) {
        player.play().catch(e => console.log('Autoplay blocked'));
    } else if (!state.playing && !player.paused) {
        player.pause();
    }

    setTimeout(() => { isProgrammaticUpdate = false; }, 50);
});

function updateUserList(users) {
    const list = document.getElementById('user-list');
    list.innerHTML = '';
    document.getElementById('user-count').innerText = `👥 ${users.length}`;
    users.forEach(u => {
        const li = document.createElement('li');
        li.innerText = u.username;
        if (u.id === socket.id) li.innerText += ' (You)';
        list.appendChild(li);
    });
}