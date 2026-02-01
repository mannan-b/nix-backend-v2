
const mongoose = require("mongoose");

const uri = "mongodb://127.0.0.1:27017/nix_debug_db";

async function run() {
    console.log(`Attempting to connect to ${uri}...`);
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000 // Fail after 5 seconds
        });
        console.log("✅ Successfully connected to MongoDB!");
        await mongoose.disconnect();
        console.log("Disconnected.");
    } catch (err) {
        console.error("❌ Connection Failed:", err.message);
    }
}

run();
