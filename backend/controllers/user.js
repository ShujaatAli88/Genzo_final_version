const stripe = require("stripe")("sk_test_...");
const express = require("express");
require("dotenv").config();
const app = express();
const router = express.Router();
const userService = require("../services/user");
const checkTrialPeriod = require("../middleware/trialPeriodCheckMiddleware");
const { protect } = require("../middleware/authMiddleware");
const checkSubscriptionPeriod = require("../middleware/subscriptionCheckMiddleware");
const path = require("path");

app.use(express.static(path.join(__dirname, "../Frontend")));
// const filename = path.dirname("../Frontend")

router.post("/register", async (req, res) => {
  const body = req.body;
  try {
    const user = await userService.registerUser(body);
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
  // const user = userService.registerUser(body)
  // res.send(user)
});

router.post("/verify-code", protect, async (req, res) => {
  const body = req.body;
  try {
    const user = await userService.verifyCode(body);
    res.status(200).json(user);
  } catch (err) {
    // console.log(err.message)
    res.status(500).json({ message: err.message });
  }
});

// I will come late to correct it
router.post("/resend-code", protect, async (req, res) => {
  const body = req.body;
  try {
    const user = await userService.resendVerificationCode(body);
    res
      .status(200)
      .json({ message: "Verification code resent successfully", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// checkTrialPeriod,
router.post(
  "/login",
  checkTrialPeriod,
  checkSubscriptionPeriod,
  async (req, res) => {
    const body = req.body;
    try {
      const user = await userService.loginUser(body);
      // console.log(user)
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.patch("/activate-trial", protect, checkTrialPeriod, async (req, res) => {
  const body = req.body;
  try {
    const user = await userService.activateTrialPeriod(body);
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/payment-checkout", protect, async (req, res) => {
  const body = req.body;
  // console.log(body)
  try {
    const session = await userService.checkoutSession(body);
    res.status(200).json({ message: "Subscription successful", session });
  } catch (err) {
    // res.status(500).json({ message: err.message })
    console.error(err.message);
    res
      .status(500)
      .json({ error: "An error occurred while creating the subscription." });
  }
});

// Web socket for stripe
// router.post("/stripe-webhook", protect, express.raw({ type: "application/json" }), async (req, res) => {
//     const sig = req.headers["stripe-signature"]
// })

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_KEY;

// Webhook for the stripe events
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    const result = userService.stripeEventsHandler(event);

    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);

// Test api

router.get("/cancel", (req, res) => {
  res
    .status(200)
    .sendFile(path.join(__dirname, "../../Frontend", "subscription.html"));
  // res.status(200).sendFile(path.resolve(__dirname, "../Frontend", "subError.html"))
});

router.get("/", (req, res) => {
  const result = userService.getAllUsers();
  res.status(200).json(result);
});

// Changed 'push' to 'get' for testing
router.get("/success/:email/:priceId", async (req, res) => {
  try {
    const body = req.params;
    const subscription = await userService.createSubscription(body);
    console.log(req.params.email);

    // const electronAppUrl = `myapp://success?email=${body.email}&priceId=${body.priceId}`;
    const electronAppUrl = `myapp://success`;

    // Redirect the user to the custom URL scheme
    res.redirect(electronAppUrl);
    res
      .status(200)
      .sendFile(path.join(__dirname, "../../Frontend", "dashboard.html"));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/subscription", (req, res) => {
  res
    .status(200)
    .sendFile(path.resolve(__dirname, "../../Frontend", "subscription.html"));
});

router.get("/style", (req, res) => {
  res
    .status(200)
    .sendFile(path.resolve(__dirname, "../../Frontend", "style.css"));
});

router.get("/login", (req, res) => {
  res
    .status(200)
    .sendFile(path.resolve(__dirname, "../../Frontend", "login.html"));
});

// res.setHeader('Content-Type', 'application/javascript')
router.get("/script", (req, res) => {
  res
    .status(200)
    .setHeader("Content-Type", "application/javascript")
    .sendFile(path.resolve(__dirname, "../../Frontend", "renderer.js"));
});

// app.post('/create-subscription', async (req, res) => {
//     try {
//         const { paymentMethod, name, email, priceId } = req.body;

//         const customer = await stripe.customers.create({
//             name,
//             email,
//             payment_method: paymentMethod,
//             invoice_settings: {
//                 default_payment_method: paymentMethod,
//             },
//         });

//         const subscription = await stripe.subscriptions.create({
//             customer: customer.id,
//             items: [{ price: priceId }],
//             payment_settings: {
//                 payment_method_options: {
//                     card: {
//                         request_three_d_secure: 'any',
//                     },
//                 },
//                 payment_method_types: ['card'],
//                 save_default_payment_method: 'on_subscription',
//             },
//             expand: ['latest_invoice.payment_intent'],
//         });

//         res.json({
//             clientSecret: subscription.latest_invoice.payment_intent.client_secret,
//             subscriptionId: subscription.id,
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'An error occurred while creating the subscription.' });
//     }
// });

module.exports = router;
