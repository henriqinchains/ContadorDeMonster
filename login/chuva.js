window.addEventListener("DOMContentLoaded", function () {
  const container = document.querySelector(".rain");

  if (!container) {
    return;
  }

  const quantidadeBranco = 20;

  for (let i = 0; i < quantidadeBranco; i++) {
    const drop = document.createElement("div");

    const size = Math.random() * 40 + 25;
    const rotationStart = Math.random() * 360;
    const rotationDir = Math.random() < 0.5 ? -1 : 1;
    const rotationSpeed = Math.random() * 200 + 80;

    const duration = Math.random() * 4 + 5;
    const delay = Math.random() * 5;

    drop.className = "drop";
    drop.style.width = `${size}px`;
    drop.style.height = `${size}px`;
    drop.style.left = Math.random() * 100 + "vw";

    drop.style.animationDuration = `${duration}s`;
    drop.style.animationDelay = `${delay}s`;

    drop.style.setProperty("--rot-start", `${rotationStart}deg`);
    drop.style.setProperty("--rot-delta", `${rotationDir * rotationSpeed}deg`);

    const depth = Math.random();
    drop.style.opacity = `${0.3 + depth * 0.6}`;
    drop.style.filter = `blur(${1.5 - depth * 1.2}px)`;

    container.appendChild(drop);
  }
});
