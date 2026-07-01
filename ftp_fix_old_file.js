const { Client } = require("basic-ftp");
require("dotenv").config({ path: ".env" });

async function run() {
    const client = new Client();
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: process.env.FTP_SECURE === "true"
        });
        const filename = "doc_1782905542382_69uzan_sod-selfie.jpg";
        console.log("Moving file...");
        await client.rename(`/public_html/hrms/${filename}`, `/${filename}`);
        console.log("Moved successfully!");
    } catch(e) {
        console.error(e);
    }
    client.close();
}
run();
