// src/renderer/renderer.js
window.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("url");
  const goBtn = document.getElementById("go");
  const backBtn = document.getElementById("back");
  const forwardBtn = document.getElementById("forward");
  const reloadBtn = document.getElementById("reload");
  const emergencyBtn = document.getElementById("emergency");
  const adminBtn = document.getElementById("admin");

  goBtn.addEventListener("click", () => {
    window.secureAPI.loadURL(urlInput.value);
  });

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") window.secureAPI.loadURL(urlInput.value);
  });

  backBtn.addEventListener("click", () => window.secureAPI.navControl("back"));
  forwardBtn.addEventListener("click", () =>
    window.secureAPI.navControl("forward")
  );
  reloadBtn.addEventListener("click", () =>
    window.secureAPI.navControl("reload")
  );

  emergencyBtn.addEventListener("click", async () => {
    // When a user hits emergency exit we lock that user and quit the app.
    // Retrieve current user id (if available)
    const userId = await window.secureAPI.getCurrentUser();
    const ok = confirm(
      "Emergency exit will lock your account and quit the app. Continue?"
    );
    if (!ok) return;

    // request main to mark emergency exit for this user
    try {
      await window.secureAPI.userEmergencyExit(userId);
      // main will exit the process; if not, fallback:
      setTimeout(() => window.close(), 200);
    } catch (e) {
      console.error("userEmergencyExit failed", e);
      alert("Failed to perform emergency exit.");
    }
  });

  adminBtn.addEventListener("click", async () => {
    const pin = prompt("Enter admin PIN:");
    if (!pin) return;
    const settings = await fetch("../../config/settings.json")
      .then((r) => r.json())
      .catch(() => null);
    if (settings && pin === settings.adminPassword) {
      const wl = await fetch("../../config/whitelist.json")
        .then((r) => r.json())
        .catch(() => []);
      const newList = prompt(
        "Edit whitelist (one domain per line):",
        wl.join("\n")
      );
      if (newList !== null) {
        const arr = newList
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const ok = await window.secureAPI.adminUpdateWhitelist(arr);
        alert(ok ? "Saved" : "Save failed");
      }
    } else {
      alert("Invalid PIN");
    }
  });
});
