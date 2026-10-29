import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { WebSocketServer } from 'ws';
import os from 'os';

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        continue;
      }
      return iface.address;
    }
  }
  return 'localhost';
}

function playstationWsPlugin() {
  return {
    name: 'playstation-ws',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on('upgrade', (request, socket, head) => {
        if (request.url && request.url.startsWith('/playstation-ws')) {
          const url = new URL(request.url, `http://localhost`);
          const session = url.searchParams.get('session') || 'default';
          wss.handleUpgrade(request, socket, head, (ws) => {
            ws.session = session;
            wss.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', (ws) => {
        ws.on('message', (message) => {
          // Broadcast message to everyone except sender, in the same session
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1 && client.session === ws.session) {
              client.send(message.toString());
            }
          });
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), playstationWsPlugin()],
  server: {
    host: "127.0.0.1",
    allowedHosts: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/party-ws": { target: "ws://127.0.0.1:3000", ws: true, changeOrigin: true },
      "/party-ws-secure": { target: "ws://127.0.0.1:3000", ws: true, changeOrigin: true },
    },
  },
  define: {
    __NETWORK_IP__: JSON.stringify(getLocalIp())
  }
});
