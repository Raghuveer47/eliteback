require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use environment variable or default to MongoDB Atlas
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://raghuveermustimalla_db_user:elite@cluster0.bsybeh3.mongodb.net/?appName=Cluster0";
    
    // Mask credentials in logs
    const maskedUri = MONGODB_URI.replace(/\/\/.*@/, '//****@');
    console.log(`Attempting to connect to: ${maskedUri}`);
    
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('');
    console.log('⚠️  ========================================');
    console.log('⚠️  MongoDB Connection Failed');
    console.log('⚠️  ========================================');
    console.log('');
    console.log('🔧 QUICK FIX - Install Local MongoDB:');
    console.log('   brew install mongodb-community');
    console.log('   brew services start mongodb-community');
    console.log('');
    console.log('📝 Or create a .env file with correct connection string:');
    console.log('   MONGODB_URI=mongodb://localhost:27017/elite-bet');
    console.log('');
    console.log('⚠️  Server will continue but database features won\'t work');
    console.log('');
    // Don't exit - allow server to run without DB
  }
};

module.exports = connectDB;
