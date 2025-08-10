import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDB } from "./db";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/userRoute";
import quizRoutes from "./routes/quizRoutes";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());


// api
app.use("/api/auth", authRoutes);
app.use('/api/quiz', quizRoutes);

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI!);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
