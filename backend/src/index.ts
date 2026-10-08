import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import preferenceRoutes from "./routes/preferences";
import jobRoutes from "./routes/jobs";
import adminRoutes from "./routes/admin";
import sourcesRoutes from "./routes/sources";
import voiceRoutes from "./routes/voice";
import notificationsRoutes from "./routes/notifications";
import { runDailyDigest } from "./services/digestService";

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
app.use("/api/notifications", notificationsRoutes);


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

    // ── Daily Digest Scheduler ───────────────────────────────────────────
    // Runs the digest check every hour. The digestService itself is
    // idempotent (20h cooldown per user), so frequent checks are safe.
    // This way we don't need a separate cron dependency.
    const DIGEST_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    setInterval(() => {
      runDailyDigest().catch((err) =>
        console.error("[DigestScheduler] Unhandled error:", err),
      );
    }, DIGEST_INTERVAL_MS);

    console.log("[DigestScheduler] Daily digest scheduler started (runs every hour).");
  });
}

export default app;
export { app };