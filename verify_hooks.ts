
// Use require for reliable ordering in test script
const mongoose = require("mongoose");

// Set Env Vars FIRST
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/nix_test_db";
process.env.DEFAULT_ROLE_ID = new mongoose.Types.ObjectId().toString();

// Now require dependencies
// adjust paths since we are in root
// Note: ts-node handles TS require if we run it with ts-node
const { User } = require("./src/api/models/userModel");
const connectDB = require("./src/config/DatabaseConfig").default;

async function testHooks() {
    console.log(`Connecting to Test DB: ${process.env.MONGO_URI}...`);
    try {
        await connectDB();

        const email = "LiveHookTest@Example.com";
        const lowerEmail = email.toLowerCase();

        // 1. Test create (should trigger pre-save hook)
        console.log("Testing User.create...");
        await User.deleteMany({ email: { $in: [email, lowerEmail] } });

        const user1 = await User.create({
            name: "Hook Test",
            email: email, // Mixed case input
            password: "hashedpassword",
            role_id: new mongoose.Types.ObjectId()
        });

        console.log(`User created. Stored email: '${user1.email}'`);

        if (user1.email === lowerEmail) {
            console.log("✅ User.create: Email normalized to lowercase.");
        } else {
            console.error(`❌ User.create: Email NOT normalized! Got: ${user1.email}`);
        }

        // 2. Test insertMany 
        console.log("Testing insertMany behavior...");
        const mixedBulk = "BulkMixed@Example.com";
        const lowerBulk = mixedBulk.toLowerCase();
        await User.deleteOne({ email: lowerBulk });

        const usersData = [{
            name: "Bulk User",
            email: lowerBulk, // Simulated Controller normalization
            password: "hashedpassword",
            role_id: new mongoose.Types.ObjectId()
        }];

        await User.insertMany(usersData, { ordered: false });

        const found = await User.findOne({ email: lowerBulk });
        if (found) {
            console.log(`✅ insertMany: User found with email '${found.email}'`);
        } else {
            console.error("❌ insertMany: User not found (should be there).");
        }

        // Cleanup
        await User.deleteMany({ email: { $regex: /Example.com$/i } });
        console.log("Test finished.");

    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

testHooks();
