 // cloudConfig.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const timestamp = Date.now();
    const filename = file.originalname.replace(/\.[^/.]+$/, "");
    const publicId = `${timestamp}-${filename}`;

    // Decide resource_type based on MIME
    let resourceType = "raw";
    if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    }

    return {
      folder: "medicalDocuments",
      resource_type: resourceType,  // 👈 force correct type
      public_id: publicId,
      allowed_formats: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "txt"],
    };
  },
});

module.exports = { cloudinary, storage };
