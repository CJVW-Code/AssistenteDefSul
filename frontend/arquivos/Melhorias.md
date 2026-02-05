### 1. O "Guia Visual" (Educação Prévia) 📸

**O Problema:** O assistido não sabe que uma foto tremida ou escura é inútil para o processo.
**A Solução:** Antes de aparecer qualquer botão de "Anexar", o sistema vai exibir um **Painel de Instruções Visual**.

* **O que vai ter:** Dois quadros lado a lado.
* **Lado Esquerdo (Verde/Certo):** Exemplo de um documento sobre uma mesa, bem iluminado, legível, com bordas visíveis.
* **Lado Direito (Vermelho/Errado):** Exemplo de um documento segurado na mão (tremido), com flash estourado ou cortado pela metade.


* **O Efeito:** Cria uma barreira psicológica positiva. O usuário olha e pensa: *"Ah, tenho que caprichar na foto"*.

### 2. O "Scanner" Nativo (Botão de Câmera Direta) 📱

**O Problema:** O botão padrão "Escolher Arquivo" abre a galeria cheia de memes e fotos pessoais, confundindo o usuário.
**A Solução:** Substituir o botão genérico por **Botões de Ação Específica**.

* **Botão "Tirar Foto Agora":** Ao clicar neste botão no celular, ele **não** vai abrir a galeria. Ele vai abrir **diretamente a câmera traseira** do celular em modo foto.
* Isso simula a experiência de um "App de Scanner" ou de Banco, mas rodando direto no navegador.


* **Botão "Galeria ou PDF":** Um botão secundário para quem já tem a foto salva ou baixou o comprovante em PDF do site do banco.

### 3. O "Filtro de Qualidade" Invisível (Validação Técnica) 📏

**O Problema:** O assistido envia um ícone, uma miniatura de WhatsApp ou uma foto preta sem querer.
**A Solução:** O sistema vai analisar o arquivo **no momento que ele é selecionado** (antes de enviar para o servidor).

* **Regra do Peso:** Se o arquivo for leve demais (menos de 50KB), o sistema deduz que a qualidade está péssima ou é uma miniatura inútil.
* **Ação:** O sistema recusa o arquivo imediatamente e mostra um alerta: *"A imagem está com qualidade muito baixa ou ilegível. Por favor, tire uma nova foto com mais luz."*
* **Benefício:** Evita que o defensor abra um arquivo que é apenas um borrão.

### 4. O Sistema de "Gavetas" (Validação de Obrigatórios) ✅

**O Problema:** O assistido envia 5 fotos, mas esquece o RG. O sistema atual (balde único) aceita porque "tem 5 arquivos".
**A Solução:** Acabar com o upload único e criar **"Gavetas Identificadas"**.

* **Gaveta 1:** Exclusiva para **RG/CNH**.
* **Gaveta 2:** Exclusiva para **Comprovante de Residência**.
* **Gaveta 3:** Documentos Extras (Certidões, Prints, etc.).

**A Trava de Segurança:**
Quando o usuário clicar em "Enviar Caso", o sistema vai olhar para dentro das gavetas:

* *"A gaveta do RG está vazia?"* -> **Bloqueia o envio** e avisa: *"Falta a foto do RG."*
* *"A gaveta de Residência está vazia?"* -> **Bloqueia o envio** e avisa: *"Falta o comprovante de residência."*

---

### Resumo do Impacto no Fluxo

1. **Assistido entra:** Vê o exemplo de foto boa vs. ruim.
2. **Clica em "RG":** A câmera abre direto. Tira a foto.
3. **Sistema valida:** "Ficou boa (tamanho ok)?" -> Anexa na gaveta "RG".
4. **Esqueceu o comprovante:** Tenta enviar.
5. **Sistema bloqueia:** "Opa, falta o comprovante de residência".
6. **Anexa o resto e envia:** O Defensor recebe tudo organizado e legível.