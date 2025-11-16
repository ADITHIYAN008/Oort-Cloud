const fs = require("fs");
const path = require("path");
const { webContents } = require("electron");

let currentRoot = null;

function loadWhitelist() {
  try {
    const p = path.join(__dirname, "../../../config/whitelist.json");
    const raw = fs.readFileSync(p, "utf8").trim();
    return JSON.parse(raw).map((x) => x.toLowerCase().trim());
  } catch (e) {
    console.warn("Could not read whitelist.json", e);
    return [];
  }
}

function getRootDomain(h) {
  if (!h) return "";
  const p = h.split(".");
  return p.length > 2 ? p.slice(-2).join(".") : h;
}

function attachToSession(sess) {
  let whitelist = loadWhitelist();

  console.log("---- ACTIVE WHITELIST ----");
  console.log(whitelist);
  console.log("---------------------------");

  sess.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    if (
      url.startsWith("chrome://") ||
      url.startsWith("file://") ||
      url.startsWith("devtools://") ||
      url.startsWith("about:") ||
      url.startsWith("data:")
    ) {
      return callback({ cancel: false });
    }

    let hostname = "";
    try {
      hostname = new URL(url).hostname.toLowerCase();
    } catch (e) {
      return callback({ cancel: true });
    }

    const cleanHost = hostname.replace(/^www\./, "");
    const root = getRootDomain(cleanHost);

    if (details.resourceType === "mainFrame") {
      const allowed = whitelist.includes(root);

      console.log(
        "MAIN:",
        url,
        "HOST:",
        cleanHost,
        "ROOT:",
        root,
        "ALLOWED:",
        allowed
      );

      if (allowed) {
        currentRoot = root;
        return callback({ cancel: false });
      }

      showBlockedPage(details, cleanHost);
      return callback({ cancel: true });
    }
    if (currentRoot && root === currentRoot) {
      return callback({ cancel: false });
    }

    return callback({ cancel: true });
  });
}

function showBlockedPage(details, host) {
  try {
    const wc = webContents.fromId(details.webContentsId);
    if (!wc || wc.isDestroyed()) return;

    const filePath = path.join(__dirname, "../../renderer/pages/blocked.html");

    let url;
    if (fs.existsSync(filePath)) {
      url = "file://" + filePath + `?host=${host}`;
    } else {
      url =
        "data:text/html;base64," +
        Buffer.from(
          `
        <html style="background:#000;color:#fff;">
          <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
            <div style="text-align:center;">
              <h1 style="color:red;">❌ Access Blocked</h1>
              <p>${host} is not allowed.</p>
            </div>
          </body>
        </html>
      `
        ).toString("base64");
    }

    setImmediate(() => wc.loadURL(url));
  } catch (e) {
    console.warn("Failed to load block page:", e);
  }
}

module.exports = { attachToSession };
