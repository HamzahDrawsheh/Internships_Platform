import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import profilesRoutes from "./routes/profiles";
import internshipsRoutes from "./routes/internships";
import applicationsRoutes from "./routes/applications";
import { config } from "./config";

const app = express();

app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/profiles", profilesRoutes);
app.use("/internships", internshipsRoutes);
app.use("/applications", applicationsRoutes);

app.use(errorHandler);

export default app;
