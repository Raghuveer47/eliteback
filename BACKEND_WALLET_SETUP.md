# Backend Wallet Setup Guide

This guide explains how to set up the Express/MongoDB backend for handling wallet transactions, bets, and balance updates.

## Why Use Backend Instead of Supabase?

- ⚡ **Much Faster**: Local MongoDB is significantly faster than Supabase for read/write operations
- 🔒 **Instant Updates**: Balance updates happen immediately without waiting for Supabase sync
- 📊 **Better Performance**: Optimized database queries with proper indexing
- 💰 **Reliable Transactions**: MongoDB transactions ensure data consistency
- 🎯 **Admin Control**: Full control over all transactions and approvals

## Prerequisites

1. MongoDB installed and running locally or MongoDB Atlas account
2. Node.js 16+ installed
3. Backend dependencies installed

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` folder:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/elitebet
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/elitebet

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Start the Backend Server

```bash
npm start
```

You should see:
```
🚀 Server running on port 3001
📊 Health check: http://localhost:3001/health
🎯 Betting API: http://localhost:3001/api/betting
```

### 4. Test the API

Visit: http://localhost:3001/health

You should see:
```json
{
  "status": "OK",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "uptime": 123.456
}
```

## API Endpoints

### Wallet Operations

#### Get User Balance
```http
GET /api/betting/balance/:userId
```

Response:
```json
{
  "success": true,
  "balance": 1500.50,
  "stats": {
    "totalDeposited": 5000,
    "totalWithdrawn": 2000,
    "totalWagered": 1500,
    "totalWon": 500.50
  }
}
```

#### Update User Balance
```http
POST /api/betting/balance/update
Content-Type: application/json

{
  "userId": "user123",
  "amount": 100,
  "reason": "Admin bonus"
}
```

#### Get Transactions
```http
GET /api/betting/transactions/:userId?page=1&limit=50
```

#### Create Transaction
```http
POST /api/betting/transaction
Content-Type: application/json

{
  "userId": "user123",
  "type": "deposit",
  "amount": 500,
  "description": "Manual deposit",
  "metadata": {
    "method": "bank_transfer",
    "transactionId": "TXN123"
  }
}
```

### Betting Operations

#### Place a Bet
```http
POST /api/betting/bet
Content-Type: application/json

{
  "userId": "user123",
  "gameId": "slots_001",
  "gameType": "slots",
  "amount": 10,
  "details": {
    "slotMachine": "Lucky 7"
  }
}
```

#### Process Bet Result
```http
POST /api/betting/bet/result
Content-Type: application/json

{
  "betId": "bet_123",
  "userId": "user123",
  "result": "won",
  "payout": 25,
  "details": {
    "winningSymbols": ["7", "7", "7"]
  }
}
```

## Frontend Integration

### 1. Update Frontend Environment

Add to `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:3001/api/betting
```

### 2. Use BackendWalletService

Replace Supabase calls with backend service:

```typescript
import { BackendWalletService } from './services/backendWalletService';

// Get balance
const balance = await BackendWalletService.getUserBalance(userId);

// Place bet
const result = await BackendWalletService.placeBet({
  userId: user.id,
  gameId: 'slots_001',
  gameType: 'slots',
  amount: 10
});

// Create transaction
const transaction = await BackendWalletService.createTransaction({
  userId: user.id,
  type: 'deposit',
  amount: 500,
  description: 'Bank deposit',
  metadata: { method: 'bank_transfer' }
});
```

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  userId: String,      // Supabase user ID
  email: String,
  firstName: String,
  lastName: String,
  balance: Number,     // Current balance
  currency: String,
  totalDeposited: Number,
  totalWithdrawn: Number,
  totalWagered: Number,
  totalWon: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Transactions Collection
```javascript
{
  _id: ObjectId,
  userId: String,
  type: String,        // deposit, withdrawal, bet, win, refund, bonus, fee
  amount: Number,
  currency: String,
  status: String,      // pending, completed, failed, cancelled
  description: String,
  reference: String,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Bets Collection
```javascript
{
  _id: ObjectId,
  userId: String,
  gameId: String,
  gameType: String,    // slots, blackjack, roulette, baccarat, lottery, sports
  amount: Number,
  status: String,      // pending, won, lost, cancelled
  payout: Number,
  details: Object,
  settledAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Production Deployment

### 1. MongoDB Atlas Setup

1. Create MongoDB Atlas account
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### 2. Deploy Backend

Options:
- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **Render**: Deploy from GitHub
- **DigitalOcean**: Deploy app droplet

### 3. Environment Variables

Set in your hosting provider:
- `MONGODB_URI`
- `PORT`
- `CORS_ORIGIN`
- `NODE_ENV=production`

## Performance Optimization

### Database Indexes

Already configured:
- `userId` index on Users, Transactions, Bets
- `balance` index on Users
- `createdAt` descending index on Transactions and Bets

### Caching Strategy

Consider adding Redis for:
- Balance cache (update every 5 minutes)
- Transaction history cache
- Stats cache

## Troubleshooting

### Connection Issues

If backend won't connect:
1. Check MongoDB is running: `mongod`
2. Verify `MONGODB_URI` in `.env`
3. Check firewall settings

### Balance Not Updating

1. Check backend logs for errors
2. Verify user exists in MongoDB
3. Check transaction success response

### CORS Errors

Add frontend URL to `CORS_ORIGIN`:
```
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com
```

## Admin Features

The backend supports:
- ✅ Real-time balance updates
- ✅ Transaction history
- ✅ Bet tracking
- ✅ Automatic balance calculations
- ✅ Stats aggregation
- ✅ Admin balance adjustments

## Next Steps

1. Start the backend server
2. Update frontend to use BackendWalletService
3. Test deposit/withdrawal flow
4. Test betting flow
5. Deploy to production

Enjoy faster, more reliable wallet operations! 🚀
