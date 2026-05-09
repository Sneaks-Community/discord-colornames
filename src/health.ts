import http from 'node:http';
import { config } from './config/index.js';
import { logger } from './logger.js';

const PORT = config.healthPort;

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
  );
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error({ port: PORT }, 'Health check port is already in use');
    process.exit(1);
  }
  logger.error({ error: error.message, port: PORT }, 'Health check server error');
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  logger.info({ port: PORT }, 'Health check server started');
});

export { server };
