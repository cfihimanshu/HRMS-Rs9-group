import fs from "fs";

const content = fs.readFileSync("components/dashboard/RecruitmentPanels.tsx", "utf-8");
const lines = content.split("\n");

const query = process.argv[2] || "deactivate";
const results = [];

lines.forEach((line, idx) => {
  if (line.toLowerCase().includes(query.toLowerCase())) {
    results.push({ lineNum: idx + 1, content: line.trim() });
  }
});

console.log(`Found ${results.length} matches for "${query}":`);
results.slice(0, 100).forEach(r => {
  console.log(`${r.lineNum}: ${r.content}`);
});
