import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Set environment variables BEFORE importing userService/userModel
process.env.DEFAULT_ROLE_ID = new mongoose.Types.ObjectId().toString();
process.env.REFRESH_SECRET_KEY = "test_secret";
process.env.ENABLE_EMAIL = "false";
process.env.EMAIL_SERVICE_USER = "test@example.com";
process.env.EMAIL_SERVICE_PASS = "test";

const run = async () => {
    let UserService: any;
    let User: any;
    let Role: any;
    const fs = require('fs'); // Require fs early
    console.log("STEP 1: Starting MMS");
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    console.log("STEP 2: MMS Started, URI:", uri);

    console.log("STEP 3: Connecting Mongoose");
    await mongoose.connect(uri);
    console.log("STEP 4: Connected to in-memory MongoDB");

    try {
        console.log("STEP 5: Loading modules...");
        ({ Role } = require("../src/api/models/rolesModel")); // Ensure Role model is registered
        console.log("STEP 5.1: Role loaded");
        UserService = require("../src/api/services/userService");
        console.log("STEP 5.2: UserService loaded");
        ({ User } = require("../src/api/models/userModel"));
        console.log("STEP 6: Modules loaded.");

        const emailMixed = "UserMixedCase@Example.com";
        const name = "Test User";
        const roleId = process.env.DEFAULT_ROLE_ID!;

        console.log(`\n1. Creating user with email: ${emailMixed}`);
        const user = await UserService.createNewUser(name, emailMixed, roleId);

        if (!user) throw new Error("Failed to create user");
        console.log("User created successfully.");

        // Verify storage
        const storedUser = await User.findById(user._id);
        console.log(`\n2. Verifying stored email via raw DB query...`);
        console.log(`Stored Email: '${storedUser?.email}'`);

        if (storedUser?.email !== emailMixed) {
            throw new Error(`FAILURE: Expected stored email to be '${emailMixed}' but got '${storedUser?.email}'`);
        } else {
            console.log("SUCCESS: Original casing preserved in DB.");
        }

        // Verify Login / Existence Check
        const emailLower = emailMixed.toLowerCase();
        const emailUpper = emailMixed.toUpperCase();

        console.log(`\n3. Checking existence with lowercase: ${emailLower}`);
        const foundLower = await UserService.checkUserExists({ email: emailLower });
        if (foundLower) {
            console.log("SUCCESS: Found user using lowercase email.");
        } else {
            throw new Error("FAILURE: Could not find user using lowercase email.");
        }

        console.log(`\n4. Checking existence with uppercase: ${emailUpper}`);
        const foundUpper = await UserService.checkUserExists({ email: emailUpper });
        if (foundUpper) {
            console.log("SUCCESS: Found user using uppercase email.");
        } else {
            throw new Error("FAILURE: Could not find user using uppercase email.");
        }

        // Verify Duplicate Prevention in createNewUsers
        console.log(`\n5. Attempting to create duplicate user with: ${emailLower}`);

        const result = await UserService.createNewUsers([{
            name: "Duplicate Attempt",
            email: emailLower,
            password: "password",
            role_id: new mongoose.Types.ObjectId(), // Mock
            date_joined: new Date(),
            team_role: 0
        } as any]);

        if (result.createdUsers.length === 0 && result.existingUsers.length === 1) {
            console.log("SUCCESS: createNewUsers correctly identified duplicate case-insensitively.");
        } else {
            console.log("Result:", result);
            throw new Error("FAILURE: createNewUsers did not detect duplicate properly.");
        }

        console.log("\nALL TESTS PASSED.");

    } catch (err) {
        console.error("________________ERROR OCCURRED________________");
        console.error("ENV DEFAULT_ROLE_ID:", process.env.DEFAULT_ROLE_ID);
        if (err instanceof Error) {
            console.error("Message:", err.message);
            console.error("Stack:", err.stack);
        } else {
            console.error(JSON.stringify(err, null, 2));
        }
        console.error("______________________________________________");
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        await mongoServer.stop();
    }
};

run();
