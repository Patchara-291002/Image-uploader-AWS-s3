const express = require('express');
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 3000;

// ฟังก์ชันสำหรับทำความสะอาดชื่อไฟล์
const sanitizeFilename = (filename) => {
    const safeFilename = Buffer.from(filename, 'latin1').toString('utf8');
    return safeFilename.replace(/[^a-zA-Z0-9ก-๙.]/g, '-');
};

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const timestamp = Date.now().toString();
            const safeFilename = sanitizeFilename(file.originalname);
            cb(null, `uploads/${timestamp}-${safeFilename}`);
        }
    })
});

// Middleware สำหรับ CORS (ถ้าต้องการ)
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Endpoint สำหรับอัพโหลดไฟล์
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: 'No file uploaded'
        });
    }

    res.json({
        message: 'File uploaded successfully',
        fileUrl: req.file.location,
        filename: req.file.key
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({
        error: 'Something went wrong',
        message: error.message
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});