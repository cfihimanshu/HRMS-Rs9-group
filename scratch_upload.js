const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: 'devlnt8uh',
  api_key: '224644769929164',
  api_secret: 'aTQc5Ou_er1d7EvgcJajize-_2s'
});

async function run() {
  const buffer = fs.readFileSync('package.json');
  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "acolyte_hr_documents", resource_type: "auto" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
    console.log("Success:", uploadResult.secure_url);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
