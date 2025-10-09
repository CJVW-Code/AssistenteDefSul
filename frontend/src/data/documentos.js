// Arquivo: frontend-cidadao/src/data/documentos.js
export const documentosPorAcao = {
  familia: {
    "Pensão Alimentícia ": [
      "RG e CPF do(a) autor(a)",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Certidão de Nascimento do(a) filho(a)",
      "RG e CPF do réu (se tiver)",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
      "Lista de gastos da criança/adolescente",
    ],
    Divórcio: [
      "RG e CPF do casal",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Certidão de Casamento atualizada",
      "Certidão de Nascimento dos filhos (se houver)",
      "Documentos de bens a partilhar (imóveis, veículos)",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
    ],
    "Reconhecimento e Dissolução de União Estável": [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Certidão de Nascimento ou Casamento.",
      "Certidão de Nascimento dos filhos (se houver)",
      "Documentos de bens a partilhar (imóveis, veículos)",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
    ],
    "Guarda de Filhos": [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Certidão de Nascimento ou Casamento.",
      "Certidão de Nascimento do(s) filho(s)",
      "Endereço e local de trabalho da outra parte (se souber)",
      "Lista de despesas da criança.",

      "Documentos de bens a partilhar (imóveis, veículos)",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
    ],
    "Regulamentação de Visitas": [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Certidão de Nascimento ou Casamento.",
      "Certidão de Nascimento dos filhos (se houver)",
      "Documentos de bens a partilhar (imóveis, veículos)",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
    ],
    "Investigação de Paternidade (DNA)": [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Certidão de Nascimento da pessoa a ser reconhecida",
      "Nome e endereço do suposto pai.",
      "Certidão de Nascimento dos filhos (se houver)",
      "Documentos de bens a partilhar (imóveis, veículos)",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
    ],
    Adoção: [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Certidão de Nascimento.",
      "Certidão de Nascimento dos filhos (se houver)",
      "Documentos de bens a partilhar (imóveis, veículos)",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
    ],
    // Adicionar outras ações de família aqui...
  },

  civel: {
    "Aluguel/Despejo": [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
      "Contrato de aluguel (se houver)",
      "Comprovantes de pagamento (ou da falta dele).",
    ],
    Dívidas: [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Contrato da dívida",
      "Notificações de cobrança",
      "Boletos pagos ou não pagos",
    ],
    Usucapião: [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Contas antigas de água/luz/IPTU",
      "Fotos do imóvel",
      "Nome e endereço de vizinhos que possam ser testemunhas.",
    ],
  },
  consumidor: {
    "Aluguel/Despejo": [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
      "Nota fiscal, recibo ou fatura do produto/serviço",
      "Contrato de prestação de serviço.",
      "Número de protocolo de ligações para a empresa.",
      "Prints de conversas por e-mail ou WhatsApp.",
      "Fotos ou vídeos que comprovem o defeito do produto.",
    ],
  },
  saude: {
    Saúde: [
      "RG e CPF ",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
      "Cartão do SUS.",
      "Laudo médico detalhado (Importante!).",
      "Exames que comprovem a doença.",
      "Receitas médicas.",
      "A negativa por escrito do plano de saúde ou do hospital (se houver).",
    ],
  },
  criminal: {
    Criminal: [
      "RG e CPF (do acusado e, se for o caso, da pessoa que está procurando a Defensoria por ele)",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
      "Qualquer documento recebido da Justiça ou da Polícia (intimação, citação, etc.).",
      "Boletim de Ocorrência, Auto de Prisão em Flagrante (se tiver cópia).",
      "Exames que comprovem a doença.",
      "Número do processo (se já existir).",
      "Nome e endereço de testemunhas de defesa.",
    ],
  },
  infancia: {
    Adoção: [
      "RG e CPF dos pais ou responsáveis",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
      "Documentos da Criança/Adolescente: Certidão de Nascimento.",
      "Documentos que comprovem a habilitação para adotar.",
    ],
    "Medida de Proteção": [
      "RG e CPF dos pais ou responsáveis",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
      "Documentos da Criança/Adolescente: Certidão de Nascimento.",
      "Relatórios do Conselho Tutelar, da escola ou de psicólogos (se houver); Boletim de Ocorrência (em casos de violência)",
    ],
    "Vaga em Creche": [
      "RG e CPF dos pais ou responsáveis",
      "Comprovante de residência (conta de água, luz, etc.).",
      "Comprovante de renda (contracheque, carteira de trabalho, etc.)",
      "Documentos da Criança/Adolescente: Certidão de Nascimento.",
      "Negativa da matrícula por escrito da secretaria de educação ou da creche.",
    ],
  },

  // Adicionar outras áreas como 'civel', 'fazenda_publica', etc. aqui
};
