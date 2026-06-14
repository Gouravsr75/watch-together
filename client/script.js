// UI State & Global Variables
const roomId = window.location.pathname.substring(1);
const username = localStorage.getItem('wt_username') || 'Guest_' + Math.floor(Math.random()*1000);
document.getElementById('display-room-code').innerText = roomId;

let isHost = false;
let isProgrammaticUpdate = false; 

// UI Toggles
function switchTab(tab) {
    document.getElementById('chat-panel').classList.toggle('hidden', tab !== 'chat');
    document.getElementById('users-panel').classList.toggle('hidden', tab !== 'users');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
}

// Copy Code
document.getElementById('btn-copy-code').addEventListener('click', () => {
    navigator.clipboard.writeText(roomId);
    showToast('Room code copied!');
});

// Toast System
function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// Upload Handling
const uploadInput = document.getElementById('movie-upload');
if (uploadInput) {
    uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('movie', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/upload/${roomId}`, true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                document.getElementById('upload-progress').classList.remove('hidden');
                document.getElementById('upload-progress').value = percent;
                document.getElementById('upload-status').innerText = `Uploading... ${Math.round(percent)}%`;
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                document.getElementById('upload-status').innerText = 'Upload complete! Starting stream...';
                socket.emit('video-uploaded');
            } else {
                document.getElementById('upload-status').innerText = 'Upload failed.';
            }
        };
        xhr.send(formData);
    });
}