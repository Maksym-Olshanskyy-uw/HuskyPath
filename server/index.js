/**
 * HuskyPath API server
 * --------------------
 * Boots Express, mounts all API routers, and exposes a health check.
 *
 *   PORT       defaults to 3001
 *   NODE_ENV   "development" | "production"
 */

'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const coursesRouter   = require('./routes/courses');
const parseRouter     = require('./routes/parse');     // owner: Max
const schedulesRouter = require('./routes/schedules'); // owner: Kieran
const planRouter      = require('./routes/plan');      // owner: Kieran — integration glue

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// CORS: in production, lock down to comma-separated CORS_ORIGIN(s)
// (e.g. "https://huskypath.vercel.app"). In development allow all.
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'huskypath-api', time: new Date().toISOString() });
});

app.use('/api/courses',            coursesRouter);
app.use('/api/parse-constraints',  parseRouter);
app.use('/api/schedules',          schedulesRouter);
app.use('/api/plan',               planRouter);

// 404 fallback for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Unknown API route: ${req.method} ${req.originalUrl}` });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`[huskypath-api] listening on port ${PORT}`);
  });
}

module.exports = app;
