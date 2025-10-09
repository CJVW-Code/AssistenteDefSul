import multer from "multer";
import fs from "fs";
import path from "path";

// Garante que o diretório de uploads temporários exista
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configura o armazenamento temporário no disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Garante um nome de arquivo único adicionando um timestamp
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({ storage });
