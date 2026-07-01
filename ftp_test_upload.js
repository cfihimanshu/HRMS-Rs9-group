const { Client } = require("basic-ftp");
require("dotenv").config({ path: ".env" });
const fs = require("fs");
const { Readable } = require("stream");

async function run() {
    const client = new Client();
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: process.env.FTP_SECURE === "true"
        });
        
        const ftpDir = process.env.FTP_DIR || "/public_html/hrms";
        console.log("ftpDir:", ftpDir);
        
        await client.ensureDir(ftpDir);
        console.log("ensureDir done. PWD:", await client.pwd());
        
        const buffer = Buffer.from("Hello World", "utf8");
        const stream = Readable.from(buffer);
        const uniqueFileName = "test_upload_123.txt";
        
        await client.uploadFrom(stream, uniqueFileName);
        console.log("Upload done.");
        
        const list = await client.list();
        console.log("List:", list.filter(i => i.name.includes("test")).map(i => i.name));
    } catch(e) {
        console.error(e);
    }
    client.close();
}
run();
