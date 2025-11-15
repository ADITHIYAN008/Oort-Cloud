function apply(mainWindow) {
  mainWindow.setKiosk(true);

  mainWindow.on("leave-full-screen", () => {
    mainWindow.setFullScreen(true);
  });
}

module.exports = { apply };
