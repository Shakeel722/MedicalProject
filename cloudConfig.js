const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const resource_type = file.mimetype.startsWith("image/") ? "image" : "raw";
    return {
      folder: "medicalDocuments",
      resource_type: resource_type,
      public_id: Date.now() + "-" + file.originalname,
    };
  },
});

module.exports = { cloudinary, storage };
