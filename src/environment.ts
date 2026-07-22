// Load environment variables from .env before anything else reads process.env.
// This module must be imported first so that any module reading process.env at
// import time (e.g. the logger) sees values from .env in local development.
import dotenv from 'dotenv';

dotenv.config();
