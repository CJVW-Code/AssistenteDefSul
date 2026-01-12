# Critical Fixes Needed Before Production

## 1. Frontend Validation Fixes

### Problem: Missing validation for critical fields
- CPF validation (must be 11 digits)
- Telefone validation (must be 10+ digits)
- Ação específica must be selected
- Cidade de assinatura must be filled

### Solution to add in processSubmission function:

```javascript
// Add these validations before existing checks
const requiredFields = [
  { field: 'nome', value: formState.nome.trim(), message: 'Nome do assistido é obrigatório' },
  { field: 'cpf', value: stripNonDigits(formState.cpf), message: 'CPF é obrigatório', validate: (v) => v.length === 11 },
  { field: 'telefone', value: stripNonDigits(formState.telefone), message: 'Telefone é obrigatório', validate: (v) => v.length >= 10 },
  { field: 'acaoEspecifica', value: formState.acaoEspecifica, message: 'Selecione o tipo de ação' },
  { field: 'cidadeAssinatura', value: formState.cidadeAssinatura.trim(), message: 'Cidade de assinatura é obrigatória' }
];

requiredFields.forEach(({ field, value, message, validate }) => {
  if (!value) {
    validationErrors[field] = message;
  } else if (validate && !validate(value)) {
    validationErrors[field] = message;
  }
});
```

## 2. Backend Upload Fixes

### Problem: No error handling when file upload fails
- If req.files is undefined, code will crash
- No logging of failed uploads

### Solution to add in casosController.js:

```javascript
// Replace the upload section with proper error handling
let url_audio = null;
let urls_documentos = [];
let url_peticao = null;

if (req.files) {
  // Check if audio file exists
  if (req.files.audio && req.files.audio[0]) {
    try {
      const audioFile = req.files.audio[0];
      const filePath = `${protocolo}/${audioFile.filename}`;
      const { error: audioErr } = await supabase.storage
        .from("audios")
        .upload(filePath, await fs.readFile(audioFile.path), {
          contentType: audioFile.mimetype,
        });
      if (audioErr) {
        logger.error("Erro upload áudio:", { error: audioErr });
        avisos.push("Falha ao salvar áudio.");
      } else {
        url_audio = filePath;
      }
    } catch (audioError) {
      logger.error("Erro ao processar áudio:", audioError.message);
      avisos.push("Erro ao processar arquivo de áudio.");
    }
  }

  // Check if documents exist
  if (req.files.documentos && req.files.documentos.length > 0) {
    for (const docFile of req.files.documentos) {
      try {
        const filePath = `${protocolo}/${docFile.filename}`;
        const fileData = await fs.readFile(docFile.path);

        if (docFile.originalname.toLowerCase().includes("peticao")) {
          const { error: petErr } = await supabase.storage
            .from("peticoes")
            .upload(filePath, fileData, { contentType: docFile.mimetype });
          if (petErr) {
            logger.error(`Erro upload petição (${docFile.originalname}):`, {
              error: petErr,
            });
            avisos.push(`Erro ao salvar petição: ${docFile.originalname}`);
          } else {
            url_peticao = filePath;
          }
        } else {
          const { error: docErr } = await supabase.storage
            .from("documentos")
            .upload(filePath, fileData, { contentType: docFile.mimetype });
          if (docErr) {
            logger.error(`Erro upload documento (${docFile.originalname}):`, {
              error: docErr,
            });
            avisos.push(`Erro ao salvar: ${docFile.originalname}`);
          } else {
            urls_documentos.push(filePath);
          }
        }
      } catch (docError) {
        logger.error(`Erro ao processar documento ${docFile.originalname}:`, docError.message);
        avisos.push(`Erro ao processar: ${docFile.originalname}`);
      }
    }
  }
} else if (formState.documentFiles && formState.documentFiles.length > 0) {
  // Log warning if files were selected but not received
  logger.warn(`Upload falhou: ${formState.documentFiles.length} arquivos não recebidos pelo servidor`);
  avisos.push("Aviso: Arquivos selecionados não foram recebidos pelo servidor.");
}
```

## 3. Queue Service Fixes

### Problem: No retry limit, can get stuck in infinite loop
- Failed cases keep retrying forever
- No maximum retry count

### Solution to add in queueService.js:

```javascript
// Add retry count tracking
const MAX_RETRIES = 3;

if (caso) {
  // Get current retry count
  const { data: casoComRetries, error: retryError } = await supabase
    .from("casos")
    .select("protocolo, retry_count")
    .eq("protocolo", caso.protocolo)
    .single();

  if (retryError) {
    logger.error(`Erro ao buscar contagem de retries: ${retryError.message}`);
    isProcessing = false;
    return;
  }

  // Check if max retries reached
  const currentRetries = casoComRetries.retry_count || 0;
  if (currentRetries >= MAX_RETRIES) {
    logger.warn(`Caso ${caso.protocolo} atingiu máximo de ${MAX_RETRIES} tentativas. Marcando como erro permanente.`);
    await supabase.from("casos").update({
      status: "erro_permanente",
      erro_processamento: "Máximo de tentativas de processamento atingido",
      processing_finished_at: new Date()
    }).eq("protocolo", caso.protocolo);
    isProcessing = false;
    return;
  }

  // Increment retry count before processing
  await supabase.from("casos").update({
    retry_count: currentRetries + 1,
    last_retry_at: new Date()
  }).eq("protocolo", caso.protocolo);

  logger.info(`🔄 Fila: Processando caso ${caso.protocolo} (tentativa ${currentRetries + 1}/${MAX_RETRIES})...`);

  try {
    await processarCasoEmBackground(caso.protocolo);
  } catch (processingError) {
    logger.error(`Erro ao processar caso ${caso.protocolo}: ${processingError.message}`);
    // Don't mark as processing_finished_at here, let the next retry handle it
  }
}
```

## 4. Defensor Panel Fixes

### Problem: No status filtering, shows all cases including errors
- Defensores see cases in "erro" status
- No way to filter by status

### Solution to add in PainelRecepcao.jsx:

```javascript
// Modify the fetch call to exclude error cases
const response = await fetch(
  `${API_BASE}/casos?cpf=${cpfLimpo}&status=neq.erro&status=neq.erro_permanente&status=neq.processando`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);

// Add status badges to UI
<p className="text-sm text-muted mt-1">
  Status:
  <span className={`font-mono px-2 py-1 rounded text-xs ${
    caso.status === 'pendente' ? 'bg-yellow-500/20 text-yellow-400' :
    caso.status === 'processado' ? 'bg-green-500/20 text-green-400' :
    caso.status === 'processando' ? 'bg-blue-500/20 text-blue-400' :
    'bg-red-500/20 text-red-400'
  }`}>
    {caso.status}
  </span>
</p>
```

## 5. Upload Middleware Fixes

### Problem: No file size limits or type validation
- Can upload any file type
- No size limits (DoS risk)

### Solution to add in upload.js:

```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 10 // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific file types
    if (!file.originalname.match(/\.(pdf|jpg|jpeg|png|webm)$/i)) {
      logger.warn(`Tipo de arquivo rejeitado: ${file.originalname}`);
      return cb(new Error('Tipo de arquivo não permitido. Apenas PDF, JPG, PNG ou WEBM.'), false);
    }
    cb(null, true);
  }
}).fields([
  { name: "audio", maxCount: 1 },
  { name: "documentos", maxCount: 10 }
]);
```

## Implementation Priority

1. **CRITICAL**: Frontend validation fixes (prevents invalid data submission)
2. **CRITICAL**: Backend upload error handling (prevents silent failures)
3. **HIGH**: Queue service retry limits (prevents infinite loops)
4. **MEDIUM**: Defensor panel status filtering (improves UX)
5. **MEDIUM**: Upload middleware limits (security improvement)
