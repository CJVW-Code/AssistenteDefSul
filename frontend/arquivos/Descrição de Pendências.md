# Documentação da Funcionalidade: Descrição de Pendências (Sprint 0)

Esta funcionalidade permite que defensores públicos especifiquem quais documentos estão faltando em um caso, facilitando a comunicação direta com o cidadão através do portal de consulta.

---

## 🛠️ Implementação Técnica

### 1. Banco de Dados (Supabase)
*   **Tabela:** `casos`
*   **Coluna:** `descricao_pendencia` (Tipo: `TEXT`, Nullable: `YES`)
*   **Objetivo:** Armazenar a lista de documentos ou observações enviadas pelo defensor.

### 2. Backend (Node.js + Express)
*   **Endpoint:** `PATCH /api/casos/:id/status`
*   **Controller:** `atualizarStatusCaso` em `backend/src/controllers/casosController.js`
*   **Lógica:** O backend recebe `status` e `descricao_pendencia` e realiza um `UPDATE` atômico.
*   **Mapeamento Público:** No `statusController.js`, o status interno `aguardando_docs` é mapeado para o status público `documentos pendente` para o cidadão.

### 3. Frontend - Área do Defensor
*   **Página:** `DetalhesCaso.jsx`
*   **Componente UI:** Textarea condicional que aparece apenas quando o status selecionado é "Pendentes de documentos".
*   **Função Principal:** `handleSalvarPendencia`
    *   Envia o texto para o servidor sem necessariamente alterar o status se já estiver correto.
    *   Exibe Toasts de sucesso/erro e gerencia estado de carregamento (`isUpdating`).

### 4. Frontend - Área do Cidadão (Portal de Consulta)
*   **Página:** `ConsultaStatus.jsx`
*   **Componente UI:** Card de alerta (Amarelo) que exibe a `descricao_pendencia`.
*   **Correção Realizada:** 
    1.  **Backend:** Adicionado o campo `descricao_pendencia` na query de busca do `statusController.js`.
    2.  **Frontend:** O frontend agora verifica tanto o status interno (`aguardando_docs`) quanto o mapeado (`documentos pendente`) para garantir a exibição correta da mensagem.

---

## 📋 Fluxo de Uso

1.  **Defensor:**
    *   Acessa um caso específico.
    *   Muda o status para **"Pendentes de documentos"**.
    *   Escreve a lista (ex: "- RG do Cônjuge", "- Comprovante de Renda").
    *   Clica em **"Salvar Descrição"**.
2.  **Cidadão:**
    *   Acessa o portal com CPF e Chave de Acesso.
    *   Visualiza o status **"Documentos Pendente"**.
    *   Lê a lista exata de documentos que precisa providenciar.
    *   Utiliza o campo de upload logo abaixo para enviar os arquivos faltantes.

---

## ✅ Testes e Validação

1.  **Persistência:** Validado via script `backend/test_api.js` que os dados chegam e são gravados no Supabase com sucesso.
2.  **Exibição:** Validado que o cidadão agora vê o card amarelo com as instruções (após fix de mapeamento de status).
3.  **Segurança:** A rota de atualização exige Token JWT válido do defensor.

---

## 📝 Notas de Versão (Sprint 0)
*   Implementado salvamento independente de descrição.
*   Corrigido bug de visualização no portal do cidadão.
*   Removido cronogramas e gráficos conforme contrato do MVP.

---
*Documentação gerada automaticamente pelo Assistente Cline em 19/01/2026.*
