import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./User"; 

dotenv.config();

const runMigration = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB.");

    const users = await User.find({});
    console.log(`Checking ${users.length} users...`);

    for (const user of users) {
      if (user.email) {
        user.email = user.email.toLowerCase(); 
        try {
            await user.save();
            console.log(`Fixed: ${user.email}`);
        } catch (err: any) {
            console.log(`Skipped (Duplicate or Error): ${user.email}`);
        }
      }
    }

    console.log("Done!");
    process.exit();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

runMigration();