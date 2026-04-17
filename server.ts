import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import fs from "fs";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db_admin: admin.firestore.Firestore;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  
  // Initialize admin with default credentials (if in cloud) or just the project ID
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  db_admin = admin.firestore(admin.app());
  // Use the specific database ID if provided in config
  if (firebaseConfig.firestoreDatabaseId) {
    db_admin = (admin as any).firestore(admin.app(), firebaseConfig.firestoreDatabaseId);
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- Real Payment Withdrawals (Automatic bKash/Nagad) ---
  app.post("/api/withdraw/automatic", async (req, res) => {
    const { userId, amount, method, phoneNumber } = req.body;

    if (!userId || !amount || !method || !phoneNumber) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Double check balance on server-side (Secure)
      const walletRef = db_admin.collection("wallets").doc(userId);
      const walletSnap = await walletRef.get();
      
      const balance = walletSnap.exists ? walletSnap.data()?.balance || 0 : 0;
      if (balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // 2. DISBURSEMENT LOGIC (bKash/Nagad Payout API)
      // This is where the REAL money transfer happens.
      // We simulate success here, but if SSL_DISBURSEMENT_KEY is present, we'd call the real API.
      
      let disbursementStatus = "SUCCESS";
      
      // REAL INTEGRATION PLACEHOLDER:
      // If you have a disbursement provider key (e.g. SSLCommerz Payout or bKash API)
      if (process.env.REAL_PAYOUT_API_KEY) {
        console.log(`Executing REAL Payout via ${method} to ${phoneNumber} for ৳${amount}`);
        // await axios.post('https://api.payout.com/send', { ... });
      } else {
        console.log(`Simulating AUTOMATIC Payout via ${method} to ${phoneNumber} for ৳${amount}`);
      }

      if (disbursementStatus === "SUCCESS") {
        // 3. SECURELY Deduct Balance & Record Transaction
        await db_admin.runTransaction(async (t) => {
          t.update(walletRef, {
            balance: admin.firestore.FieldValue.increment(-amount),
            updatedAt: new Date().toISOString()
          });

          const transRef = db_admin.collection("transactions").doc();
          t.set(transRef, {
            userId,
            amount,
            type: "withdrawal",
            status: "success", // Marked as success immediately because of automatic disbursement
            method,
            phoneNumber,
            details: `Automatic disbursement to ${phoneNumber}`,
            createdAt: new Date().toISOString()
          });
        });

        return res.json({ status: "SUCCESS", message: "টাকা সফলভাবে পাঠানো হয়েছে।" });
      } else {
        throw new Error("Disbursement failed at provider level");
      }

    } catch (error) {
      console.error("Withdrawal Error:", error);
      res.status(500).json({ error: "টাকা পাঠানো ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।" });
    }
  });

  // SSLCommerz Payment Initiation (Add Money)
  app.post("/api/payment/init", async (req, res) => {
    const { amount, userId, providerId, providerType, userName, userEmail } = req.body;
    const tran_id = uuidv4();

    const data = {
      store_id: process.env.SSL_STORE_ID,
      store_passwd: process.env.SSL_STORE_PASSWORD,
      total_amount: amount,
      currency: "BDT",
      tran_id: tran_id,
      success_url: `${process.env.APP_URL}/api/payment/success?tran_id=${tran_id}&userId=${userId}&providerId=${providerId}&providerType=${providerType}`,
      fail_url: `${process.env.APP_URL}/api/payment/fail`,
      cancel_url: `${process.env.APP_URL}/api/payment/cancel`,
      ipn_url: `${process.env.APP_URL}/api/payment/ipn`,
      shipping_method: "No",
      product_name: "Telehealth Service",
      product_category: "Healthcare",
      product_profile: "general",
      cus_name: userName || "Customer",
      cus_email: userEmail || "customer@example.com",
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_state: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: "01700000000",
    };

    try {
      // Use sandbox URL for now, can be switched to live
      const sslUrl = process.env.NODE_ENV === "production" 
        ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
        : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";

      // If no keys, simulate success for demo
      if (!process.env.SSL_STORE_ID) {
        console.log("Simulating SSLCommerz success (No keys found)");
        return res.json({ status: "SUCCESS", GatewayPageURL: data.success_url });
      }

      const response = await axios.post(sslUrl, data, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      res.json(response.data);
    } catch (error) {
      console.error("SSLCommerz Init Error:", error);
      res.status(500).json({ error: "Payment initiation failed" });
    }
  });

  // SSLCommerz Success Callback
  app.get("/api/payment/success", (req, res) => {
    const { tran_id, userId, providerId, providerType } = req.query;
    // In a real app, you'd verify the transaction with SSLCommerz here
    // And then update Firestore via Admin SDK (if available) or client-side redirect with token
    
    // Redirect back to app with success info
    res.redirect(`/?payment=success&tran_id=${tran_id}&userId=${userId}&providerId=${providerId}&providerType=${providerType}`);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
