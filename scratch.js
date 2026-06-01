const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'devlnt8uh',
  api_key: '224644769929164',
  api_secret: 'aTQc5Ou_er1d7EvgcJajize-_2s'
});
cloudinary.api.ping(function(error, result) {
  console.log(error || result);
});
