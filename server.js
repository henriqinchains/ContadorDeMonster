require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// Garante que a pasta existe antes de começar
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({ dest: "uploads/" });

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.set("trust proxy", 1); 

// ==========================================
// CONFIGURAÇÃO DO CORS DINÂMICA E SEGURA
// ==========================================
const allowedOrigins = [
  "https://monstereviews.com.br",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requisições sem origin (como ferramentas de teste tipo Postman)
      if (!origin) return callback(null, true);

      // Verifica se a origem começa com alguma das URLs permitidas
      const isAllowed = allowedOrigins.some((allowedUrl) =>
        origin.startsWith(allowedUrl),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Bloqueado pelo CORS do Monster Reviews!"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  }),
);

app.use(cookieParser());
app.use(express.json());

mongoose
  .connect(process.env.DATABASE_URL, { family: 4 })
  .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
  .catch((erro) => console.log("❌ Erro ao conectar no banco:", erro));

// ==========================================
// MODELOS DO BANCO DE DADOS
// ==========================================
const UsuarioSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    senha: { type: String, required: true },
    cargo: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

const Usuario = mongoose.model("Usuario", UsuarioSchema, "usuarios");

const AvaliacaoSchema = new mongoose.Schema(
  {
    sujeito: { type: String, required: true },
    sabor: { type: String, required: true },
    valor: { type: Number, required: true },
    nota: { type: Number, required: true },
    valeu_a_pena: { type: Boolean, required: true },
    review: { type: String, required: false },
    foto_url: { type: String, required: true },
    likes: { type: [String], default: [] }
  },
  { timestamps: true },
);

const Avaliacao = mongoose.model("Avaliacao", AvaliacaoSchema, "avaliacoes");

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================

// CADASTRO
app.post("/api/auth/cadastro", async (req, res) => {
  try {
    const { login, email, password } = req.body;

    if (!login || !email || !password) {
      return res
        .status(400)
        .json({ erro: "Por favor, preencha todos os campos." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ erro: "Formato de e-mail inválido." });
    }

    const usuarioExiste = await Usuario.findOne({ nome: login });
    if (usuarioExiste) {
      return res
        .status(400)
        .json({ erro: "Este nome de usuário já está sendo usado." });
    }

    const emailExiste = await Usuario.findOne({ email: email.toLowerCase() });
    if (emailExiste) {
      return res
        .status(400)
        .json({ erro: "Este e-mail já está cadastrado em outra conta." });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(password, salt);

    const novoUsuario = new Usuario({
      nome: login,
      email: email,
      senha: senhaCriptografada,
    });

    await novoUsuario.save();

    const token = jwt.sign(
      {
        id: novoUsuario._id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        cargo: novoUsuario.cargo,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

        res.cookie("authToken", token, {
      httpOnly: true,
      secure: true,            
      sameSite: "none",        
      partitioned: true,       
      maxAge: 24 * 60 * 60 * 1000, // 1 dia
    });


    return res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso!",
      login: novoUsuario.nome,
      usuario: {
        id: novoUsuario._id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
      },
    });
  } catch (erro) {
    console.error("❌ Erro no cadastro:", erro);
    return res.status(500).json({ erro: "Erro ao tentar cadastrar usuário." });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    const usuarioEncontrado = await Usuario.findOne({
      $or: [{ nome: login }, { email: login }],
    });

    if (!usuarioEncontrado) {
      return res.status(400).json({ erro: "Usuário ou senha incorretos." });
    }

    const senhaValidaLogin = await bcrypt.compare(
      password,
      usuarioEncontrado.senha,
    );
    if (!senhaValidaLogin) {
      return res.status(400).json({ erro: "Usuário ou senha incorretos." });
    }

    const token = jwt.sign(
      {
        id: usuarioEncontrado._id,
        nome: usuarioEncontrado.nome,
        email: usuarioEncontrado.email,
        cargo: usuarioEncontrado.cargo,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

        res.cookie("authToken", token, {
      httpOnly: true,
      secure: true,            
      sameSite: "none",        
      partitioned: true,       
      maxAge: 24 * 60 * 60 * 1000, // 1 dia
    });


    return res.status(200).json({
      mensagem: "Login realizado com sucesso!",
      login: usuarioEncontrado.nome,
      email: usuarioEncontrado.email,
      cargo: usuarioEncontrado.cargo,
      avatarUrl: usuarioEncontrado.avatarUrl,
    });
  } catch (erro) {
    console.error("❌ Erro no login:", erro);
    return res.status(500).json({ erro: "Erro ao tentar fazer login." });
  }
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
  res.cookie("authToken", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    partitioned: true,         
    expires: new Date(0),
  });
  return res.status(200).json({ mensagem: "Deslogado com sucesso!" });
});


// VALIDAÇÃO DE SESSÃO EM TEMPO REAL (/ME) - UPDATED
app.get("/api/auth/me", async (req, res) => { // <-- Adicionado 'async'
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ logado: false });
  }

  try {
    const usuarioVerificado = jwt.verify(token, process.env.JWT_SECRET);
    
    // Busca o usuário rapidinho no banco para pegar a foto mais atualizada
    const userDb = await Usuario.findById(usuarioVerificado.id);

    return res.json({
      logado: true,
      login: usuarioVerificado.nome,
      email: usuarioVerificado.email,
      cargo: usuarioVerificado.cargo || "user",
      id: usuarioVerificado.id,
      avatarUrl: userDb ? userDb.avatarUrl : "" // <-- A PEÇA QUE FALTAVA!
    });
  } catch (err) {
    return res.status(401).json({ logado: false });
  }
});

// ==========================================
// ROTAS DE AVALIAÇÕES & FEED
// ==========================================

// CARREGAR TIMELINE
app.get("/api/avaliacoes", async (req, res) => {
  try {
    const avaliacoes = await Avaliacao.find().sort({ createdAt: -1 });
    return res.status(200).json(avaliacoes);
  } catch (erro) {
    console.error("❌ Erro ao buscar avaliações:", erro);
    return res.status(500).json({ erro: "Erro ao carregar o feed." });
  }
});

// PUBLICAR NOVA AVALIAÇÃO (PROTEGIDA)
app.post("/api/avaliacoes", upload.single("foto"), async (req, res) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ erro: "Você precisa estar logado!" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let linkDaFotoNaNuvem = "";
    if (req.file) {
      console.log("⏳ Subindo foto pro Cloudinary...");
      const resultado = await cloudinary.uploader.upload(req.file.path, {
        folder: "MonsterReviews",
      });
      linkDaFotoNaNuvem = resultado.secure_url;
      console.log("✅ Foto na nuvem! Link:", linkDaFotoNaNuvem);
    }

    const novaAvaliacao = new Avaliacao({
      sujeito: decoded.nome,
      sabor: req.body.sabor,
      valor: Number(req.body.valor),
      nota: Number(req.body.nota),
      review: req.body.review,
      valeu_a_pena: req.body.valeu_a_pena === "true",
      foto_url: linkDaFotoNaNuvem,
    });

    await novaAvaliacao.save();
    return res
      .status(201)
      .json({
        mensagem: "Avaliação salva com sucesso!",
        avaliacao: novaAvaliacao,
      });
  } catch (erro) {
    console.error("Erro ao postar avaliação:", erro);
    return res.status(401).json({ erro: "Sessão inválida ou erro no envio." });
  }
});



// EXCLUIR AVALIAÇÃO (SEGURA CONTRA MANIPULAÇÕES)
app.delete("/api/avaliacoes/:id", async (req, res) => {
  try {
    const idAvaliacao = req.params.id;
    const token = req.cookies.authToken;
    if (!token) {
      return res
        .status(401)
        .json({ erro: "Acesso negado. Faça login novamente." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const avaliacao = await Avaliacao.findById(idAvaliacao);

    if (!avaliacao) {
      return res.status(404).json({ erro: "Avaliação não encontrada." });
    }

    const ehODonoDoPost = avaliacao.sujeito === decoded.nome;
    const ehAdministrador = decoded.cargo === "admin";

    if (ehODonoDoPost || ehAdministrador) {
      if (avaliacao.foto_url) {
        const publicId = obterPublicIdDaUrl(avaliacao.foto_url);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      await Avaliacao.findByIdAndDelete(idAvaliacao);
      return res
        .status(200)
        .json({ mensagem: "Avaliação excluída com sucesso! 🗑️" });
    } else {
      return res
        .status(403)
        .json({ erro: "Você não tem permissão para excluir esta avaliação." });
    }
  } catch (erro) {
    console.error("❌ Erro interno no servidor ao deletar:", erro);
    if (
      erro.name === "JsonWebTokenError" ||
      erro.name === "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({ erro: "Sessão expirada ou inválida. Faça login novamente." });
    }
    return res
      .status(500)
      .json({ erro: "Erro interno ao tentar deletar a avaliação." });
  }
});

const obterPublicIdDaUrl = (url) => {
  if (!url) return null;
  // Pega a URL, divide pelas barras, pega o finalzinho e tira a extensão (.jpg, .png)
  const partes = url.split('/');
  const arquivoComExtensao = partes.pop();
  const pasta = partes.pop(); 
  const arquivoSemExtensao = arquivoComExtensao.split('.')[0];
  
  // Retorna "pasta/arquivo" (ajuste se você não usar pastas no Cloudinary)
  return `${pasta}/${arquivoSemExtensao}`;
};

// ==========================================
// ROTA DE CURTIDAS
// ==========================================
app.post("/api/avaliacoes/:id/curtidas", async (req, res) => {
  try {
    // 1. Autenticação Padrão do Sistema
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ erro: "Você precisa estar logado para curtir, monstro!" });
    }
    
    // Descriptografa o token para saber quem está clicando
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuarioLogado = decoded.nome; 
    const idAvaliacao = req.params.id;

    // 2. Busca a avaliação no banco
    const avaliacao = await Avaliacao.findById(idAvaliacao);
    if (!avaliacao) {
      return res.status(404).json({ erro: "Avaliação não encontrada." });
    }

    // 3. A Mágica do Toggle (Dar ou Tirar Like)
    const indexLike = avaliacao.likes.indexOf(usuarioLogado);

    if (indexLike === -1) {
      // Se retornou -1, o usuário NÃO está no array. Então damos o push (Like).
      avaliacao.likes.push(usuarioLogado);
    } else {
      // Se achou a posição, o usuário JÁ está no array. Damos o splice para arrancar (Descurtir).
      avaliacao.likes.splice(indexLike, 1);
    }

    // Salva a alteração no MongoDB
    await avaliacao.save();

    // 4. Retorna a resposta para o Front-end
    return res.status(200).json({
      mensagem: indexLike === -1 ? "Like adicionado!" : "Like removido!",
      likes: avaliacao.likes
    });

  } catch (erro) {
    console.error("❌ Erro ao curtir a avaliação:", erro);
    // Trata se o token estiver expirado ou corrompido
    if (erro.name === "JsonWebTokenError" || erro.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Sessão expirada. Faça login novamente." });
    }
    return res.status(500).json({ erro: "Erro interno ao processar a curtida." });
  }
});

// ==========================================
// AVATAR, RANKING & DASHBOARD
// ==========================================

// ALTERAR FOTO DE PERFIL
app.post(
  "/api/usuarios/avatar",
  upload.single("fotoPerfil"),
  async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res
          .status(401)
          .json({ erro: "Acesso negado. Faça login novamente." });
      }

      const verificado = jwt.verify(token, process.env.JWT_SECRET);
      const nomeDoUsuarioReal = verificado.nome;

      if (!req.file) {
        return res.status(400).json({ erro: "Nenhuma imagem foi recebida." });
      }

      const usuario = await Usuario.findOne({ 
        nome: new RegExp("^" + nomeDoUsuarioReal + "$", "i") 
      });

      if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado no banco." });
      }

      console.log("⏳ Subindo avatar pro Cloudinary...");
      const resultado = await cloudinary.uploader.upload(req.file.path, {
        folder: "MonsterAvatares",
      });
      const linkCloudinary = resultado.secure_url;

      // Se o cara já tinha foto, a gente destrói a antiga usando a variável 'usuario'
      if (usuario.avatarUrl && usuario.avatarUrl !== "") {
        const publicIdAntigo = obterPublicIdDaUrl(usuario.avatarUrl);
        if (publicIdAntigo) {
          console.log(`🗑️ Deletando avatar antigo: ${publicIdAntigo}`);
          await cloudinary.uploader.destroy(publicIdAntigo);
        }
      }

      // Atualiza a URL e salva o documento que já tínhamos buscado
      usuario.avatarUrl = linkCloudinary;
      await usuario.save();

      return res.json({
        mensagem: "Avatar atualizado com sucesso, monstro!",
        avatarUrl: linkCloudinary,
      });

    } catch (erro) {
      console.error("❌ Erro na rota de avatar:", erro);
      return res
        .status(500)
        .json({ erro: "Erro interno no servidor ao atualizar avatar." });
    }
  }
);

// CARREGAR RANKING DOS TOP 3
app.get("/api/ranking", async (req, res) => {
  try {
    const ranking = await Avaliacao.aggregate([
      { $group: { _id: "$sujeito", totalLatinhas: { $sum: 1 } } },
      { $sort: { totalLatinhas: -1 } },
      { $limit: 3 },
    ]);
    return res.status(200).json(ranking);
  } catch (erro) {
    return res
      .status(500)
      .json({ erro: "Erro ao gerar o painel de liderança." });
  }
});

// ENGINE DE ESTATÍSTICAS GLOBAL E PRIVADA
app.get("/api/estatisticas", async (req, res) => {
  try {
    const user = req.query.user;

    let dadosUsuarioBanco = null;
    if (user) {
      dadosUsuarioBanco = await Usuario.findOne({
        nome: new RegExp("^" + user + "$", "i")
      });
    }

    const statsGlobais = await Avaliacao.aggregate([
      {
        $group: {
          _id: null,
          totalLatas: { $sum: 1 },
          totalGasto: { $sum: "$valor" },
          mediaNotas: { $avg: "$nota" },
        },
      },
    ]);

    const saborGlobal = await Avaliacao.aggregate([
      { $group: { _id: "$sabor", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    let statsUsuario = [];
    let saborUsuario = [];

    if (user) {
      statsUsuario = await Avaliacao.aggregate([
        { $match: { sujeito: user } },
        {
          $group: {
            _id: null,
            totalLatas: { $sum: 1 },
            totalGasto: { $sum: "$valor" },
            mediaNotas: { $avg: "$nota" },
          },
        },
      ]);

      saborUsuario = await Avaliacao.aggregate([
        { $match: { sujeito: user } },
        { $group: { _id: "$sabor", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);
    }

    return res.json({
      global: {
        totalLatas: statsGlobais[0]?.totalLatas || 0,
        totalGasto: statsGlobais[0]?.totalGasto || 0,
        mediaNotas: statsGlobais[0]?.mediaNotas || 0,
        saborFavorito: saborGlobal[0]?._id || "-",
      },
      usuario: {
        totalLatas: statsUsuario[0]?.totalLatas || 0,
        totalGasto: statsUsuario[0]?.totalGasto || 0,
        mediaNotas: statsUsuario[0]?.mediaNotas || 0,
        saborFavorito: saborUsuario[0]?._id || "-",
        avatarUrl: dadosUsuarioBanco ? dadosUsuarioBanco.avatarUrl : ""
      },
    });
  } catch (erro) {
    console.error("Erro na rota de estatísticas:", erro);
    return res
      .status(500)
      .json({ erro: "Erro ao processar as estatísticas no banco." });
  }
});

// ==========================================
// RECOVERY OUTROS SISTEMAS
// ==========================================
app.post("/api/esqueci-senha", async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res
        .status(404)
        .json({ erro: "Email não encontrado na nossa base." });
    }

    const codigoPin = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenParaOFront = jwt.sign(
      { id: usuario._id, codigo: codigoPin },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const { data, error } = await resend.emails.send({
      from: "nao-responda@monstereviews.com.br",
      to: usuario.email,
      subject: "Monster Reviews - Seu Código de Recuperação",
      html: `
                <div style="font-family: Arial, sans-serif; background-color: #121212; color: #fff; padding: 20px; border-radius: 8px; text-align: center;">
                    <h2 style="color: #00ff66;">E aí monstro!</h2>
                    <p>Aqui está o seu código para criar uma nova senha:</p>
                    <h1 style="background-color: #222; padding: 15px; letter-spacing: 5px; color: #00ff66; border-radius: 8px;">${codigoPin}</h1>
                    <p style="color: #aaa; font-size: 12px;">Este código expira em 15 minutos.</p>
                </div>
            `,
    });

    if (error) throw error;
    return res
      .status(200)
      .json({ mensagem: "Código enviado!", tokenAuth: tokenParaOFront });
  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao enviar código." });
  }
});

app.post("/api/resetar-senha", async (req, res) => {
  try {
    const { token, codigoDigitado, novaSenha } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.codigo !== codigoDigitado) {
      return res.status(400).json({ erro: "Código inválido." });
    }

    const usuario = await Usuario.findById(decoded.id);
    const salt = await bcrypt.genSalt(10);
    usuario.senha = await bcrypt.hash(novaSenha, salt);
    await usuario.save();

    return res.status(200).json({ mensagem: "Senha atualizada com sucesso!" });
  } catch (erro) {
    return res.status(400).json({ erro: "Código expirado ou inválido." });
  }
});

// ==========================================
// LIGANDO O SERVIDOR
// ==========================================
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});
