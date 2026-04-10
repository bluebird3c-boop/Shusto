import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Revenue Split Config
  const REVENUE_SPLIT = {
    doctor: 0.70,
    pharmacy: 0.95,
    hospital: 0.80,
    lab: 0.85,
    physio: 0.75,
    ambulance: 0.90
  };

  // SSLCommerz Payment Initiation
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
