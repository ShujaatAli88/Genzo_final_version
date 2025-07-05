const userSchema = require("../models/users.model.js");
const subsciptionSchema = require("../models/subscriptionDetail.model.js");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const Stripe = require("stripe");
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const sendgrid = require("@sendgrid/mail");
const dotenv = require("dotenv");

dotenv.config();

// function to generate the verification code
function generateVerificationCode() {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

// Method to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "20m",
  });
};

// function to send the verification code to the user's email
async function sendVerificationCode(email, code) {
  // Code for sending email using sendgrid
  // sendgrid.setApiKey(process.env.API_KEY);
  // const msg = {
  //     to: email,
  //     from: {
  //         name: 'Your Service',
  //         email: process.env.USER_EMAIL
  //     },
  //     subject: 'Your Verification Code',
  //     text: `Your verification code is: ${code}`,
  //     html: `<strong>Your verification code is: ${code}</strong>`
  // }
  // sendgrid.send(msg).
  //     then(res => console.log('Email sent successfully')).
  //     catch(err => console.log(err.message))

  let transporter = nodemailer.createTransport({
    // service: 'gmail',
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.USER_EMAIL,
      pass: process.env.PASSWORD_FOR_APP,
    },
  });

  let info = await transporter.sendMail({
    from: `"Your Service" <${process.env.USER_EMAIL}>`,
    to: email,
    subject: "Your Validation Code",
    text: `Dear Customer,
               Thank you for using the Genzō program!
               Your validation code is: ${code}
               This is for a 7-day test phase of the program.
               If you have any questions or need further assistance, feel free to contact our support team.
               Best regards,
               Mitsuki SARL-S
               info@mitsukigroup.com`,
  });

  console.log("Message sent: %s", info.messageId);
}

async function sendCodePasswordReset(email, code) {
  let transporter = nodemailer.createTransport({
    // service: 'gmail',
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.USER_EMAIL,
      pass: process.env.PASSWORD_FOR_APP,
    },
  });

  let info = await transporter.sendMail({
    from: `"Your Service" <${process.env.USER_EMAIL}>`,
    to: email,
    subject: "Your Password Reset Code",
    text: `Hi,
            We received a request to reset your password for your account.
            Your password reset code is:
            ${code}
            This code will expire in 10 minutes. Please enter it in the app to proceed with resetting your password.
            If you didn’t request a password reset, you can safely ignore this email.
            Best regards,
            Mitsuki SARL-S
            info@mitsukigroup.com`,
  });

  console.log("Message sent: %s", info.messageId);
}

// regex to check for the correct email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Function to register a new user
async function registerUser(body) {
  const { firstName, lastName, email, password } = body;

  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
    // console.log("Invalid email format")
  }

  const emailExist = await userSchema.findOne({ email });
  if (emailExist) {
    throw new Error("Email already exists");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userSchema.find({}).sort({ _id: -1 }).limit(1);
  const id =
    user.length === 0
      ? "00001"
      : ("00000" + String(parseInt(user[0]._id) + 1)).slice(-4);

  const verificationCode = generateVerificationCode();
  // trialStartDate: new Date()
  const newUser = new userSchema({
    _id: id,
    firstName,
    lastName,
    email,
    password: hashedPassword,
    verificationCode,
  });

  await newUser.save();

  await sendVerificationCode(email, verificationCode);
  console.log(newUser);
  // const userLoggedIn = await loginUser({ email, password })
  const token = generateToken(newUser._id);

  return {
    token,
    email,
    firstName,
    message: "User registered successfully",
  };
}

// function to varify the code send to user login
async function verifyCode(body) {
  const { email, code } = body;
  console.log(email);
  console.log(code);
  const user = await userSchema.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.verificationCode !== code) {
    throw new Error("Invalid verification code");
  }

  if (user.codeUsed) {
    throw new Error("Code already used");
  }

  // Mark the code as used
  user.codeUsed = true;
  user.trialStartDate = new Date();
  user.isTrialActive = true;

  // Start the trial period after successful verification
  // if (!user.trialStartDate) {
  // }

  await user.save();

  // Log the user in (you might want to generate a session or token here)
  const token = generateToken(user._id);

  return {
    _id: user._id,
    email: user.email,
    token,
    message: "User verified successfully",
  };
  // return user; // Return user or token
}

// Method to resend verification
async function resendVerificationCode(body) {
  const { email } = body;

  const user = await userSchema.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  const newVerificationCode = generateVerificationCode();
  user.verificationCode = newVerificationCode;
  user.codeUsed = false; // Reset the codeUsed flag
  await user.save();

  await sendVerificationCode(email, newVerificationCode);

  return { message: "Verification code resent" };
}

// Function for user login
async function loginUser(body) {
  const { email, password } = body;

  const user = await userSchema.findOne({ email });

  if (!user) {
    throw new Error("User Not found. Please register an account.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Incorrect password");
  }

  // Generate a token
  const token = generateToken(user._id);

  if (!user.codeUsed) {
    const newVerificationCode = generateVerificationCode();
    user.verificationCode = newVerificationCode;
    user.codeUsed = false; // Reset the codeUsed flag
    await user.save();

    await sendVerificationCode(email, newVerificationCode);

    return {
      message: "Login successful, Verification code resent",
      email: user.email,
      userId: user._id,
      isVerified: user.codeUsed,
      token,
      firstName: user.firstName,
    };
  }

  const subscription = await subsciptionSchema
    .findOne({ userId: user._id })
    .populate("userId");
  console.log(subscription, "Subscription");
  if (!subscription) {
    return {
      _id: user._id,
      email: user.email,
      isVerified: user.codeUsed,
      trial: user.isTrialActive,
      token,
      firstName: user.firstName,
      // subStatus: subscription.subscriptionStatus,
      message: "Login successful",
    };
  } else if (subscription) {
    return {
      _id: user._id,
      email: user.email,
      isVerified: user.codeUsed,
      trial: user.isTrialActive,
      token,
      firstName: user.firstName,
      subStatus: subscription.subscriptionStatus,
      message: "Login successful",
    };
  }
}

// Function to activate the trial period
async function activateTrialPeriod(body) {
  const { email } = body;
  const user = await userSchema.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }
  if (!user.codeUsed) {
    throw new Error("Verification code not used");
  }
  if (user.isTrialActive) {
    throw new Error("Trial period already activated");
  }

  user.trialStartDate = new Date();
  user.isTrialActive = true;
  await user.save();

  return { message: "Trial period activated" };
}

// Function to handle the stripe events from the webhook
async function stripeEventsHandler(event) {
  switch (event.type) {
    case "charge.captured":
      const chargeCaptured = event.data.object;
      // Then define and call a function to handle the event charge.captured
      break;
    case "charge.expired":
      const chargeExpired = event.data.object;
      // Then define and call a function to handle the event charge.expired
      break;
    case "charge.failed":
      const chargeFailed = event.data.object;
      // Then define and call a function to handle the event charge.failed
      break;
    case "charge.pending":
      const chargePending = event.data.object;
      // Then define and call a function to handle the event charge.pending
      break;
    case "charge.refunded":
      const chargeRefunded = event.data.object;
      // Then define and call a function to handle the event charge.refunded
      break;
    case "charge.succeeded":
      const chargeSucceeded = event.data.object;
      // Then define and call a function to handle the event charge.succeeded
      break;
    case "checkout.session.async_payment_failed":
      const checkoutSessionAsyncPaymentFailed = event.data.object;
      // Then define and call a function to handle the event checkout.session.async_payment_failed
      break;
    case "checkout.session.async_payment_succeeded":
      const checkoutSessionAsyncPaymentSucceeded = event.data.object;
      // Then define and call a function to handle the event checkout.session.async_payment_succeeded
      break;
    case "checkout.session.completed":
      const checkoutSessionCompleted = event.data.object;
      // Then define and call a function to handle the event checkout.session.completed
      break;
    case "checkout.session.expired":
      const checkoutSessionExpired = event.data.object;
      // Then define and call a function to handle the event checkout.session.expired
      break;
    case "customer.created":
      const customerCreated = event.data.object;
      // Then define and call a function to handle the event customer.created
      break;
    case "customer.source.expiring":
      const customerSourceExpiring = event.data.object;
      // Then define and call a function to handle the event customer.source.expiring
      break;
    case "customer.subscription.created":
      const customerSubscriptionCreated = event.data.object;
      // Then define and call a function to handle the event customer.subscription.created
      break;
    case "customer.subscription.deleted":
      const customerSubscriptionDeleted = event.data.object;
      // Then define and call a function to handle the event customer.subscription.deleted
      break;
    case "customer.subscription.paused":
      const customerSubscriptionPaused = event.data.object;
      // Then define and call a function to handle the event customer.subscription.paused
      break;
    case "customer.subscription.pending_update_applied":
      const customerSubscriptionPendingUpdateApplied = event.data.object;
      // Then define and call a function to handle the event customer.subscription.pending_update_applied
      break;
    case "customer.subscription.pending_update_expired":
      const customerSubscriptionPendingUpdateExpired = event.data.object;
      // Then define and call a function to handle the event customer.subscription.pending_update_expired
      break;
    case "customer.subscription.resumed":
      const customerSubscriptionResumed = event.data.object;
      // Then define and call a function to handle the event customer.subscription.resumed
      break;
    case "customer.subscription.updated":
      const customerSubscriptionUpdated = event.data.object;
      // Then define and call a function to handle the event customer.subscription.updated
      break;
    case "invoice.created":
      const invoiceCreated = event.data.object;
      // Then define and call a function to handle the event invoice.created
      break;
    case "invoice.overdue":
      const invoiceOverdue = event.data.object;
      // Then define and call a function to handle the event invoice.overdue
      break;
    case "invoice.paid":
      const invoicePaid = event.data.object;
      // Then define and call a function to handle the event invoice.paid
      break;
    case "invoice.payment_action_required":
      const invoicePaymentActionRequired = event.data.object;
      // Then define and call a function to handle the event invoice.payment_action_required
      break;
    case "invoice.payment_failed":
      const invoicePaymentFailed = event.data.object;
      // Then define and call a function to handle the event invoice.payment_failed
      break;
    case "invoice.payment_succeeded":
      const invoicePaymentSucceeded = event.data.object;
      // Then define and call a function to handle the event invoice.payment_succeeded
      break;
    case "invoice.sent":
      const invoiceSent = event.data.object;
      // Then define and call a function to handle the event invoice.sent
      break;
    case "invoice.will_be_due":
      const invoiceWillBeDue = event.data.object;
      // Then define and call a function to handle the event invoice.will_be_due
      break;
    case "payment_link.created":
      const paymentLinkCreated = event.data.object;
      // Then define and call a function to handle the event payment_link.created
      break;
    case "payment_method.updated":
      const paymentMethodUpdated = event.data.object;
      // Then define and call a function to handle the event payment_method.updated
      break;
    case "plan.updated":
      const planUpdated = event.data.object;
      // Then define and call a function to handle the event plan.updated
      break;
    case "price.updated":
      const priceUpdated = event.data.object;
      // Then define and call a function to handle the event price.updated
      break;
    case "product.created":
      const productCreated = event.data.object;
      // Then define and call a function to handle the event product.created
      break;
    case "product.updated":
      const productUpdated = event.data.object;
      // Then define and call a function to handle the event product.updated
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
}

// Function to create a subscription detail for the user in database
async function createSubscription(body) {
  const { email, priceId } = body;
  const user = await userSchema.findOne({ email });
  console.log(user, user._id, "mango");
  if (!user) {
    throw new Error("User Not found. Please register an account.");
  }
  const alreadySub = await subsciptionSchema.findOne({ userId: user._id });
  console.log("alreadySub: ", alreadySub);
  if (alreadySub) {
    if (alreadySub.subscriptionStatus) {
      throw new Error("You have already subscribed");
    } else {
      // prod_SJNqOL2NisYjZt

      // price_1PuHu3GQqr36Qs460fS9Pvc0
      if (priceId == "price_1ROl4fGQqr36Qs46chnr6uQt") {
        alreadySub.subscriptionStatus = true;
        alreadySub.purchaseDate = new Date();
        alreadySub.subscriptionType = "Monthly Plan";
        await alreadySub.save();
        return "You have successfully subscribed for Monthly Plan.";

      }

      // price_1ROl4ZGQqr36Qs46wbCh6yIY
      else if (priceId == "price_1ROl4ZGQqr36Qs46wbCh6yIY") {
        alreadySub.subscriptionStatus = true;
        alreadySub.purchaseDate = new Date();
        alreadySub.subscriptionType = "Yearly Plan";
        await alreadySub.save();
        return "You have successfully subscribed for Yearly Plan.";
      }
    }
  }
  // Add the check if user have already subscribed
  const subscription = await subsciptionSchema
    .find({})
    .sort({ _id: -1 })
    .limit(1);
  const id =
    subscription.length === 0
      ? "00001"
      : ("00000" + String(parseInt(subscription[0]._id) + 1)).slice(-4);

  // Monthly Plan
  if (priceId == "price_1ROl4fGQqr36Qs46chnr6uQt") {
    const newSubscription = new subsciptionSchema({
      _id: id,
      userId: user._id,
      purchaseDate: new Date(),
      subscriptionType: "Monthly Plan",
      subscriptionStatus: true,
    });
    await newSubscription.save();
    return "You have successfully subscribed for Monthly Plan.";
  }

  // Yearly Plan
  else if (priceId == "price_1ROl4ZGQqr36Qs46wbCh6yIY") {
    const newSubscription = new subsciptionSchema({
      _id: id,
      userId: user._id,
      purchaseDate: new Date(),
      subscriptionType: "Yearly Plan",
      subscriptionStatus: true,
    });
    await newSubscription.save();
    return "You have successfully subscribed for Yearly Plan.";
  }
}

async function checkoutSession(body) {
  const { priceId, email } = body;
  console.log(typeof priceId, email);
  // console.log("Success and cancel url: ", success_url, cancel_url)
  // console.log(process.env.STRIPE_SECRET_KEY)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `http://localhost:3000/api/success/${email}/${priceId}`,
    cancel_url: `http://localhost:3000/api/cancel`,
    // success_url: `${success_url}`,
    // cancel_url: `${cancel_url}`,
    client_reference_id: email,
  });
  // console.log(session)
  return { url: session.url };
}

// get all the users from the database

async function getAllUsers() {
  const result = await userSchema.find();
  console.log(result);
  return result;
}

// function related to reset password

// Function to send to code to email
async function sendCodePasswordReset(body) {
  const email = body.email

  const emailExists = await userSchema.findOne({ email })

  if (!emailExists) {
    return { message: "User with this email don't exists" }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  emailExists.resetPasswordCode = code
  emailExists.resetCodeExpiry = expiry

  await emailExists.save()

  await sendCodePasswordReset(email, code)

  return {
    userEmail: email,
    message: "A code to set the password is send to your email"
  }
}

// Function to verify the code for resetting the password
async function verifyResetCode(body) {
  const { email, code } = body

  const user = await userSchema.findOne({ email })
  if (!user) {
    return { message: "User with this email don't exists" }
  }

  if (user.resetPasswordCode !== code) {
    return { message: "Invalid code" }
  }

  if (new Date() > user.resetCodeExpiry) {
    return { message: "Code has expired" };
  }

  return {
    message: "Code verified successfully"
  }

}

// Method to updated the password
async function resetPassword(body) {
  const { email, newPassword } = body

  const user = await userSchema.findOne({ email })

  if (!user) {
    return { message: "User with this email don't exists" }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword
  user.resetPasswordCode = null
  user.resetCodeExpiry = null

  await user.save()

  return {
    message: "Password updated successfully"
  }

}

module.exports = {
  registerUser,
  loginUser,
  verifyCode,
  resendVerificationCode,
  activateTrialPeriod,
  checkoutSession,
  createSubscription,
  stripeEventsHandler,
  getAllUsers,
  sendCodePasswordReset,
  verifyResetCode,
  resetPassword
};
