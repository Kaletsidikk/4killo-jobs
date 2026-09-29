import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import preferenceRoutes from "./routes/preferences";
import jobRoutes from "./routes/jobs";
import adminRoutes from "./routes/admin";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/preferences", preferenceRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Arat Killo backend is running"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});