const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,   // Cloudinary public_id (must be present)
    unique: true
  },
  url: {
    type: String,
    required: true    // Cloudinary secure URL
  },
  originalName: {
    type: String,
    required: true    // Original name of the file uploaded by user
  },
  customName: {
    type: String,
    required: false
  },
  resourceType: {     // to identify images with pdf,docs 
    type: String,
    enum: ["image", "raw" , "auto"],  // Cloudinary resource type
    default: "raw"
  },
  fileSize: {
    type: Number,
    required: false   // File size in bytes
  },
  mimeType: {
    type: String,
    required: false   // MIME type (e.g., application/pdf, image/jpeg)
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now // Auto-set upload date
  }
});

documentSchema.index({ customName: 1 });

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;