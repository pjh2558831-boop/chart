const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const selfPath = path.resolve(__filename);

const ignoredDirs = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  ".venv",
  "venv",
  "__pycache__",
  "coverage",
  ".vercel",
  ".turbo",
]);

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".json",
  ".md",
  ".css",
  ".html",
  ".env",
  ".example",
  ".bat",
  ".cmd",
  ".ps1",
  ".yml",
  ".yaml",
  ".toml",
]);

const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".ico",
  ".gif",
  ".svg",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
]);

function cp(value) {
  return String.fromCodePoint(value);
}

const suspiciousPatterns = [
  cp(0x00ec),
  cp(0x00ed),
  cp(0x00eb),
  cp(0x00ea),
  cp(0x00c3),
  cp(0x00c2),
  cp(0xfffd),
  cp(0xbdf1),
  cp(0xd5ed),
  cp(0xc6d5),
  cp(0x00eb) + cp(0x00ac),
  cp(0x00ec) + cp(0x017e),
  cp(0x00ed) + cp(0x2022),
  cp(0x00ea) + cp(0x00b0),
  cp(0x00ea) + cp(0x00b2),
  cp(0x00ec) + cp(0x201e),
  cp(0x00ec) + cp(0x2014),
  cp(0x00ec) + cp(0x0153),
  cp(0x00ec) + cp(0x0161),
  cp(0xf9de),
  cp(0x8e42),
  cp(0x8adb),
  cp(0x63f4),
  cp(0x6e72),
  cp(0x5a9b),
  cp(0x5bc3),
  cp(0x907a),
  cp(0xf9cf),
  cp(0xf9cd),
  cp(0xf9e1),
  cp(0xf9dd),
  cp(0x934e),
  cp(0x73e5),
  "?곸",
  "?섎",
  "?댁",
  "?대",
  "?꾩",
  "?붿",
  "?ъ",
  "?쒕",
  "?낅",
  "?몄",
  "?덈",
  "?뒿",
  "?됰",
  "?먮",
  "?щ",
  "?뚯",
  "?ш",
  "?좎",
];

function shouldScan(filePath) {
  const ext = path.extname(filePath);
  if (binaryExtensions.has(ext)) return false;
  if (textExtensions.has(ext)) return true;
  return filePath.endsWith(".env.example") || filePath.endsWith("env.local.example");
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (
      entry.isFile() &&
      path.resolve(fullPath) !== selfPath &&
      shouldScan(fullPath)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function findPattern(line) {
  return suspiciousPatterns.find((pattern) => line.includes(pattern));
}

let found = false;

for (const file of walk(rootDir)) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!findPattern(line)) return;
    found = true;
    const relativePath = path.relative(rootDir, file).replace(/\\/g, "/");
    const snippet = line.length > 180 ? `${line.slice(0, 180)}...` : line;
    console.log(`${relativePath}:${index + 1}: ${snippet}`);
  });
}

process.exit(found ? 1 : 0);
