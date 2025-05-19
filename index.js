const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const { GridFSBucket, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = 'mongodb+srv://toxiciter:Hasan5&7@toxiciter.9tkfu.mongodb.net/STORAGE?retryWrites=true&w=majority&appName=Toxiciter';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const conn = mongoose.connection;
let gfs;
let gridfsBucket;

conn.once('open', () => {
  gridfsBucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
  gfs = gridfsBucket;
  console.log('MongoDB Connected');
});

app.use(express.static('public'));

const storage = new GridFsStorage({
  url: MONGO_URI,
  file: (req, file) => {
    return {
      bucketName: 'uploads',
      filename: crypto.randomBytes(16).toString('hex') + path.extname(file.originalname)
    };
  }
});

const upload = multer({ storage });

const localFolder = path.join(__dirname, 'hasan');
if (!fs.existsSync(localFolder)) fs.mkdirSync(localFolder);

// File Upload from local using form
app.post('/upload-file', upload.single('media'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  res.json({
    message: 'File uploaded',
    fileId: req.file.id,
    filename: req.file.filename,
    url: `/media/${req.file.filename}`
  });
});

// Upload by remote URL
app.get('/upload-url', async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).json({ error: 'No URL provided' });

  try {
    const response = await axios.get(fileUrl, { responseType: 'stream' });
    const ext = path.extname(fileUrl.split('?')[0]);
    const filename = crypto.randomBytes(16).toString('hex') + ext;
    const tempPath = path.join(localFolder, filename);
    const writer = fs.createWriteStream(tempPath);

    response.data.pipe(writer);

    writer.on('finish', () => {
      const fileStream = fs.createReadStream(tempPath);
      const uploadStream = gridfsBucket.openUploadStream(filename);
      const fileId = uploadStream.id;

      fileStream.pipe(uploadStream)
        .on('error', err => {
          console.error('Upload to GridFS failed', err);
          return res.status(500).json({ error: 'GridFS upload failed' });
        })
        .on('finish', () => {
          fs.unlinkSync(tempPath);
          return res.json({
            message: 'File uploaded from URL',
            fileId: fileId.toString(),
            filename: filename,
            url: `/media/${filename}`
          });
        });
    });

    writer.on('error', err => {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Download failed' });
    });

  } catch (err) {
    console.error('Axios error:', err.message);
    res.status(500).json({ error: 'URL fetch failed' });
  }
});

// Download by filename
app.get('/media/:filename', (req, res) => {
  gfs.find({ filename: req.params.filename }).toArray((err, files) => {
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const readstream = gfs.openDownloadStreamByName(req.params.filename);
    readstream.pipe(res);
  });
});

// Optional: Download by fileId
app.get('/media/id/:id', (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const readstream = gfs.openDownloadStream(fileId);
    readstream.on('error', () => {
      return res.status(404).json({ error: 'File not found' });
    });
    readstream.pipe(res);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }
});

// Sync GridFS files to local (optional, not required always)
conn.once('open', () => {
  gfs.find().toArray((err, files) => {
    files.forEach(file => {
      const filePath = path.join(localFolder, file.filename);
      if (!fs.existsSync(filePath)) {
        const stream = gfs.openDownloadStreamByName(file.filename);
        const write = fs.createWriteStream(filePath);
        stream.pipe(write);
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
