import { createServer as createHttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createTeltonikaTcpServer } from './src/server/tcp-server';
import { createTeltonikaUdpServer } from './src/server/udp-server';

const TCP_PORT = Number(process.env.TELTONIKA_TCP_PORT || 5027);
const UDP_PORT = Number(process.env.TELTONIKA_UDP_PORT || 5028);
const HTTP_PORT = Number(process.env.PORT || 3002);

// HTTP & Socket.IO Telemetry Broadcast Server
const httpServer = createHttpServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'ok',
      service: 'teltonika-decoder-gateway',
      tcpPort: TCP_PORT,
      udpPort: UDP_PORT,
      wsPort: HTTP_PORT,
      supportedCodecs: ['Codec 8 (0x08)', 'Codec 8 Extended (0x8E)', 'Codec 16 (0x10)'],
    })
  );
});

const ioServer = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

ioServer.on('connection', (socket) => {
  console.log('[Teltonika Gateway] Client connected to WebSocket:', socket.id);
});

// Initialize TCP & UDP Server Gateways
const tcpServer = createTeltonikaTcpServer(ioServer);
const udpServer = createTeltonikaUdpServer(ioServer);

tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Teltonika Gateway TCP Server Listening on 0.0.0.0:${TCP_PORT}`);
});

udpServer.bind(UDP_PORT, '0.0.0.0', () => {
  console.log(`📡 Teltonika Gateway UDP Server Listening on 0.0.0.0:${UDP_PORT}`);
});

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🌐 WebSocket & Telemetry Stream Listening on 0.0.0.0:${HTTP_PORT}`);
  console.log(`=======================================================`);
});
