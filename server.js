const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;

const GITHUB_USERNAME = 'KingsOfToxiciter';
const REPO_NAME = 'STORE-SERVER';
const ACCESS_TOKEN = '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';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/hasan`;

const uploadFolder = path.join(__dirname, 'hasan');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

app.use(express.static('public'));
app.use('/media', express.static(uploadFolder));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const filename = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
    cb(null, filename);
  }
});
const upload = multer({ storage });

async function uploadToGitHub(filepath, filename) {
  const content = fs.readFileSync(filepath, { encoding: 'base64' });
  const response = await axios.put(`${GITHUB_API_URL}/${filename}`, {
    message: `Upload ${filename}`,
    content: content
  }, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'User-Agent': GITHUB_USERNAME
    }
  });
  return response.data;
}

app.post('/upload-file', upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const result = await uploadToGitHub(req.file.path, req.file.filename);
    return res.json({ message: 'File uploaded to GitHub', url: `/media/${req.file.filename}` });
  } catch (err) {
    console.error('GitHub Upload Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'GitHub upload failed' });
  }
});

app.get('/upload-url', async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).json({ error: 'No URL provided' });

  try {
    const ext = path.extname(fileUrl.split('?')[0]) || '.bin';
    const filename = crypto.randomBytes(16).toString('hex') + ext;
    const filePath = path.join(uploadFolder, filename);

    const response = await axios.get(fileUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);
    writer.on('finish', async () => {
      try {
        const result = await uploadToGitHub(filePath, filename);
        return res.json({ message: 'URL file uploaded', url: `/media/${filename}` });
      } catch (err) {
        return res.status(500).json({ error: 'GitHub upload failed' });
      }
    });

    writer.on('error', err => {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Download failed' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Invalid URL or download failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
