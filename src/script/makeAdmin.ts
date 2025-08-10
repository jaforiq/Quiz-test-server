// quick script (src/script/makeAdmin.ts)
import "dotenv/config";
import { connectDB } from "../db";
import { User } from "../models/User";

(async () => {
  await connectDB(process.env.MONGODB_URI!);
  await User.updateOne({ email: "admin@gmail.com" }, { $set: { role: "admin", isEmailVerified: true } });
  console.log("Admin set.");
  process.exit(0);
})();
