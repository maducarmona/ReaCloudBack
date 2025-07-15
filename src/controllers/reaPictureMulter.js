const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ✅ 1) Custom disk storage: always write to tmp folder for Cloudinary
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './tmp'); // Save to tmp only — you won't keep it local!
  },
  filename: (req, file, cb) => {
    cb(null, Date.now().toString() + "_" + file.originalname);
  }
});

// ✅ 2) File filter: only accept images
const fileFilter = (req, file, cb) => {
  const isImage = ['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype);
  cb(null, isImage);
};

// ✅ 3) Combine storage + filter
const upload = multer({ storage, fileFilter });

// ✅ 4) Resize: still saves output to ./tmp too
const resizeImage = async (req, res, next) => {
  if (!req.file) return next();

  const inputPath = req.file.path;
  const outputPath = path.join('./tmp', 'resized_' + req.file.filename);

  try {
    const metadata = await sharp(inputPath).metadata();

    if (metadata.width > 1280 || metadata.height > 720) {
      await sharp(inputPath)
        .resize(1280, 720, {
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
        .toFile(outputPath);

      // Delete the original
      fs.unlink(inputPath, (err) => {
        if (err) console.error('Error deleting the original file:', err);
      });

      req.file.path = outputPath;
      req.file.filename = 'resized_' + req.file.filename;
    }

    next();
  } catch (error) {
    console.error('Error processing the image:', error);
    return res.status(500).json({ error: 'Error processing the image' });
  }
};

module.exports = { upload, resizeImage };
