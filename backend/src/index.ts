import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import preferenceRoutes from "./routes/preferences";
import jobRoutes from "./routes/jobs";
import adminRoutes from "./routes/admin";
import sourcesRoutes from "./routes/sources";
import voiceRoutes from "./routes/voice";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/preferences", preferenceRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sources", sourcesRoutes);
app.use("/api/voice", voiceRoutes);


app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Arat Killo backend is running",
    timestamp: new Date().toISOString(),
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
export { app };