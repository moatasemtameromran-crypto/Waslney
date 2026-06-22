import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Serve the built admin-panel (single-service deploy) ──
// PUBLIC_DIR points at the frontend's built files (vite dist/public).
const PUBLIC_DIR = process.env["PUBLIC_DIR"] || path.resolve(process.cwd(), "public");
app.use(express.static(PUBLIC_DIR));

// SPA fallback: any non-API route serves index.html (client-side routing).
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), (err) => {
    if (err) next();
  });
});

export default app;
