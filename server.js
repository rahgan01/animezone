require("dotenv").config();
const dns = require("dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const MongoStore = require('connect-mongo').default;

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

app.use(express.urlencoded({ extended: true }));

// Serve static files (Home.css, script.js, images, etc.)
app.use(express.static(path.join(__dirname)));

// ✅ Serve homepage at "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Home.html")); // <-- change if your file name is different
});

app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false });
  }
  return res.json({ ok: true, user: req.session.user });
});

// Connect MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB Atlas!"))
  .catch((err) => console.error("Mongo connection error:", err));

// Schema

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // (hash later)
});

const User = mongoose.model("User", userSchema);

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  malId: { type: Number, required: true },
  title: { type: String, required: true },
  image: { type: String, required: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

favoriteSchema.index({ userId: 1, malId: 1 }, { unique: true });

const Favorite = mongoose.model("Favorite", favoriteSchema);

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ ok: false, message: "Not logged in" });
  next();
}

app.get("/api/my-list", requireLogin, async (req, res) => {
  const items = await Favorite.find({ userId: req.session.user.id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ ok: true, items });
});

app.post("/api/my-list", requireLogin, async (req, res) => {
  try {
    const { malId, title, image, url } = req.body;
    if (!malId || !title || !image || !url) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const doc = await Favorite.create({
      userId: req.session.user.id,
      malId,
      title,
      image,
      url,
    });

    res.json({ ok: true, item: doc });
  } catch (e) {
    if (e.code === 11000) return res.json({ ok: true, already: true });
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/my-list/:malId", requireLogin, async (req, res) => {
  const malId = Number(req.params.malId);
  await Favorite.deleteOne({ userId: req.session.user.id, malId });
  res.json({ ok: true });
});


// Register
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password required." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const saltRounds = 12; // good default
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await User.create({ username, email, password: hashedPassword });

    res.json({ ok: true, message: "Account created!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Wrong email or password." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Wrong email or password." });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    return res.json({
      ok: true,
      message: "Logged in!",
      username: user.username,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);