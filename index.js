const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());


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

app.get('/upload', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  try {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream'
    });

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

      res.json({
        message: 'File saved and stored in DB',
        fileUrl: `https://store.noobx-api.rf.gd/media/${filename}`
      });
    });

    writer.on('error', err => {
      fs.unlinkSync(filepath);
      res.status(500).json({ error: 'File write failed' });
    });

  } catch (err) {
    res.status(500).json({ error: 'Download failed', detail: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
