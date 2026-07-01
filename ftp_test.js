const ftp = require("basic-ftp");
require("dotenv").config();

async function testFTP() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false
        });
        console.log("Connected to FTP!");
        
        // List directory contents
        const list = await client.list();
        console.log("Directory contents:", list.map(i => i.name));
        
    } catch(err) {
        console.error(err);
    }
    client.close();
}

testFTP();
