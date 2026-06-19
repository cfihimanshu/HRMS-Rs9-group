const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  console.log("Connected to MongoDB");
  const sodDocs = await mongoose.connection.db.collection('sodreports').find({}).toArray();
  const eodDocs = await mongoose.connection.db.collection('eodreports').find({}).toArray();
  const attDocs = await mongoose.connection.db.collection('attendances').find({}).toArray();
  
  console.log('Total sod:', sodDocs.length);
  console.log('Total eod:', eodDocs.length);
  console.log('Total att:', attDocs.length);
  
  const badSod = sodDocs.filter(d => !d.employee);
  const badEod = eodDocs.filter(d => !d.employee);
  const badAtt = attDocs.filter(d => !d.employee);
  
  console.log('Bad SOD (no employee):', badSod.length);
  console.log('Bad EOD (no employee):', badEod.length);
  console.log('Bad ATT (no employee):', badAtt.length);
  
  const neerajUsers = await mongoose.connection.db.collection('users').find({ name: /neeraj/i }).toArray();
  console.log('Neeraj users:', neerajUsers);
  
  if (neerajUsers.length > 0) {
    const u = neerajUsers[0];
    const profiles = await mongoose.connection.db.collection('employeeprofiles').find({ user: u._id }).toArray();
    console.log('Neeraj employee profiles:', profiles);
    const probations = await mongoose.connection.db.collection('probations').find({ employee: u._id }).toArray();
    console.log('Neeraj probations:', probations);
  }

  mongoose.disconnect();
}).catch(console.error);
