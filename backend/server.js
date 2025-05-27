const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const userRouter = require("./controllers/user");
const imageRouter = require("./controllers/imageModel");
const path = require("path");

const port = 3000 || process.env.PORT;

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

app.use(
  cors({
    origin: ["*", "file://", "app://"], // Allow all origins for local testing
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  })
);

app.use(express.static(path.join(__dirname, "../Frontend")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Api call for the user registration and login
app.use("/api", userRouter);
app.use("/imageModel", imageRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
