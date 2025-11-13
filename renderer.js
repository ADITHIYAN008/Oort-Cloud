const webview = document.getElementById("webview");
const input = document.getElementById("address");
const goBtn = document.getElementById("go");

window.addEventListener("contextmenu", (e) => e.preventDefault());

goBtn.addEventListener("click", () => {
  const query = input.value.trim();
  if (!query) return;

  let url = query.startsWith("http")
    ? query
    : `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  window.secureAPI.openUrl(url);
});

window.secureAPI.onNavigate((url) => {
  webview.loadURL(url);
});
