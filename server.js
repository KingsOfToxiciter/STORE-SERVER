const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const axios = require('axios');
const { Readable } = require('stream');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

let gfs;

mongoose.connect('mongodb+srv://toxiciter:Hasan5&7@toxiciter.9tkfu.mongodb.net/STORAGE?retryWrites=true&w=majority&appName=Toxiciter', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

const conn = mongoose.connection;

conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
  console.log('MongoDB GridFS connected');
});

const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return {
      filename: Date.now() + '-' + file.originalname,
      bucketName: 'uploads'
    };
  }
});
const upload = multer({ storage });

app.use(express.static('public'));
app.use(express.json());


app.post('/upload-file', upload.single('media'), (req, res) => {
  const file = req.file;
  res.json({ message: 'File uploaded', url: `https://store.noobx-api.rf.gd/media/${file.filename}` });
});


app.get('/upload-url', async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).json({ error: 'URL is required' });

  try {
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const filename = Date.now() + '-' + path.basename(fileUrl).split('?')[0];
    const contentType = response.headers['content-type'] || 'application/octet-stream';

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const writestream = gfs.createWriteStream({ filename, content_type: contentType });
    readableStream.pipe(writestream);

    writestream.on('close', file => {
      res.json({ message: 'File uploaded from URL', url: `https://store.noobx-api.rf.gd/media/${file.filename}` });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload from URL' });
  }
});


app.get('/media/:filename', async (req, res) => {
  const file = await gfs.files.findOne({ filename: req.params.filename });
  if (!file) return res.status(404).json({ error: 'File not found' });

  const readstream = gfs.createReadStream({ filename: file.filename });
  res.set('Content-Type', file.contentType);
  readstream.pipe(res);
});

app.get('/list-files', async (req, res) => {
  const files = await gfs.files.find().sort({ uploadDate: -1 }).toArray();
  res.json(files.map(f => ({
    filename: f.filename,
    contentType: f.contentType,
    url: `https://store.noobx-api.rf.gd/media/${f.filename}`
  })));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
