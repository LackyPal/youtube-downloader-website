const htmlEl = document.getElementsByTagName("html")[0];

document.addEventListener("DOMContentLoaded", () => {
  const theme = window.matchMedia("(prefers-color-scheme: dark)")
    ? "dark"
    : "light";

  htmlEl.dataset.theme = theme;
});
