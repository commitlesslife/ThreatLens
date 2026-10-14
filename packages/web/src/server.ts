import path from "node:path";
import express from "express";

const app = express();
const webRoot = path.resolve("packages/web");

// Static files
app.use("/dist", express.static(path.join(webRoot, "dist")));
app.use("/src", express.static(path.join(webRoot, "src")));
app.use(express.static(webRoot));

// SPA fallback to index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(webRoot, "index.html"));
});

if (process.env.NODE_ENV !== "test" && /packages[/\\]web/.test(process.argv[1] || "")) {
  const preferredPort = parseInt(process.env.WEB_PORT || "3000", 10);

  const startListening = (port: number) => {
    const server = app.listen(port, () => {
      console.log(`[ThreatLens] Web Application running on http://localhost:${port}`);
      console.log(`[ThreatLens] API target expected on http://localhost:3001`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE" && port === 3000) {
        console.warn(`[ThreatLens] Port 3000 is in use. Falling back to port 3002.`);
        startListening(3002);
      } else {
        console.error("[ThreatLens] Web server error:", err);
      }
    });
  };

  startListening(preferredPort);
}

export { app };
