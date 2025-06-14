import express, { type Request, type Response } from "express";
import cors from "cors";
import { userValidation, userValidationSignup } from "./auth";
import { userModel } from "./db";
import jwt from "jsonwebtoken";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

const app = express();
const PORT = 3000;
const pvtKey = "ksimon";
const connection = new Connection("https://api.devnet.solana.com");

app.use(express.json());
app.use(cors());

app.post(
  "/api/v1/signup",
  userValidation,
  userValidationSignup,
  async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const keypair = new Keypair();
    try {
      await userModel.create({
        username,
        password,
        publicKey: keypair.publicKey.toString(),
        privateKey: bs58.encode(keypair.secretKey),
      });
      res.status(200).json({
        message: "User created",
        publicKey: keypair.publicKey.toString(),
      });
    } catch {
      res.status(500).json({ message: "User not created, please try later" });
    }
  },
);

app.post(
  "/api/v1/signin",
  userValidation,
  async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
      const exists = await userModel.findOne({ username, password });
      if (!exists) {
        res
          .status(400)
          .json({ message: "Wrong credentials or user doesn't exist" });
      }
      //@ts-ignore
      const token = jwt.sign({ id: exists._id }, pvtKey);
      res.status(200).json({ message: "Signed in", JWT: token });
    } catch {
      res.status(500).json({ message: "Internal Server Issue" });
    }
  },
);

app.post("/api/v1/txn/sign", async (req: Request, res: Response) => {
  try {
    console.log("Received transaction signing request:", req.body);

    const { message } = req.body;

    if (!message || !message.data) {
      res.status(400).json({ message: "Invalid transaction data" });
    }

    const txBuffer = Buffer.from(message.data);
    const tx = Transaction.from(txBuffer);

    console.log("Transaction fee payer:", tx.feePayer?.toString());

    const allUsers = await userModel.find({}, { username: 1, publicKey: 1 });
    console.log("All users in database:", allUsers);

    const user = await userModel.findOne({
      publicKey: tx.feePayer?.toString(),
    });

    console.log(
      "Found user:",
      user ? { username: user.username, publicKey: user.publicKey } : "None",
    );

    if (!user || !user.privateKey) {
      console.log("User not found or no private key");
      console.log("Looking for publicKey:", tx.feePayer?.toString());
      res.status(404).json({
        message: "User or private key not found",
        debugInfo: {
          lookingFor: tx.feePayer?.toString(),
          availableUsers: allUsers.map((u) => u.publicKey),
        },
      });
    }

    //@ts-ignore
    const secretKey = bs58.decode(user.privateKey);
    const signer = Keypair.fromSecretKey(secretKey);

    tx.sign(signer);

    const sig = await connection.sendRawTransaction(tx.serialize());

    console.log("Transaction sent with signature:", sig);

    res.json({ message: "Transaction signed and sent", signature: sig });
  } catch (err) {
    console.error("Transaction signing error:", err);
    res.status(500).json({
      message: "Internal Server Error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

app.get("/api/v1/txn", (_req: Request, res: Response) => {
  res.json({ message: "Transaction endpoint is working" });
});

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/users", async (_req: Request, res: Response) => {
  try {
    console.log("Fetching all users from database...");
    const users = await userModel.find(
      {},
      { username: 1, publicKey: 1, _id: 0 },
    );
    console.log("Found users:", users);
    res.json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Error fetching users",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/v1/db-test", async (_req: Request, res: Response) => {
  try {
    console.log("Testing database connection...");
    const count = await userModel.countDocuments();
    console.log("Database connection successful, user count:", count);
    res.json({
      message: "Database connection successful",
      userCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({
      message: "Database connection failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});
