 // app.js - WITH LOGIN AUTHENTICATION
if (process.env.NODE_ENV !== "production") {   
  require("dotenv").config();
} 

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const Document = require("./models/medical");
const isLoggedIn  = require("./middleware");

// Import Cloudinary with error handling
let cloudinary, upload;
try {
  const { cloudinary: cloudinaryInstance, storage } = require("./cloudConfig");
  const multer = require("multer");
  cloudinary = cloudinaryInstance;
  upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  });
  console.log("✅ Cloudinary configuration loaded successfully");
} catch (error) {
  console.error("❌ Error loading Cloudinary configuration:", error.message);
  process.exit(1);
}

const mongodbUrl = "mongodb://127.0.0.1:27017/medicalProject";
const atlasDbUrl =process.env.ATLAS_DB_URL;

mongoose.connect(atlasDbUrl).then(() => {
  console.log("✅ Database connected successfully!");
}).catch(err => {
  console.error("❌ Database connection failed:", err.message);
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

//store setup
const store = MongoStore.create({
  mongoUrl: atlasDbUrl,
  crypto: {
    secret: process.env.SECRET,
  } ,
  touchAfter:24 * 3600 
});

//session setup
app.use(session({
  store : store ,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true }
}));

store.on("error" , (err)=>{
console.log("MONGO STORE ERROR " , err);
})
//flash
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.usernameError = req.flash("usernameError");
  res.locals.passwordError = req.flash("passwordError");
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.username = req.session.username || null;
  next();
});

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(methodOverride("_method"));

/* ---------------- LOGIN ---------------- */
app.get("/login", (req, res) => {
  res.render("login", { messages: {} });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.APP_USERNAME) {
    req.flash("usernameError", "Invalid username");
    return res.redirect("/login");
  }

  if (password !== process.env.APP_PASSWORD) {
    req.flash("passwordError", "Invalid password");
    return res.redirect("/login");
  }

  // ✅ Login successful
  req.session.isAuthenticated = true;
  req.session.username = username;
  req.flash("success", `Welcome back, ${username}!`);
  res.redirect("/");
});

app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      req.flash("error", "Error logging out");
      return res.redirect("/");
    }
    res.redirect("/login");
  });
});

/* ---------------- PROTECTED ROUTES ---------------- */

// Home
app.get("/", isLoggedIn, (req, res) => {
  res.render("index.ejs", { title: `Welcome to Medical Page Mr. ${req.session.username}` });
});

// Upload form
app.get("/upload", isLoggedIn, (req, res) => {
  res.render("upload.ejs", { title: "Upload Document" });
});

// Upload document
app.post("/upload", isLoggedIn, upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      req.flash("error", "No file uploaded. Please select a file.");
      return res.redirect("/upload");
    }

    if (!req.file.filename || !req.file.path) {
      req.flash("error", "File upload failed. Please check Cloudinary configuration.");
      return res.redirect("/upload");
    }

    const newDoc = new Document({
      filename: req.file.filename,
      originalName: req.file.originalname,
      customName: req.body.customName?.trim() || req.file.originalname,
      url: req.file.path,
      resourceType: "auto",
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date()
    });

    const validationError = newDoc.validateSync();
    if (validationError) {
      req.flash("error", "Validation failed: " + Object.keys(validationError.errors).join(", "));
      return res.redirect("/upload");
    }

    await newDoc.save();
    req.flash("success", "✅ File uploaded & saved successfully!");
    res.redirect("/documents");

  } catch (err) {
    console.error("❌ Upload error:", err);
    req.flash("error", "❌ Error saving file: " + err.message);
    res.redirect("/upload");
  }
});

// View documents
app.get("/documents", isLoggedIn, async (req, res) => {
  try {
    const searchQuery = req.query.q || "";
    let documents;

    if (searchQuery) {
      documents = await Document.find({
        $or: [
          { customName: { $regex: searchQuery, $options: "i" } },
          { originalName: { $regex: searchQuery, $options: "i" } }
        ]
      }).sort({ uploadedAt: -1 });
    } else {
      documents = await Document.find().sort({ uploadedAt: -1 });
    }

    res.render("documents.ejs", { title: "All Uploaded Documents", documents, searchQuery });

  } catch (err) {
    console.error("Documents fetch error:", err);
    req.flash("error", "❌ Failed to load documents.");
    res.redirect("/");
  }
});

// Delete document
app.delete("/documents/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) {
      req.flash("error", "❌ Document not found.");
      return res.redirect("/documents");
    }

    try {
      await cloudinary.uploader.destroy(doc.filename, { resource_type: doc.resourceType || "auto" });
    } catch (cloudinaryError) {
      console.error("❌ Cloudinary delete failed:", cloudinaryError.message);
    }
    
    await Document.findByIdAndDelete(id);
    req.flash("success", "🗑️ Document deleted successfully!");
    res.redirect("/documents");

  } catch (err) {
    console.error("❌ Delete error:", err);
    req.flash("error", "❌ Error deleting document: " + err.message);
    res.redirect("/documents");
  }
});

// Download document
app.get("/documents/:id/download", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) {
      req.flash("error", "Document not found.");
      return res.redirect("/documents");
    }
    res.redirect(doc.url);
  } catch (err) {
    console.error("Download error:", err);
    req.flash("error", "Error downloading document.");
    res.redirect("/documents");
  }
});

/* ---------------- ERROR HANDLING ---------------- */
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err.stack);
  req.flash("error", "❌ Something went wrong!");
  res.redirect("/");
});

app.use((req, res) => {
  res.status(404).render("error", { 
    title: "Page Not Found", 
    message: "The page you're looking for doesn't exist." 
  });
});

/* ---------------- START SERVER ---------------- */
app.listen(8080, () => {
  console.log("🚀 Server is running on port 8080");
});
