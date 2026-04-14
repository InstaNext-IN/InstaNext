import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mock OTP Verification
  app.post("/api/verify-otp", (req, res) => {
    const { phone, otp } = req.body;
    if (otp === "123456") {
      res.json({ success: true, message: "Phone verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  });

  // Real-time Chat with Socket.io
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("send_message", (data) => {
      // Chat Guard: Block links and warn about personal data
      const linkRegex = /(https?:\/\/[^\s]+)/g;
      const phoneRegex = /(\+?\d{10,12})/g;
      
      let filteredText = data.text;
      if (linkRegex.test(filteredText)) {
        filteredText = filteredText.replace(linkRegex, "[LINK BLOCKED]");
      }

      const containsSensitive = phoneRegex.test(filteredText);

      io.to(data.roomId).emit("receive_message", {
        ...data,
        text: filteredText,
        warning: containsSensitive ? "Warning: Avoid sharing personal contact info." : null,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
