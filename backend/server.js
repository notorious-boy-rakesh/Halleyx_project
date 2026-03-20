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
let MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    if (!MONGO_URI || MONGO_URI.includes('localhost')) {
      console.log('🌐 No remote MONGO_URI found. Starting MongoMemoryServer...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      MONGO_URI = mongod.getUri();
      console.log('✅ In-memory MongoDB started');

      await mongoose.connect(MONGO_URI);
      console.log('✅ MongoDB connected (In-Memory)');

      // Auto-seed the memory database
      const seed = require('./utils/seedData');
      await seed(true);
    } else {
      await mongoose.connect(MONGO_URI);
      console.log('✅ MongoDB connected (Remote)');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Notorious Transport backend running on port ${PORT}`);
      console.log(`📡 Deployment Mode: ${MONGO_URI.includes('127.0.0.1') || MONGO_URI.includes('mongodb:///') ? 'In-Memory (Ephemeral)' : 'Remote DB'}`);
    });
  } catch (err) {
    console.error('❌ Database/Server start error:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
