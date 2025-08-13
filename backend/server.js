import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = 5000;

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(passport.initialize());

// Ensure CORS headers on all responses (including errors)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Add debugging to check if env vars are loaded
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "Set" : "Missing"
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Missing"
);
console.log("NODE_ENV:", process.env.NODE_ENV);

// MongoDB connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// User Schema
const UserSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  username: String,
  email: String,
  profilePicture: String,
  password: { type: String, select: false },
});
const User = mongoose.model("User", UserSchema);

// Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = new User({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
            profilePicture: profile.photos[0].value,
          });
          await user.save();
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Google login route
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const payload = {
      id: req.user.id,
      username: req.user.username,
      profilePicture: req.user.profilePicture,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    // Always redirect to local frontend main page after login
    res.redirect(`http://localhost:5173/main?token=${token}`);
  }
);

// Token verification route
app.get("/verify-token", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    res.json(user);
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
});

// Register endpoint
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  console.log("Register attempt:", { username, email });
  if (!username || !email || !password) {
    console.log("Missing fields in registration");
    return res.status(400).json({ msg: "All fields required" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("Email already registered:", email);
    return res.status(400).json({ msg: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();
  console.log("Registration successful for:", email);
  res.json({ msg: "Registration successful! Please login." });
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login attempt:", { email });
  if (!email || !password)
    return res.status(400).json({ msg: "All fields required" });

  // Explicitly select password field
  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.password) {
    console.log("Invalid credentials: user not found or no password");
    return res.status(400).json({ msg: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log("Invalid credentials: password mismatch");
    return res.status(400).json({ msg: "Invalid credentials" });
  }

  const payload = {
    id: user._id,
    username: user.username,
    profilePicture: user.profilePicture,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
