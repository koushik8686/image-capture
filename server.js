require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const checkpoint = req.body.checkpoint_name || 'default';
        const uploadPath = path.join(__dirname, 'uploads', 'original', checkpoint);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const timestamp = Date.now();
        const uniqueId = uuidv4().slice(0, 8);
        const bufferName = `${timestamp}-${uniqueId}${ext}`;

        req.generatedFilename = bufferName;
        req.generatedImageId = `img_${timestamp}_${uniqueId}`;

        cb(null, bufferName);
    }
});

const spoofStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { checkpoint_name } = req.query;

        if (!checkpoint_name) {
            return cb(new Error('checkpoint_name query param required'));
        }

        const uploadPath = path.join(__dirname, 'uploads', 'spoofed', checkpoint_name);
        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },

    filename: async (req, file, cb) => {
        try {
            const { image_id, checkpoint_name } = req.query;

            if (!image_id || !checkpoint_name) {
                return cb(new Error('image_id & checkpoint_name query params required'));
            }

            // 🔒 Lookup original filename from DB (SOURCE OF TRUTH)
            const result = await pool.query(
                `SELECT original_filename 
                 FROM image_info 
                 WHERE image_id = $1 AND checkpoint_name = $2`,
                [image_id, checkpoint_name]
            );

            if (result.rows.length === 0) {
                return cb(new Error('Original image not found'));
            }

            // ✅ FORCE spoof to use exact same filename
            cb(null, result.rows[0].original_filename);

        } catch (err) {
            cb(err);
        }
    }
});


const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images allowed.'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const uploadSpoof = multer({
    storage: spoofStorage,
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images allowed.'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

// WebSocket device tracking
const displays = new Map(); // checkpoint_name -> socket_id
const cameras = new Map();  // checkpoint_name -> socket_id

// Initialize database tables
async function initDatabase() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS image_info (
        image_id VARCHAR(255) PRIMARY KEY,
        checkpoint_name VARCHAR(255) NOT NULL,
        is_processed BOOLEAN DEFAULT false,
        camera_config JSON,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        original_filename VARCHAR(255),
        original_file_path VARCHAR(500),
        spoofed_file_path VARCHAR(500),
        sequence_order INT,
        file_extension VARCHAR(10) DEFAULT '.jpg'
      )
    `);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        checkpoint_name VARCHAR(255) NOT NULL,
        device_a_id VARCHAR(255),
        device_b_id VARCHAR(255),
        total_images INT,
        processed_images INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

        // Create indexes if they don't exist
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_checkpoint ON image_info(checkpoint_name)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_processed ON image_info(is_processed)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_checkpoint_processed ON image_info(checkpoint_name, is_processed)`);
        // Add filename index for lookups
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_filename ON image_info(original_filename)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_checkpoint_order ON image_info(checkpoint_name, sequence_order)`);

        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

// ==================== API ENDPOINTS ====================

// POST /api/upload - Upload original image (Device A)
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        console.log('Received upload request:', req.body);
        const { checkpoint_name } = req.body;

        if (!checkpoint_name || !req.file) {
            return res.status(400).json({
                success: false,
                error: 'checkpoint_name and image are required'
            });
        }

        const imageId = req.generatedImageId;
        const filename = req.generatedFilename;
        const filePath = `original/${checkpoint_name}/${filename}`;

        // Get next sequence order
        const seqResult = await pool.query(
            'SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_order FROM image_info WHERE checkpoint_name = $1',
            [checkpoint_name]
        );
        const sequenceOrder = seqResult.rows[0].next_order;

        // Insert into database
        // Note: we store the full filename including extension in original_filename for easier matching later
        await pool.query(
            `INSERT INTO image_info 
        (image_id, checkpoint_name, original_filename, original_file_path, sequence_order, file_extension, is_processed)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
            [imageId, checkpoint_name, filename, filePath, sequenceOrder, path.extname(filename)]
        );

        res.json({
            success: true,
            image_id: imageId,
            checkpoint_name,
            original_file_path: filePath,
            original_filename: filename,
            image_url: `/uploads/${filePath}`,
            sequence_order: sequenceOrder
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/upload-spoof - Upload spoof image (Device B)
app.post('/api/upload-spoof', uploadSpoof.single('spoof_image'), async (req, res) => {
    try {
        const { image_id, checkpoint_name, session_id } = req.body;

        if (!image_id || !checkpoint_name || !session_id || !req.file) {
            return res.status(400).json({
                success: false,
                error: 'image_id, checkpoint_name, session_id and spoof_image are required'
            });
        }

        // Verify original exists and not processed
        const checkResult = await pool.query(
            'SELECT * FROM image_info WHERE image_id = $1 AND checkpoint_name = $2',
            [image_id, checkpoint_name]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Original image not found' });
        }

        const imageInfo = checkResult.rows[0];

        if (imageInfo.is_processed) {
            return res.status(400).json({ success: false, error: 'Image already processed' });
        }

        // Validate that filenames match if provided
        if (req.file.filename !== imageInfo.original_filename) {
            console.warn(`Filename mismatch Warning: Processed ${req.file.filename} but expected ${imageInfo.original_filename}`);
            // We allow it to proceed as multer force-named it to target_filename which should be correct.
        }

        const spoofedPath = `spoofed/${checkpoint_name}/${req.file.filename}`;

        // Update database
        await pool.query(
            `UPDATE image_info 
       SET is_processed = true, spoofed_file_path = $1, processed_at = CURRENT_TIMESTAMP 
       WHERE image_id = $2`,
            [spoofedPath, image_id]
        );

        // Update session processed count
        await pool.query(
            'UPDATE sessions SET processed_images = processed_images + 1 WHERE session_id = $1',
            [session_id]
        );

        // Emit capture confirmed to Device A
        io.to(`display_${checkpoint_name}`).emit('capture_confirmed', {
            image_id,
            checkpoint_name,
            spoofed_file_path: spoofedPath,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            image_id,
            checkpoint_name,
            original_file_path: checkResult.rows[0].original_file_path,
            spoofed_file_path: spoofedPath,
            processed_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Spoof upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/checkpoints - Get available checkpoints
app.get('/api/checkpoints', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        checkpoint_name as name,
        COUNT(*) as total_images,
        SUM(CASE WHEN is_processed = true THEN 1 ELSE 0 END) as processed_images,
        SUM(CASE WHEN is_processed = false THEN 1 ELSE 0 END) as pending_images
      FROM image_info
      GROUP BY checkpoint_name
      ORDER BY checkpoint_name
    `);

        res.json({ checkpoints: result.rows });
    } catch (error) {
        console.error('Checkpoints error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/start-session - Start display session (Device A)
app.post('/api/start-session', async (req, res) => {
    try {
        const { checkpoint_name, image_count, device_id } = req.body;

        if (!checkpoint_name || !image_count) {
            return res.status(400).json({
                success: false,
                error: 'checkpoint_name and image_count are required'
            });
        }

        // Get unprocessed images
        const imagesResult = await pool.query(
            `SELECT image_id, sequence_order, original_file_path, file_extension
       FROM image_info
       WHERE checkpoint_name = $1 AND is_processed = false
       ORDER BY sequence_order ASC
       LIMIT $2`,
            [checkpoint_name, image_count]
        );

        if (imagesResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No unprocessed images found for this checkpoint'
            });
        }

        // Create session
        const sessionId = `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
        await pool.query(
            `INSERT INTO sessions (session_id, checkpoint_name, device_a_id, total_images, status)
       VALUES ($1, $2, $3, $4, 'active')`,
            [sessionId, checkpoint_name, device_id || 'unknown', imagesResult.rows.length]
        );

        // Format images queue
        const imagesQueue = imagesResult.rows.map(img => ({
            image_id: img.image_id,
            sequence_order: img.sequence_order,
            original_file_path: img.original_file_path,
            image_url: `/uploads/${img.original_file_path}`
        }));

        res.json({
            success: true,
            session_id: sessionId,
            checkpoint_name,
            total_images: imagesQueue.length,
            images_queue: imagesQueue,
            current_image: imagesQueue.length > 0 ? {
                image_id: imagesQueue[0].image_id,
                checkpoint_name,
                image_url: imagesQueue[0].image_url,
                sequence_order: imagesQueue[0].sequence_order
            } : null
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== WEBSOCKET EVENTS ====================

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Device A: Register as display
    socket.on('register_display', (data) => {
        const { device_id, checkpoint_name } = data;
        console.log(`📺 Display registered: ${device_id} for checkpoint: ${checkpoint_name}`);

        socket.join(`display_${checkpoint_name}`);
        displays.set(checkpoint_name, socket.id);

        // Notify camera devices
        io.to(`camera_${checkpoint_name}`).emit('display_connected', {
            checkpoint_name
        });
    });

    // Device B: Register as camera
    socket.on('register_camera', (data) => {
        const { device_id, checkpoint_name } = data;
        console.log(`📷 Camera registered: ${device_id} for checkpoint: ${checkpoint_name}`);

        socket.join(`camera_${checkpoint_name}`);
        cameras.set(checkpoint_name, socket.id);

        // Notify display device
        io.to(`display_${checkpoint_name}`).emit('camera_ready', {
            device_id,
            checkpoint_name,
            message: 'Camera device connected and ready'
        });
    });

    // Device A: Display next image
    socket.on('display_next_image', (data) => {
        const { session_id, current_image_id, checkpoint_name, image_url } = data;
        console.log(`🖼️ Displaying image: ${current_image_id} for checkpoint: ${checkpoint_name}`);

        // Send to camera devices
        io.to(`camera_${checkpoint_name}`).emit('display_image', {
            image_id: current_image_id,
            checkpoint_name,
            image_url,
            session_id
        });
    });

    // Device A: Session complete
    socket.on('session_complete', async (data) => {
        const { session_id, checkpoint_name } = data;
        console.log(`✅ Session complete: ${session_id}`);

        try {
            await pool.query(
                `UPDATE sessions SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
         WHERE session_id = $1`,
                [session_id]
            );
        } catch (error) {
            console.error('Session update error:', error);
        }

        io.to(`camera_${checkpoint_name}`).emit('session_ended', {
            checkpoint_name,
            message: 'Session completed'
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);

        // Check if it was a display
        for (const [checkpoint, socketId] of displays.entries()) {
            if (socketId === socket.id) {
                displays.delete(checkpoint);
                io.to(`camera_${checkpoint}`).emit('display_disconnected', {
                    checkpoint_name: checkpoint
                });
                break;
            }
        }

        // Check if it was a camera
        for (const [checkpoint, socketId] of cameras.entries()) {
            if (socketId === socket.id) {
                cameras.delete(checkpoint);
                io.to(`display_${checkpoint}`).emit('camera_disconnected', {
                    checkpoint_name: checkpoint
                });
                break;
            }
        }
    });
});

// Start server
initDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
    });
});
