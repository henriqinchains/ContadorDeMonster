document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initCadastro();
});

function Switch() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "block";
}

function SwitchBack() {
  document.getElementById("register-section").style.display = "none";
  document.getElementById("login-section").style.display = "block";
}

function initLogin() {
  const form = document.getElementById("login-form");
  const button = document.getElementById("login-button");
  const message = document.getElementById("login-message");
  // Verifica se já existe token
  const token = localStorage.getItem("authToken");

  if (token) {
    window.location.href = "../feed/feed.html";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usuario = document.getElementById("usuario-login").value.trim();
    const senha = document.getElementById("senha-login").value;

    if (!usuario || !senha) {
      message.style.display = "block";
      message.textContent = "Preencha usuário e senha.";
      message.style.color = "#aa0000";
      message.style.fontFamily = "Nova Square, sans-serif";
      setTimeout(() => {
        message.style.display = "none";
      }, 3000);
      return;
    }

    button.disabled = true;
    message.style.display = "block";
    message.style.fontFamily = "Nova Square, sans-serif";
    button.textContent = "Entrando...";
    message.textContent = "Validando suas credenciais...";
    message.style.color = "#adadad";

    try {
      const response = await fetch(
        "https://monster-reviews-api.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: usuario, password: senha }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        message.style.display = "block";
        throw new Error(data.message || "Falha no login");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("loggedUser", data.login);

      message.style.display = "block";
      message.style.color = "#adadad";
      message.style.fontFamily = "Nova Square, sans-serif";
      message.textContent = `Login realizado com sucesso, ${data.login}!`;
      form.reset();

      window.setTimeout(() => {
        window.location.href = "../feed/feed.html";
      }, 2000);
    } catch (error) {
      message.style.display = "block";
      message.textContent = error.message || "Não foi possível fazer login.";
      message.style.color = "#aa0000";
      message.style.fontFamily = "Nova Square, sans-serif";
    } finally {
      button.disabled = false;
      button.textContent = "Entrar";
    }
  });
}

function initCadastro() {
  document
    .getElementById("formCadastro")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      // Pegando os valores da tela
      const usuario = document.getElementById("usuario-cadastro").value;
      const email = document.getElementById("email-cadastro").value;
      const senha = document.getElementById("senha-cadastro").value;
      const confirmacaoSenha = document.getElementById(
        "confirm-senha-cadastro",
      ).value;
      const message = document.getElementById("cadastro-message");

      if (senha !== confirmacaoSenha) {
        message.style.display = "block";
        message.textContent =
          "As senhas não coincidem. Por favor, tente novamente.";
        message.style.color = "#aa0000";
        message.style.fontFamily = "Nova Square, sans-serif";
        document.getElementById("confirm-senha-cadastro").value = "";
        setTimeout(() => {
          message.style.display = "none";
        }, 3000);
        return;
      }

      message.textContent = "Enviando...";
      message.style.color = "#adadad";
      message.style.display = "block";

      try {
        // DISPARANDO PRO SEU RENDER!
        const resposta = await fetch(
          "https://monster-reviews-api.onrender.com/api/auth/cadastro",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              login: usuario,
              email: email,
              password: senha,
            }),
          },
        );

        const dados = await resposta.json();
        console.log(dados);
        console.log(resposta.status);

        if (resposta.ok) {
          // Status 201 (Sucesso)
          message.style.display = "block";
          message.textContent = `✅ ${dados.mensagem}`;
          message.style.color = "#007500";
          message.style.fontFamily = "Nova Square, sans-serif";

          localStorage.setItem("authToken", dados.token);
          localStorage.setItem("loggedUser", dados.login);

          document.getElementById("formCadastro").reset();

          window.setTimeout(() => {
            window.location.href = "../feed/feed.html";
          }, 2000);
        } else {
          // Erros tratados pelo seu Back-end (Status 400)
          message.style.display = "block";
          message.textContent = `❌ ${dados.erro}`;
          message.style.color = "#aa0000";
          message.style.fontFamily = "Nova Square, sans-serif";
          setTimeout(() => {
            message.style.display = "none";
          }, 3000);
        }
      } catch (error) {
        // Caso o servidor esteja fora do ar ou dê erro 500
        message.style.display = "block";
        message.textContent = "❌ Erro ao conectar com o servidor do Render.";
        message.style.color = "#aa0000";
        message.style.fontFamily = "Nova Square, sans-serif";
        setTimeout(() => {
          message.style.display = "none";
        }, 3000);
        console.error(error);
      }
    });
}
