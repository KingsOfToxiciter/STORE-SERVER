const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const HASAN_FOLDER = path.join(__dirname, 'hasan');

const FileSchema = new mongoose.Schema({
  filename: String,
  filepath: String,
  filetype: String,
  createdAt: { type: Date, default: Date.now }
});
const File = mongoose.model('File', FileSchema);

mongoose.connect('mongodb+srv://toxiciter:Hasan5&7@toxiciter.9tkfu.mongodb.net/STORAGE?retryWrites=true&w=majority&appName=Toxiciter', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

app.use('/media', express.static(HASAN_FOLDER));
app.use(express.static('public'));


if (!fs.existsSync(HASAN_FOLDER)) fs.mkdirSync(HASAN_FOLDER);


const resyncFiles = async () => {
  const files = await File.find();
  for (const file of files) {
    const filePath = path.join(HASAN_FOLDER, file.filename);
    if (!fs.existsSync(filePath)) {
      const writer = fs.createWriteStream(filePath);
      const response = await axios.get(file.filepath, { responseType: 'stream' }).catch(() => null);
      if (response && response.status === 200) {
        response.data.pipe(writer);
      }
    }
  }
};
resyncFiles();


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, HASAN_FOLDER),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });


app.post('/upload-file', upload.single('media'), async (req, res) => {
  const file = req.file;
  const fileUrl = `/media/${file.filename}`;
  await File.create({
    filename: file.filename,
    filepath: fileUrl,
    filetype: file.mimetype
  });
  res.json({ message: 'File uploaded', url: "https://store.noobx-api.rf.gd" + fileUrl });
});


app.get('/upload-url', async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).json({ error: 'URL required' });

  const fileExt = path.extname(fileUrl).split('?')[0] || '.bin';
  const filename = uuidv4() + fileExt;
  const filepath = path.join(HASAN_FOLDER, filename);
  const writer = fs.createWriteStream(filepath);

  try {
    const response = await axios.get(fileUrl, { responseType: 'stream' });
    const contentType = response.headers['content-type'] || 'application/octet-stream';

    response.data.pipe(writer);
    writer.on('finish', async () => {
      const dbPath = `/media/${filename}`;
      await File.create({ filename, filepath: dbPath, filetype: contentType });
      res.json({ message: 'File downloaded', url: "https://store.noobx-api.rf.gd" + dbPath });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to download from URL' });
  }
});

app.get('/list-files', async (req, res) => {
  const files = await File.find().sort({ createdAt: -1 });
  res.json(files);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
