if(process.env.NODE_ENV !== "production") {   
  require("dotenv").config();
} 

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const { cloudinary, storage } = require("./cloudConfig");
const multer = require("multer");
const upload = multer({ storage });
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const axios = require("axios");
const Document = require("./models/medical");

const mongodbUrl = "mongodb://127.0.0.1:27017/medicalProject";

mongoose.connect(mongodbUrl).then(() => {
  console.log("Database connected successfully!");
});

// Body parser middleware (IMPORTANT - was missing!)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files (if you have CSS/JS files)
app.use(express.static(path.join(__dirname, "public")));

// Session + Flash
app.use(session({
  secret: "medical-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true }
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Method override
app.use(methodOverride("_method"));

// Home
app.get("/", (req, res) => {
  res.render("index.ejs", { title: "Welcome to the Page" });
});

// Upload form
app.get("/upload", (req, res) => {
  res.render("upload.ejs", { title: "Upload Document" });
});

// Upload route
app.post("/upload", upload.single("document"), async (req, res) => {
  if (!req.file) {
    req.flash("error", "No file uploaded.");
    return res.redirect("/upload");
  }

  try {
    console.log("File info:", req.file); // Debug log
    
    const newDoc = new Document({
      filename: req.file.filename,         // Cloudinary public_id
      originalName: req.file.originalname, // User's filename
      customName: req.body.customName || req.file.originalname, // Use original name if no custom name
      url: req.file.path,                  // Cloudinary secure URL
      resourceType: req.file.mimetype.startsWith("image/") ? "image" : "raw",
      fileSize: req.file.size,             // File size
      mimeType: req.file.mimetype,         // MIME type
      uploadedAt: new Date()
    });

    await newDoc.save();
    req.flash("success", "✅ File uploaded & saved successfully!");
    res.redirect("/documents");

  } catch (err) {
    console.error("Upload error:", err);
    
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      req.flash("error", "❌ A file with this name already exists. Please try again.");
    } else {
      req.flash("error", "❌ Error saving file: " + err.message);
    }
    res.redirect("/upload");
  }
});

// View documents
app.get("/documents", async (req, res) => {
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

    res.render("documents.ejs", {
      title: "All Uploaded Documents",
      documents,
      searchQuery
    });

  } catch (err) {
    console.error("Documents fetch error:", err);
    req.flash("error", "❌ Failed to load documents.");
    res.redirect("/");
  }
});

// Delete document
app.delete("/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) {
      req.flash("error", "❌ Document not found.");
      return res.redirect("/documents");
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(doc.filename, { 
      resource_type: doc.resourceType 
    });
    
    // Delete from database
    await Document.findByIdAndDelete(id);

    req.flash("success", "🗑️ Document deleted successfully!");
    res.redirect("/documents");

  } catch (err) {
    console.error("Delete error:", err);
    req.flash("error", "❌ Error deleting document: " + err.message);
    res.redirect("/documents");
  }
});

// Download route for documents
app.get("/documents/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) {
      req.flash("error", "❌ Document not found.");
      return res.redirect("/documents");
    }

    // Stream file from Cloudinary
    const response = await axios({
      url: doc.url,
      method: "GET",
      responseType: "stream"
    });

    // Set appropriate headers
    res.setHeader("Content-Disposition", `attachment; filename="${doc.originalName}"`);
    
    // Set content type based on file type
    if (doc.originalName.toLowerCase().endsWith('.pdf')) {
      res.setHeader("Content-Type", "application/pdf");
    } else if (doc.resourceType === "image") {
      res.setHeader("Content-Type", response.headers['content-type'] || "image/jpeg");
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
    }

    response.data.pipe(res);

  } catch (err) {
    console.error("Download error:", err);
    req.flash("error", "❌ Error downloading document: " + err.message);
    res.redirect("/documents");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash("error", "❌ Something went wrong!");
  res.redirect("/");
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("error", { 
    title: "Page Not Found", 
    message: "The page you're looking for doesn't exist." 
  });
});

// Start server
app.listen(8080, () => {
  console.log("Server is running on port 8080");
});