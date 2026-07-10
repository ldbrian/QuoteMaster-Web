const fs = require("fs");
const manifestPath = "E:/QuoteMaster-Web/chromeextension/gmailcapture/manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.version = "0.2.1";
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("bumped extension version to 0.2.1");
