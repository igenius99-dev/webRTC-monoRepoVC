import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "..", "client", "dist");
const PORT = process.env.PORT || 3001;

const MIME = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
};

const server = createServer((req, res) => {
  let filePath = join(DIST, req.url === "/" ? "index.html" : req.url);

  if (!existsSync(filePath)) {
    filePath = join(DIST, "index.html");
  }

  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });
const peers = new Map();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function send(ws, message) {
  return ws.send(JSON.stringify(message));
}

function broadcast(message, exceptId = null) {
  for (const [id, socket] of peers) {
    if (id === exceptId) continue;
    send(socket, message);
  }
}

wss.on("connection", (socket) => {
  const peerId = uid();
  peers.set(peerId, socket);

  send(socket, {
    type: "Welcome",
    peerId,
    peers: [...peers.keys()].filter((k) => k !== peerId),
  });

  broadcast({ type: "peer-joined", peerId }, peerId);

  socket.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "signal") {
      const target = peers.get(msg.to);
      if (target)
        send(target, { type: "signal", from: peerId, data: msg.data });
    }
  });

  socket.on("close", () => {
    peers.delete(peerId);
    broadcast({ type: "peer-left", peerId });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
