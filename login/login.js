document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const button = document.getElementById("login-button");
  const message = document.getElementById("login-message");

  if (!form || !button || !message) {
    return;
  }

  // Verifica se já existe token
  const token = localStorage.getItem("authToken");
  if (token) {
    window.location.href = "../index.html";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value;

    if (!usuario || !senha) {
      message.textContent = "Preencha usuário e senha.";
      message.style.color = "#aa0000";
      message.style.fontFamily = "Nova Square, sans-serif";
      return;
    }

    button.disabled = true;
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
        throw new Error(data.message || "Falha no login");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("loggedUser", data.login);

      message.textContent = `Login realizado com sucesso, ${data.login}!`;
      message.style.color = "#adadad";
      message.style.fontFamily = "Nova Square, sans-serif";
      form.reset();

      window.setTimeout(() => {
        window.location.href = "../index.html";
      }, 800);
    } catch (error) {
      message.textContent = error.message || "Não foi possível fazer login.";
      message.style.color = "#aa0000";
      message.style.fontFamily = "Nova Square, sans-serif";
    } finally {
      button.disabled = false;
      button.textContent = "Entrar";
    }
  });
});
