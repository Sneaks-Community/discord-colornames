import http from 'node:http';
import { config } from './config/index.js';
import { logger } from './logger.js';

const PORT = config.healthPort;

/**
 * Create the health check HTTP server, wire up error handling, and start listening.
 */
function createHealthServer(): http.Server {
  const healthServer = http.createServer((_request, response) => {
    const now = new Date();
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        status: 'healthy',
        timestamp: now.toISOString(),
        uptime: process.uptime(),
      }),
    );
  });

  healthServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error({ port: PORT }, 'Health check port is already in use');
      process.exit(1);
    }
    logger.error({ error: error.message, port: PORT }, 'Health check server error');
    process.exit(1);
  });

  healthServer.listen(PORT, '127.0.0.1', () => {
    logger.info({ port: PORT }, 'Health check server started');
  });

  return healthServer;
}

export const server = createHealthServer();
