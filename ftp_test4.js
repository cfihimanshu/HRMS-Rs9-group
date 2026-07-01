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
        await client.cd("/public_html/hrms");
        console.log("PWD:", await client.pwd());
        const list = await client.list();
        console.log("List of /public_html/hrms:", list.map(i => i.name));
    } catch(e) {
        console.error(e);
    }
    client.close();
}
run();
