const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect('mongodb+srv://toxiciter:Hasan5&7@toxiciter.9tkfu.mongodb.net/STORAGE?retryWrites=true&w=majority&appName=Toxiciter', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

const mediaSchema = new mongoose.Schema({
  filename: String,
  originalUrl: String,
  filetype: String,
  filepath: String,
  createdAt: { type: Date, default: Date.now }
});
const Media = mongoose.model('Media', mediaSchema);


const saveDir = path.join(__dirname, 'hasan');
if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);


app.use('/media', express.static(saveDir));
app.use('/', express.static(path.join(__dirname, 'public')));


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, saveDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });


app.post('/upload-file', upload.single('media'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('No file uploaded');

  const media = new Media({
    filename: file.filename,
    filetype: file.mimetype,
    filepath: `/media/${file.filename}`,
    originalUrl: null
  });
  await media.save();

  res.redirect('/');
});


app.get('/upload-url', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL provided');

  try {
    const response = await axios({ method: 'GET', url, responseType: 'stream' });
    const ext = path.extname(new URL(url).pathname) || '.bin';
    const filename = `Hasan_${uuidv4()}${ext}`;
    const filepath = path.join(saveDir, filename);

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    writer.on('finish', async () => {
      const media = new Media({
        filename,
        originalUrl: url,
        filetype: response.headers['content-type'],
        filepath: `/media/${filename}`
      });
      await media.save();
      res.redirect('/');
    });

    writer.on('error', () => {
      fs.unlinkSync(filepath);
      res.status(500).send('Failed to save file');
    });
  } catch (err) {
    res.status(500).send('Download failed');
  }
});


app.get('/list-files', async (req, res) => {
  const files = await Media.find().sort({ createdAt: -1 });
  res.json(files);
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
