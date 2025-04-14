import express, { Request, Response, NextFunction } from "express";
import ViteExpress from "vite-express";

const app = express();

// Middleware
app.use(express.json());

// Type for API response
interface ApiResponse {
  message: string;
}

// API routes
app.get("/api/hello", (req: Request, res: Response<ApiResponse>) => {
  res.json({ message: "Hello from Express + TypeScript!" });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!" });
});

// Start the server
const port = process.env.PORT || 3000;
ViteExpress.listen(app, port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
