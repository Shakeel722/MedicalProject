🏥 Medical Project

A web application built with Node.js, Express, MongoDB, and EJS to manage and store medical documents securely. The project includes user authentication, cloud storage integration, and a responsive UI.

🚀 Features

🔑 User Authentication (Login & Logout)

📄 Upload & Manage Medical Documents

☁️ Cloud Storage Integration (Cloudinary / Other)

📂 Database Management with MongoDB

🎨 Frontend with EJS Templates

⚡ Session & Flash Messages for better UX

🛡️ Secure Configuration using .env file

🛠️ Tech Stack

Backend: Node.js, Express.js

Database: MongoDB (Mongoose)

Frontend: EJS, CSS

Authentication: express-session, middleware

Cloud Storage: Cloudinary (via cloudConfig.js)

Other Tools: Method-Override, Connect-Flash

📂 Project Structure
MedicalProject/
│-- app.js                # Main server file
│-- cloudConfig.js        # Cloud storage configuration
│-- models/
│   └── medical.js        # Mongoose schema for documents
│-- views/
│   ├── index.ejs         # Homepage
│   ├── documents.ejs     # Document listing
│   ├── login.ejs         # Login page
│   └── error.ejs         # Error page
│-- middleware.js         # Custom authentication middleware
│-- .env                  # Environment variables (not tracked)
│-- .gitignore            # Ignore sensitive files & node_modules
│-- package.json          # Dependencies and scripts
