import multer from "multer";

// Configura o armazenamento em memória
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10, // 10 arquivos por caso
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(pdf|jpg|jpeg|png|mp3|wav|ogg|m4a)$/i)) {
      return cb(
        new Error("Apenas PDF, JPG, PNG ou Áudio são permitidos"),
        false
      );
    }
    cb(null, true);
  },
});
