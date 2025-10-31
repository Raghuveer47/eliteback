# 🎯 Elite Bet Backend API

Express.js backend with MongoDB for storing all betting data while keeping Supabase for authentication.

## 🚀 Quick Setup (1 Hour Complete!)

### **Prerequisites:**
- Node.js (v16+)
- MongoDB (local or cloud)

### **Installation:**

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp env.example .env
   # Edit .env if needed (MongoDB URI, etc.)
   ```

3. **Start MongoDB:**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

## 📊 API Endpoints

### **Betting Operations:**
- `POST /api/betting/bet` - Place a bet
- `POST /api/betting/bet/result` - Process bet result
- `GET /api/betting/transactions/:userId` - Get user transactions
- `GET /api/betting/bets/:userId` - Get user bets
- `GET /api/betting/stats/:userId/:gameType` - Get game statistics
- `POST /api/betting/transaction` - Create transaction

### **Health Check:**
- `GET /health` - Server health status

## 🔧 How It Works

### **Authentication:**
- ✅ **Supabase** handles user authentication
- ✅ **Express** receives Supabase user IDs
- ✅ **No duplicate auth** - seamless integration

### **Data Flow:**
1. **User logs in** via Supabase
2. **Frontend gets** Supabase user ID
3. **Frontend calls** Express API with user ID
4. **Express stores** all betting data in MongoDB
5. **Real-time updates** in both systems

### **Database Schema:**
- **Users** - Basic user info (linked to Supabase)
- **Transactions** - All financial transactions
- **Bets** - Individual bet records
- **Admins** - Admin user management

## 🎮 Integration with Frontend

The frontend automatically uses the Express backend for:
- ✅ **Placing bets** - Stored in MongoDB
- ✅ **Processing wins** - Real-time updates
- ✅ **Transaction history** - Complete audit trail
- ✅ **Game statistics** - Performance tracking

## 🔍 Testing

1. **Start backend:** `npm run dev`
2. **Start frontend:** `npm run dev` (in main directory)
3. **Login** with Supabase
4. **Play games** - bets are stored in MongoDB
5. **Check admin panel** - see all data

## 📈 Production Ready Features

- ✅ **Rate limiting** - Prevent abuse
- ✅ **CORS protection** - Secure API
- ✅ **Error handling** - Robust error management
- ✅ **Data validation** - Input sanitization
- ✅ **MongoDB indexing** - Fast queries
- ✅ **Health monitoring** - System status

## 🎯 What's Stored in MongoDB

- **Every bet placed** by users
- **All transaction history** (deposits, withdrawals, wins)
- **Game performance** statistics
- **User betting patterns** (for admin analysis)
- **Complete audit trail** for compliance

**The system is production-ready and stores all betting data in MongoDB while keeping Supabase authentication!** 🎉
