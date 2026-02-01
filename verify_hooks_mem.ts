
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// We need to setup the mock DB BEFORE requiring models/config causing side effects
let mongod;

async function setup() {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    process.env.MONGO_URI = uri;
    process.env.DEFAULT_ROLE_ID = new mongoose.Types.ObjectId().toString();

    console.log(`Mock DB started at ${uri}`);

    // Connect
    await mongoose.connect(uri);
}

async function runTest() {
    await setup();

    // Now require User model (it uses mongoose.model which registers on the default connection)
    const { User } = require("./src/api/models/userModel");

    try {
        const email = "MemTest@Example.com";
        const lowerEmail = email.toLowerCase();

        // 1. Test create (should trigger pre-save hook)
        console.log("Testing User.create...");

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
            process.exit(1);
        }

        // 2. Test insertMany 
        console.log("Testing insertMany behavior...");
        const mixedBulk = "BulkMem@Example.com";
        const lowerBulk = mixedBulk.toLowerCase();

        // Controller simulation: Manual Lowercase
        const usersData = [{
            name: "Bulk User",
            email: mixedBulk.toLowerCase(), // Controller does this
            password: "hashedpassword",
            role_id: new mongoose.Types.ObjectId()
        }];

        await User.insertMany(usersData, { ordered: false });

        const found = await User.findOne({ email: lowerBulk });
        if (found) {
            console.log(`✅ insertMany: User found with email '${found.email}'`);
        } else {
            console.error("❌ insertMany: User not found.");
            process.exit(1);
        }

        console.log("ALL TESTS PASSED");

    } catch (e) {
        console.error("Test Error:", e);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        await mongod.stop();
    }
}

runTest();
