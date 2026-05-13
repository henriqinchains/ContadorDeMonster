// 1. IMPORTAÇÕES E CONFIGURAÇÕES INICIAIS
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");

const app = express();

// Permite que o seu HTML converse com o servidor sem ser bloqueado
app.use(cors());
app.use(express.json());

// Configura o Multer para salvar as fotos do Monster na pasta 'uploads/'
const upload = multer({ dest: "uploads/" });

// 2. CONEXÃO COM O BANCO DE DADOS
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
  .catch((erro) => console.log("❌ Erro ao conectar no banco:", erro));

// 3. O MODELO
const AvaliacaoSchema = new mongoose.Schema(
  {
    sujeito: { type: String, required: true },
    sabor: { type: String, required: true },
    valor: { type: Number, required: true },
    nota: { type: Number, required: true },
    valeu_a_pena: { type: Boolean, required: true },
    review: { type: String, required: false },
    foto_url: { type: String, required: true },
  },
  { timestamps: true },
);

const Avaliacao = mongoose.model("Avaliacao", AvaliacaoSchema);

// 4. A ROTA POST
app.post("/api/avaliacoes", upload.single("foto"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ erro: "A foto do Monster é obrigatória, cabra!" });
    }

    const caminhoDaFoto = req.file.path;

    // Montando o pacote para o MongoDB
    const novaAvaliacao = new Avaliacao({
      sujeito: req.body.sujeito,
      sabor: req.body.sabor,
      valor: Number(req.body.valor),
      nota: Number(req.body.nota),
      valeu_a_pena: req.body.valeu === "sim",
      review: req.body.review,
      foto_url: caminhoDaFoto,
    });

    // Salva de fato no banco de dados
    await novaAvaliacao.save();

    console.log("Nova avaliação salva com sucesso:", novaAvaliacao);
    res.status(201).json({ mensagem: "Avaliação do Monster salva!" });
  } catch (erro) {
    console.error("Erro interno:", erro);
    res
      .status(500)
      .json({ erro: "Falha ao processar a avaliação no servidor." });
  }
});

// 5. LIGANDO O SERVIDOR
const porta = process.env.PORT || 3000;
app.listen(porta, () => {
  console.log(`🚀 Servidor rodando na porta ${porta}`);
});
