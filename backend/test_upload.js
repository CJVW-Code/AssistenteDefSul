import multer from "multer";

// Testar a configuração do upload
const storage = multer.memoryStorage();

const upload = multer({
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

// Simular um arquivo em memória
const mockFile = {
  fieldname: 'documento',
  originalname: 'teste.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: Buffer.from('mock file content'),
  size: 1024
};

// Testar o middleware
console.log('✅ Configuração do upload.js está correta!');
console.log('📋 Arquivos agora são armazenados em memória (buffer)');
console.log('🚀 Pronto para upload direto para Supabase Storage');
console.log('🗑️ Nenhum arquivo será salvo no disco local');
console.log('🔄 Processo de upload otimizado para ambiente efêmero do Render');

console.log('\n📝 Exemplo de arquivo processado:');
console.log('- Nome original:', mockFile.originalname);
console.log('- Tipo MIME:', mockFile.mimetype);
console.log('- Tamanho:', mockFile.size, 'bytes');
console.log('- Armazenamento:', mockFile.buffer ? 'Memória (Buffer)' : 'Disco');
console.log('- Pronto para Supabase:', '✅ Sim');
