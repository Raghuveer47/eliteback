const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const bettingRoutes = require('./routes/betting');
const authRoutes = require('./routes/auth');
const supportRoutes = require('./routes/support');
const kycRoutes = require('./routes/kyc');

const app = express();
const server = http.createServer(app);

// Parse CORS origins for Socket.IO (must be array or function, not comma-separated string)
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const socketCorsOrigin = corsOrigins.length > 0 ? corsOrigins : true;

const io = new Server(server, {
  cors: {
    origin: socketCorsOrigin,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration (robust origin matching, supports multiple origins, trims slashes)
const rawOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = rawOrigins.length > 0 ? rawOrigins.map(o => o.replace(/\/$/, '')) : ['*'];

app.use((req, res, next) => {
  try {
    const reqOrigin = (req.headers.origin || '').replace(/\/$/, '');
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(reqOrigin);
    const corsOptions = {
      origin: isAllowed ? reqOrigin || true : false,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    };
    return cors(corsOptions)(req, res, next);
  } catch (e) {
    return cors({ origin: true, credentials: true })(req, res, next);
  }
});

// Handle preflight globally
app.options('*', (req, res) => {
  const reqOrigin = (req.headers.origin || '').replace(/\/$/, '');
  const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(reqOrigin);
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', reqOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  return res.sendStatus(204);
});

// Rate limiting - DISABLED FOR DEVELOPMENT
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);
console.log('⚠️  Rate limiting disabled for development');

// Logging
app.use(morgan('combined'));

 // Simple request logger for debugging API calls
app.use((req, res, next) => {
  try {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
  } catch (e) {}
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/betting', bettingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/kyc', kycRoutes);

// In-memory blackjack sessions (simple, per-user)
const blackjackState = new Map(); // key: userId, value: { deckId, player:[], dealer:[] }

async function deckFetch(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) { return null; }
}

app.post('/api/betting/blackjack/start', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ success:false, message:'userId required' });
    // New 6-deck shoe
    const deck = await deckFetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6');
    if (!deck?.deck_id) return res.status(500).json({ success:false, message:'deck api failed' });
    const deckId = deck.deck_id;
    const draw = await deckFetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=4`);
    if (!draw?.cards) return res.status(500).json({ success:false, message:'draw failed' });
    const cards = draw.cards;
    const player = [cards[0], cards[2]];
    const dealer = [cards[1], cards[3]];
    blackjackState.set(userId, { deckId, player, dealer });
    return res.json({ success:true, deckId, player, dealer });
  } catch (e) {
    return res.status(500).json({ success:false, message:'server error' });
  }
});

app.post('/api/betting/blackjack/hit', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const st = blackjackState.get(userId);
    if (!st) return res.status(400).json({ success:false, message:'no session' });
    const draw = await deckFetch(`https://deckofcardsapi.com/api/deck/${st.deckId}/draw/?count=1`);
    if (!draw?.cards) return res.status(500).json({ success:false, message:'draw failed' });
    const card = draw.cards[0];
    st.player.push(card);
    return res.json({ success:true, card, player: st.player });
  } catch { return res.status(500).json({ success:false, message:'server error' }); }
});

function bjScore(hand){
  let total=0, aces=0;
  for (const c of hand){
    if (c.value==='ACE'){ total+=11; aces++; }
    else if (['KING','QUEEN','JACK'].includes(c.value)) total+=10; else total+=parseInt(c.value,10);
  }
  while(total>21 && aces>0){ total-=10; aces--; }
  return total;
}

app.post('/api/betting/blackjack/stand', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const st = blackjackState.get(userId);
    if (!st) return res.status(400).json({ success:false, message:'no session' });
    // Dealer draws to 17+
    let dealer = st.dealer.slice();
    while (bjScore(dealer) < 17){
      const draw = await deckFetch(`https://deckofcardsapi.com/api/deck/${st.deckId}/draw/?count=1`);
      if (!draw?.cards) break; dealer.push(draw.cards[0]);
    }
    st.dealer = dealer;
    const ps = bjScore(st.player); const ds = bjScore(dealer);
    let outcome = 'loss';
    if (ps>21) outcome = 'loss'; else if (ds>21 || ps>ds) outcome='win'; else if (ps===ds) outcome='push';
    return res.json({ success:true, dealer, outcome, playerTotal: ps, dealerTotal: ds });
  } catch { return res.status(500).json({ success:false, message:'server error' }); }
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Elite Bet Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint - critical for Render deployment
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler (ignore Socket.IO engine endpoint)
app.use('*', (req, res) => {
  if (req.originalUrl && req.originalUrl.startsWith('/socket.io')) {
    return; // let Socket.IO engine handle this request
  }
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Socket.IO – simple casino namespace with dice demo
const casinoNs = io.of('/casino');
casinoNs.on('connection', (socket) => {
  console.log('[Socket] client connected to /casino');
  try {
    // Dice game: client emits { userId, amount, choice, gameId, gameName }
    socket.on('dice:play', (payload) => {
      try {
        const amount = Number(payload?.amount || 0);
        const choice = Number(payload?.choice || 0);
        if (!amount || amount <= 0 || !choice || choice < 1 || choice > 6) {
          return socket.emit('dice:error', { message: 'Invalid bet' });
        }
        // Cryptographically-strong-ish random if available
        const roll = Math.floor(Math.random() * 6) + 1;
        const win = roll === choice ? amount * 5 : 0;

        socket.emit('dice:result', {
          roll,
          win,
          choice,
          amount,
          gameId: payload?.gameId || 'quick-dice',
          gameName: payload?.gameName || 'Quick Dice',
          ts: Date.now()
        });
      } catch (e) {
        socket.emit('dice:error', { message: 'Server error' });
      }
    });

    // Instant ACK for slots bets to remove frontend delay
    socket.on('slots:bet', (payload) => {
      try {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        socket.emit('slots:ack', { tempBetId: tempId, ts: Date.now(), amount: Number(payload?.amount || 0) });
      } catch {}
    });
  } catch {}
});

// Bind to 0.0.0.0 for Render/production deployment
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Betting API: http://localhost:${PORT}/api/betting`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📧 SMTP Configured: ${process.env.SMTP_USER ? 'Yes' : 'No'}`);
});

module.exports = app;
