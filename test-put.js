const http = require("http");

const data = JSON.stringify({
  id: 1, // I will use a dummy ID or find a valid one
  workflowStage: "billing",
  workflowJson: "{}",
  billNo: "26272133",
  billDate: "2026-08-30",
  billAmount: 65734.26,
  billInvoiceUrl: "http://example.com/bill.jpg"
});

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/legal-recovery/security",
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
    // Add auth cookie? If we don't have auth, it will return 401 instantly.
  }
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
