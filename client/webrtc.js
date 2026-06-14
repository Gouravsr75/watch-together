// WebRTC Mesh Architecture Implementation
const peers = {}; // map of socketId -> RTCPeerConnection
const iceQueues = {}; // Prevent race conditions by queuing ICE candidates
let localStream = null;

// Better STUN servers for reliable connections
const config = { 
    'iceServers': [
        { 'urls': 'stun:stun.l.google.com:19302' },
        { 'urls': 'stun:stun1.l.google.com:19302' }
    ] 
};

const btnCam = document.getElementById('btn-cam');
const btnMic = document.getElementById('btn-mic');
const videoGrid = document.getElementById('video-grid');

async function initLocalStream() {
    try {
        // Optimized for performance and mobile devices
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user",
                frameRate: { ideal: 24 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };

        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        addVideoStream('local', localStream, 'You');
        
        socket.emit('ready-webrtc'); 
    } catch (err) {
        console.error("Media devices not accessible:", err);
        showToast("Please allow camera/mic permissions.");
    }
}

function addVideoStream(id, stream, labelText) {
    if(document.getElementById(`cam-wrap-${id}`)) return; 

    const wrapper = document.createElement('div');
    wrapper.id = `cam-wrap-${id}`;
    wrapper.className = 'cam-wrapper';

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true; // CRITICAL for iOS mobile playback
    if(id === 'local') video.muted = true; 

    const label = document.createElement('div');
    label.className = 'cam-label';
    label.innerText = labelText;

    wrapper.appendChild(video);
    wrapper.appendChild(label);
    videoGrid.appendChild(wrapper);
}

function createPeerConnection(targetId) {
    const peer = new RTCPeerConnection(config);
    peers[targetId] = peer;
    iceQueues[targetId] = [];

    if (localStream) {
        localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    }

    peer.ontrack = (event) => {
        addVideoStream(targetId, event.streams[0], `User_${targetId.substring(0,4)}`);
    };

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc-ice', { target: targetId, candidate: event.candidate });
        }
    };

    // Clean up if a user drops connection suddenly
    peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
            const videoElem = document.getElementById(`cam-wrap-${targetId}`);
            if (videoElem) videoElem.remove();
        }
    };

    return peer;
}

// Flush queued ICE candidates after connection descriptions are set
async function flushIceQueue(targetId) {
    if (iceQueues[targetId]) {
        for (const candidate of iceQueues[targetId]) {
            try {
                await peers[targetId].addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error("Error adding queued ICE:", e);
            }
        }
        iceQueues[targetId] = [];
    }
}

socket.on('user-joined', async (data) => {
    if(data.id === socket.id) return;
    const peer = createPeerConnection(data.id);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('webrtc-offer', { target: data.id, offer });
});

socket.on('webrtc-offer', async ({ sender, offer }) => {
    const peer = createPeerConnection(sender);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('webrtc-answer', { target: sender, answer });
    await flushIceQueue(sender);
});

socket.on('webrtc-answer', async ({ sender, answer }) => {
    if(peers[sender]) {
        await peers[sender].setRemoteDescription(new RTCSessionDescription(answer));
        await flushIceQueue(sender);
    }
});

socket.on('webrtc-ice', async ({ sender, candidate }) => {
    const peer = peers[sender];
    if (!peer) return;
    
    // Prevent race condition: Only add ICE if remote description is set, otherwise queue it
    if (peer.remoteDescription && peer.remoteDescription.type) {
        try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error("Error adding live ice candidate", e);
        }
    } else {
        if (!iceQueues[sender]) iceQueues[sender] = [];
        iceQueues[sender].push(candidate);
    }
});

// Controls
btnCam.addEventListener('click', () => {
    if(!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    btnCam.classList.toggle('active', videoTrack.enabled);
});

btnMic.addEventListener('click', () => {
    if(!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    btnMic.classList.toggle('active', audioTrack.enabled);
});

document.getElementById('btn-leave').addEventListener('click', () => {
    window.location.href = '/';
});

initLocalStream();