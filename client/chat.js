const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-chat');
const chatMessages = document.getElementById('chat-messages');

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    socket.emit('chat-message', { username, text });
    chatInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

socket.on('new-message', (data) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg';
    msgDiv.innerHTML = `
        <div class="msg-meta">${data.sender} • ${data.timestamp}</div>
        <div class="msg-content">${data.text}</div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});