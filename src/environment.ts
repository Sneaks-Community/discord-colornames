// Load environment variables from .env before anything else reads process.env.
// This module must be imported first so that any module reading process.env at
// import time (e.g. the logger) sees values from .env in local development.
try {
  process.loadEnvFile();
} catch (error) {
  // .env is optional; Docker supplies variables directly.
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
