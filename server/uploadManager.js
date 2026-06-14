const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getRoom } = require('./roomManager');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.params.roomId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5000000000 }, // 5GB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/x-matroska'];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type'));
    }
});

function setupUploads(app) {
    app.post('/upload/:roomId', upload.single('movie'), (req, res) => {
        const roomId = req.params.roomId;
        const room = getRoom(roomId);
        
        // Clean up previous file if exists
        if (room.videoFile && fs.existsSync(room.videoFile.path)) {
            fs.unlinkSync(room.videoFile.path);
        }

        room.videoFile = {
            path: req.file.path,
            mimeType: req.file.mimetype,
            name: req.file.originalname
        };
        room.currentTime = 0;
        room.isPlaying = false;

        res.json({ success: true, message: 'File uploaded' });
    });
}

function streamVideo(req, res) {
    const room = getRoom(req.params.roomId);
    if (!room || !room.videoFile || !fs.existsSync(room.videoFile.path)) {
        return res.status(404).send('No video found for this room.');
    }

    const videoPath = room.videoFile.path;
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': room.videoFile.mimeType,
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': room.videoFile.mimeType,
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
}

module.exports = { setupUploads, streamVideo };