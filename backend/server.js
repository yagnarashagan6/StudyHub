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
const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());

// ✅ Initialize passport
app.use(passport.initialize());

// Frontend + backend URLs
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const CALLBACK_URL = process.env.BACKEND_URL
  ? `${process.env.BACKEND_URL}/auth/google/callback`
  : "https://studyhub-d1bo.onrender.com/auth/google/callback";

// ✅ CORS setup
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  const allowedOrigins = [FRONTEND_URL, "http://localhost:5173"];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Debug env vars
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "Set" : "Missing"
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Missing"
);
console.log("FRONTEND_URL:", FRONTEND_URL);
console.log("CALLBACK_URL:", CALLBACK_URL);

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

// ✅ Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile || !profile.id || !profile.emails || !profile.photos) {
          console.error("Google profile missing fields:", profile);
          return done(new Error("Google profile incomplete"), null);
        }
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
        console.error("GoogleStrategy error:", err.stack || err);
        return done(err, null);
      }
    }
  )
);

// Google login
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      console.log("JWT_SECRET:", JWT_SECRET ? "Set" : "Missing");
      console.log("User from Google:", req.user);
      if (!req.user) {
        console.error("No user returned from Google OAuth");
        return res.status(500).send("Google authentication failed");
      }
      const payload = {
        id: req.user._id, // <-- FIXED: use _id
        username: req.user.username,
        profilePicture: req.user.profilePicture,
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
      const redirectUrl = `${FRONTEND_URL}?token=${token}`;
      res.redirect(redirectUrl);
    } catch (err) {
      console.error("OAuth callback error:", err.stack || err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Verify token
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

// Register
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ msg: "All fields required" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ msg: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();
  res.json({ msg: "Registration successful! Please login." });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ msg: "All fields required" });

  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.password)
    return res.status(400).json({ msg: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

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
