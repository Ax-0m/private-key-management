import axios from "axios";
import "./App.css";
import { useState } from "react";
import {
  Transaction,
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");

function App() {
  const [amount, setAmount] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const sendSol = async () => {
    if (!amount || !fromAddress || !toAddress) {
      alert("Please fill in all fields");
      return;
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      console.log("Starting transaction...");
      console.log("From:", fromAddress);
      console.log("To:", toAddress);
      console.log("Amount:", amount);

      const fromPubkey = new PublicKey(fromAddress);
      const toPubkey = new PublicKey(toAddress);

      const ix = SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: toPubkey,
        lamports: Number(amount) * LAMPORTS_PER_SOL,
      });

      const tx = new Transaction().add(ix);

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = fromPubkey;

      console.log("Transaction created, fee payer:", tx.feePayer.toString());

      const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      console.log(
        "Sending transaction to backend...",
        JSON.stringify({
          message: {
            data: Array.from(serializedTx),
          },
        }),
      );

      const response = await axios.post(
        "http://localhost:3000/api/v1/txn/sign",
        {
          message: {
            data: Array.from(serializedTx),
          },
        },
      );

      console.log("Transaction response:", response.data);
      alert(`Transaction successful! Signature: ${response.data.signature}`);

      setAmount("");
      setFromAddress("");
      setToAddress("");
    } catch (error) {
      console.error("Transaction failed:", error);

      if (axios.isAxiosError(error)) {
        console.error("Response data:", error.response?.data);
        alert(
          `Transaction failed: ${error.response?.data?.message || error.message}`,
        );
      } else {
        alert(`Transaction failed: ${error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/v1/health");
      console.log("Backend connection test:", response.data);
      alert("Backend is connected!");
    } catch (error) {
      console.error("Backend connection failed:", error);
      alert("Backend connection failed!");
    }
  };

  const getUsers = async () => {
    try {
      console.log("Fetching users from backend...");
      const response = await axios.get("http://localhost:3000/api/v1/users");
      console.log("Backend response:", response.data);

      const users = response.data.users || [];

      if (users.length === 0) {
        alert(
          "No users found in database. Create some users first using the signup endpoint.",
        );
      } else {
        console.table(users);
        alert(
          `Found ${users.length} users:\n\n${users.map((u: any) => `${u.username}: ${u.publicKey}`).join("\n\n")}`,
        );
      }
    } catch (error) {
      console.error("Failed to get users:", error);

      if (axios.isAxiosError(error)) {
        console.error("Error response:", error.response?.data);
        alert(
          `Failed to get users: ${error.response?.data?.message || error.message}`,
        );
      } else {
        alert("Failed to get users: Unknown error");
      }
    }
  };

  const checkBalance = async () => {
    if (!fromAddress) {
      alert("Please enter a From Address first");
      return;
    }

    try {
      const publicKey = new PublicKey(fromAddress);
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      console.log(`Balance for ${fromAddress}: ${solBalance} SOL`);
      alert(
        `Balance: ${solBalance} SOL\n\n${solBalance === 0 ? "Account has no SOL! Get devnet SOL from https://faucet.solana.com/" : "Account has sufficient balance"}`,
      );
    } catch (error) {
      console.error("Failed to check balance:", error);
      alert("Invalid public key or network error");
    }
  };

  const testDatabase = async () => {
    try {
      console.log("Testing database connection...");
      const response = await axios.get("http://localhost:3000/api/v1/db-test");
      console.log("Database test response:", response.data);
      alert(
        `Database connection successful!\nUser count: ${response.data.userCount}`,
      );
    } catch (error) {
      console.error("Database test failed:", error);
      if (axios.isAxiosError(error)) {
        alert(
          `Database test failed: ${error.response?.data?.message || error.message}`,
        );
      } else {
        alert("Database test failed!");
      }
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2>Send SOL Transaction</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Amount (SOL)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="From Address (Your Public Key)"
          value={fromAddress}
          onChange={(e) => setFromAddress(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="To Address (Recipient Public Key)"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "5px" }}
        />
      </div>

      <button
        onClick={sendSol}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Processing..." : "Submit Transaction"}
      </button>

      <button
        onClick={testConnection}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Test Backend Connection
      </button>

      <button
        onClick={getUsers}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
          backgroundColor: "#ffc107",
          color: "black",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Show Available Users
      </button>

      <button
        onClick={checkBalance}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
          backgroundColor: "#17a2b8",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Check From Address Balance
      </button>

      <button
        onClick={testDatabase}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#6f42c1",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Test Database Connection
      </button>
    </div>
  );
}

export default App;
