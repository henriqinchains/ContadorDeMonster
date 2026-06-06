// ==========================================================================
// CONFIGURAÇÕES, CACHE IMEDIATO E GERENCIAMENTO DE AVATARES
// ==========================================================================

let usuarioLogado = sessionStorage.getItem("cache_usuario") || "";
let emailLogado = sessionStorage.getItem("cache_email") || "";
let targetUser = "";
let isMeuPerfil = false;

document.addEventListener("DOMContentLoaded", () => {

  const loggedUserEmailEl = document.getElementById("loggedEmail");
  const loggedUserEl = document.getElementById("loggedUser");

  if (loggedUserEmailEl && emailLogado) {
    loggedUserEmailEl.textContent = emailLogado;
  }

  if (loggedUserEl && usuarioLogado) {
    loggedUserEl.textContent = usuarioLogado;
  }

  const avatarNav = document.querySelector("#navUser .user-avatar");
  if (avatarNav && usuarioLogado) {
    const avatarSalvo = sessionStorage.getItem(`cache_avatar_${usuarioLogado}`);
    if (avatarSalvo) {
      avatarNav.style.background = "none";
      avatarNav.style.backgroundColor = "#11161d";
      avatarNav.style.backgroundSize = "cover";
      avatarNav.style.backgroundPosition = "center";
      avatarNav.style.backgroundRepeat = "no-repeat";
      avatarNav.style.backgroundImage = `url(${avatarSalvo})`;
      avatarNav.textContent = "";
    } else {
      avatarNav.style.backgroundImage = "none";
      avatarNav.textContent = usuarioLogado.substring(0, 2).toUpperCase();
    }
  }
});

// Executa o cache imediatamente para evitar a piscada visual
aplicarCacheImediato();

function aplicarCacheImediato() {
  const urlParams = new URLSearchParams(window.location.search);
  targetUser = urlParams.get("user") || usuarioLogado;
  isMeuPerfil = targetUser === usuarioLogado;

  document.addEventListener("DOMContentLoaded", () => {
    const profileNameEl = document.getElementById("profileNameDisplay");
    const loggedUserEl = document.getElementById("loggedUser");
    const emailDisplay = document.getElementById("profileEmailDisplay");

    const btnTrocarFoto = document.getElementById("btnTrocarFotoPerfil");
    const tituloStats = document.getElementById("tituloStatsUsuario");

    if (profileNameEl) profileNameEl.textContent = targetUser || "Carregando...";
    if (loggedUserEl) loggedUserEl.textContent = usuarioLogado;

    if (!isMeuPerfil) {
      if (btnTrocarFoto) btnTrocarFoto.style.display = "none";
      if (emailDisplay) emailDisplay.textContent = "Avaliador da Comunidade";
      if (tituloStats) tituloStats.textContent = `Desempenho de ${targetUser}`;

      if (!document.getElementById("btnVoltarPerfil")) {
        const btnVoltar = document.createElement("button");
        btnVoltar.id = "btnVoltarPerfil";
        btnVoltar.innerHTML = "Ver meu perfil";
        btnVoltar.style.padding = "8px 16px";
        btnVoltar.style.marginBottom = "15px";
        btnVoltar.style.backgroundColor = "#2c3e50";
        btnVoltar.style.color = "white";
        btnVoltar.style.border = "none";
        btnVoltar.style.borderRadius = "6px";
        btnVoltar.style.cursor = "pointer";
        btnVoltar.style.fontWeight = "bold";
        btnVoltar.onclick = () => (window.location.href = "perfil.html");

        if (profileNameEl && profileNameEl.parentNode) {
          profileNameEl.parentNode.insertBefore(btnVoltar, profileNameEl);
        }
      }

      const statsIds = ["userTotalLatas", "userGasto", "userMedia", "userSaborFav"];
      statsIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "...";
      });

    } else {
      if (btnTrocarFoto) btnTrocarFoto.style.display = "inline-block";
      if (emailDisplay) emailDisplay.textContent = emailLogado || "Sem e-mail";
      if (tituloStats) tituloStats.textContent = "Seu Desempenho";
    }

    const avatarSalvo = sessionStorage.getItem(`cache_avatar_${targetUser}`);
    atualizarAvatarPerfil(avatarSalvo);
    atualizarAvatarNavbar();
  });
}

// ==========================================================================
// FUNÇÕES GERENCIADORAS DE AVATARES (ALINHAMENTO BLINDADO REPLICADO DO FEED)
// ==========================================================================

function atualizarAvatarPerfil(source) {
  const avatarBig = document.getElementById("profileAvatarBig");
  if (!avatarBig) return;

  if (source) {
    // ⚡ Blindagem aplicada no avatar grande da página de perfil
    avatarBig.style.background = "none";
    avatarBig.style.backgroundColor = "#1f2833";
    avatarBig.style.backgroundSize = "cover";
    avatarBig.style.backgroundPosition = "center";
    avatarBig.style.backgroundRepeat = "no-repeat";
    avatarBig.style.backgroundImage = `url(${source})`;
    avatarBig.textContent = "";
  } else {
    const iniciaisTarget = targetUser ? targetUser.substring(0, 2).toUpperCase() : "US";
    avatarBig.textContent = iniciaisTarget;
    avatarBig.style.background = "linear-gradient(135deg,#e74c3c,#c0392b)";
    avatarBig.style.backgroundImage = "none";
  }
}

function atualizarAvatarNavbar() {
  const avatarNav = document.querySelector("#navUser .user-avatar");
  if (!avatarNav) return;

  const meuAvatarNavbar = sessionStorage.getItem(`cache_avatar_${usuarioLogado}`);
  if (meuAvatarNavbar) {
    // ⚡ Blindagem aplicada na bolinha da navbar dentro do perfil
    avatarNav.style.background = "none";
    avatarNav.style.backgroundColor = "#11161d";
    avatarNav.style.backgroundSize = "cover";
    avatarNav.style.backgroundPosition = "center";
    avatarNav.style.backgroundRepeat = "no-repeat";
    avatarNav.style.backgroundImage = `url(${meuAvatarNavbar})`;
    avatarNav.textContent = "";
  } else {
    const iniciaisLogado = usuarioLogado ? usuarioLogado.substring(0, 2).toUpperCase() : "US";
    avatarNav.textContent = iniciaisLogado;
    avatarNav.style.backgroundImage = "none";
  }
}

// ==========================================================================
// CONTROLE E VALIDAÇÃO DE SESSÃO
// ==========================================================================

async function verificarSessaoPerfil() {
  try {
    const resposta = await fetch("https://monster-reviews-api.onrender.com/api/auth/me", {
      method: "GET",
      credentials: "include",
    });

    if (!resposta.ok) {
      sessionStorage.clear();
      window.location.href = "../login/login.html";
      return;
    }

    const dadosUsuario = await resposta.json();
    usuarioLogado = dadosUsuario.login;
    emailLogado = dadosUsuario.email || "";

    sessionStorage.setItem("cache_usuario", usuarioLogado);
    sessionStorage.setItem("cache_email", emailLogado);

    const urlParams = new URLSearchParams(window.location.search);
    targetUser = urlParams.get("user") || usuarioLogado;
    isMeuPerfil = targetUser === usuarioLogado;

    inicializarStructurePerfil();
  } catch (erro) {
    console.error("Erro ao verificar sessão no perfil:", erro);
    window.location.href = "../login/login.html";
  }
}

// Inicializa a checagem com o servidor
verificarSessaoPerfil();

function inicializarStructurePerfil() {
  document.getElementById("profileNameDisplay").textContent = targetUser;
  document.getElementById("loggedUser").textContent = usuarioLogado;

  // ⚡ CORREÇÃO: Garante que injeta o e-mail no local correto se o DOM demorar
  const loggedUserEmailEl = document.getElementById("loggedEmail");
  if (loggedUserEmailEl && emailLogado) {
    loggedUserEmailEl.textContent = emailLogado;
  }

  const btnTrocarFoto = document.getElementById("btnTrocarFotoPerfil");
  const emailDisplay = document.getElementById("profileEmailDisplay");

  if (isMeuPerfil) {
    if (emailDisplay) emailDisplay.textContent = emailLogado || "Sem e-mail";
  }

  const fileInput = document.getElementById("profileFileInput");
  if (isMeuPerfil && btnTrocarFoto && fileInput) {
    const novoInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(novoInput, fileInput);
    btnTrocarFoto.onclick = () => novoInput.click();

    novoInput.addEventListener("change", async (e) => {
      const input = e.target;
      if (input.files && input.files[0]) {
        const textoOriginal = btnTrocarFoto.textContent;
        btnTrocarFoto.textContent = "⏳ Enviando...";
        btnTrocarFoto.disabled = true;

        const formData = new FormData();
        formData.append("nome", usuarioLogado);
        formData.append("fotoPerfil", input.files[0]);

        try {
          const resposta = await fetch("https://monster-reviews-api.onrender.com/api/usuarios/avatar", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          const dados = await resposta.json();
          if (resposta.ok) {
            sessionStorage.setItem(`cache_avatar_${usuarioLogado}`, dados.avatarUrl);
            atualizarAvatarPerfil(dados.avatarUrl);
            atualizarAvatarNavbar();
          } else {
            alert("Erro do servidor: " + dados.erro);
          }
        } catch (erro) {
          console.error("Erro no envio:", erro);
        } finally {
          btnTrocarFoto.textContent = textoOriginal;
          btnTrocarFoto.disabled = false;
        }
      }
    });
  }

  carregarEstatisticas(targetUser);
}

// ==========================================================================
// BUSCA DE ESTATÍSTICAS E SINCRONIZAÇÃO DE DADOS EM TEMPO REAL
// ==========================================================================
async function carregarEstatisticas(target) {
  try {
    const url = `https://monster-reviews-api.onrender.com/api/estatisticas?user=${encodeURIComponent(target)}`;
    const resposta = await fetch(url, { method: "GET", credentials: "include" });
    const dados = await resposta.json();

    const urlFotoReal = dados.usuario?.avatarUrl || dados.avatarUrl;

    if (urlFotoReal) {
      sessionStorage.setItem(`cache_avatar_${target}`, urlFotoReal);
      if (target === usuarioLogado) {
        sessionStorage.setItem(`cache_avatar_${usuarioLogado}`, urlFotoReal);
      }
      atualizarAvatarPerfil(urlFotoReal);
    } else {
      sessionStorage.removeItem(`cache_avatar_${target}`);
      if (target === usuarioLogado) {
        sessionStorage.removeItem(`cache_avatar_${usuarioLogado}`);
      }
      atualizarAvatarPerfil(null);
    }

    // Alimenta os dados globais na tela
    document.getElementById("globalTotalLatas").textContent = dados.global.totalLatas;
    document.getElementById("globalGasto").textContent = `R$ ${dados.global.totalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("globalMedia").textContent = dados.global.mediaNotas.toFixed(1);
    document.getElementById("globalSaborFav").textContent = dados.global.saborFavorito;

    // Alimenta os dados específicos do usuário
    document.getElementById("userTotalLatas").textContent = dados.usuario.totalLatas;
    document.getElementById("userGasto").textContent = `R$ ${dados.usuario.totalGasto.toFixed(2).replace(".", ",")}`;
    document.getElementById("userMedia").textContent = dados.usuario.mediaNotas.toFixed(1);
    document.getElementById("userSaborFav").textContent = dados.usuario.saborFavorito;

  } catch (erro) {
    console.error("Erro ao carregar estatísticas:", erro);
  }
}

// ==========================================================================
// CONTROLE DO DROPDOWN DO PERFIL (MENU SUPERIOR)
// ==========================================================================
function toggleDropdown() {
  const nu = document.getElementById("navUser");
  if (nu) nu.classList.toggle("open");
}

document.addEventListener("click", (e) => {
  const nu = document.getElementById("navUser");
  if (nu && !nu.contains(e.target)) nu.classList.remove("open");
});