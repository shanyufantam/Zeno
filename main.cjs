const { app, BrowserWindow, dialog, shell } = require("electron");

let zenoServer;

async function createWindow() {
  process.env.ZENO_CONFIG_DIR = app.getPath("userData");

  try {
    ({ server: zenoServer } = require("./server.js"));
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        zenoServer.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        zenoServer.off("error", onError);
        resolve();
      };
      zenoServer.once("error", onError);
      zenoServer.once("listening", onListening);
      zenoServer.listen(0, "127.0.0.1");
    });
  } catch (error) {
    dialog.showErrorBox("Zeno could not start", "Zeno could not start its local service.\n\n" + error.message);
    app.quit();
    return;
  }

  const address = zenoServer.address();
  const origin = "http://127.0.0.1:" + address.port;
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#101114",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url !== origin + "/" && !url.startsWith(origin + "/")) event.preventDefault();
  });
  await win.loadURL(origin + "/");
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { if (zenoServer && zenoServer.listening) zenoServer.close(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
