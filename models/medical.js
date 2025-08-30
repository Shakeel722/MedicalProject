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
    enum: ["image", "raw"],  // Cloudinary resource type
    default: "raw"
  },

  uploadedAt: { 
    type: Date, 
    default: Date.now // Auto-set upload date
  }
});

documentSchema.index({ customName: 1 });

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
