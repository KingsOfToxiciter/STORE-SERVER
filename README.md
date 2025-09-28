# 📂 File Upload & GitHub Storage Server

এই প্রজেক্ট একটি Express.js ভিত্তিক ফাইল সার্ভার, যেখানে ইউজাররা  
- লোকাল থেকে ফাইল আপলোড করতে পারবে  
- অথবা যেকোনো `URL` থেকে ফাইল ডাউনলোড করে GitHub রিপোজিটরিতে আপলোড করতে পারবে
- like imgur imgbb this your self hosted uploader 

সব ফাইল স্বয়ংক্রিয়ভাবে একটি GitHub রিপোজিটরির `hasan/` ফোল্ডারে সেভ হবে।  

---

## 🚀 Features
- লোকাল ফাইল আপলোড (`/upload-file`)
- সরাসরি URL দিয়ে ফাইল আপলোড (`/upload-url?url=...`)
- আপলোডকৃত ফাইল লোকালি `/media` রুটে সার্ভ হবে
- ফাইল _' রিপোজিটরিতে সংরক্ষণ হবে
- কনফিগারেশন সবকিছু `config.json` ফাইলে থাকবে

---

## ⚙️ Installation & Setup

### 1. রিপো ক্লোন করো
```bash
git clone https://github.com/KingsOfToxiciter/STORE-SERVER.git
cd STORE-SERVER
npm install
node server.js
