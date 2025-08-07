const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
  try {
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in the environment variables");
}

    await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    heartbeatFrequencyMS: 2000,
    });
    
    console.log("Connected to MongoDB");
    return mongoose.connection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

module.exports = { connectDB, mongoose };
