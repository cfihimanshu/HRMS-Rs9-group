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
        const list = await client.list();
        const files = list.filter(i => i.name.endsWith('.jpg')).sort((a,b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
        console.log("Recent JPGs:", files.slice(0, 3).map(i => i.name));
    } catch(e) {
        console.error(e);
    }
    client.close();
}
run();
