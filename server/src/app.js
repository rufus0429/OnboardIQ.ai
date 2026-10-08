const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const pino = require('pino');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');

const app = express();
app.set('trust proxy', 1); // Trust first proxy for Render

const logger = pino({ level: env.LOG_LEVEL });
app.disable('x-powered-by');

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : '*',
}));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // Limit each IP to 100 requests per `window` (here, per minute)
  message: { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const workspacesRouter = require('./routes/workspaces');
const simulatorRouter = require('./routes/simulator');
const analyticsRouter = require('./routes/analytics');
const analyzeRouter = require('./routes/analyze');
const interventionsRouter = require('./routes/interventions');
const outcomesRouter = require('./routes/outcomes');

app.use('/api/workspaces', workspacesRouter);
app.use('/api/workspaces/:workspaceId/simulator', simulatorRouter);
app.use('/api/workspaces/:workspaceId', analyticsRouter);
app.use('/api/workspaces/:workspaceId/analyze', analyzeRouter);
app.use('/api/workspaces/:workspaceId/interventions', interventionsRouter);
app.use('/api/workspaces/:workspaceId/outcomes', outcomesRouter);

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});


// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    ok: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    }
  });
});

module.exports = { app, logger };
