const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/trucks',     require('./routes/trucks'));
app.use('/api/trips',      require('./routes/trips'));
app.use('/api/expenses',   require('./routes/expenses'));
app.use('/api/analytics',  require('./routes/analytics'));
app.use('/api/workflows',  require('./routes/workflows'));
app.use('/api/steps',      require('./routes/steps'));
app.use('/api/rules',      require('./routes/rules'));
app.use('/api/logs',       require('./routes/logs'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Redirect root to login page
app.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

// Serve frontend for any non-API route
app.get('*', (req, res) => {
  res.status(404).send('404 Not Found');
});

// ── Error Handler ───────────────────────────────────────────────────────────
app.use(require('./middleware/errorHandler'));

// ── Database + Server Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/flowforge';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Notorious Transport backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
