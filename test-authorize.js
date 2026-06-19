const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  console.log("Connected to MongoDB");
  
  const email = 'neeraj@gmail.com';
  const password = 'neeraj123';
  
  try {
    const user = await mongoose.connection.db.collection('users').findOne({ email, status: { $in: ["active", "probation"] } });
    if (!user) {
      console.log("User not found!");
      mongoose.disconnect();
      return;
    }
    console.log("Found user:", user);
    
    let isValid = false;
    if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = (password === user.password);
    }
    console.log("Password valid:", isValid);
  } catch (err) {
    console.error("Error:", err);
  }

  mongoose.disconnect();
}).catch(console.error);
