const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const CSV_PATH = path.join(ROOT, "moil-collaboration-responses.csv");

const headers = [
  "Submitted At",
  "Company Name",
  "Company Representative",
  "Company Email",
  "Contact Information",
  "Selected Collaboration Area",
  "Interest / Collaboration Details",
];

function csvEscape(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function ensureCsv() {
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, `${headers.map(csvEscape).join(",")}\n`);
  }
}

function appendSubmission(payload) {
  ensureCsv();

  const submittedAt = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).replace(/\//g, "-").replace(",", "");
  const selections = Array.isArray(payload.selections) && payload.selections.length
    ? payload.selections
    : [{ area: "", details: "" }];

  const rows = selections.map((selection) => [
    submittedAt,
    payload.companyName,
    payload.representative,
    payload.email,
    payload.contact,
    selection.area,
    selection.details,
  ]);

  fs.appendFileSync(CSV_PATH, rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
}

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/moil-collaboration-form.html")) {
    serveFile(res, path.join(ROOT, "moil-collaboration-form.html"), "text/html; charset=utf-8");
    return;
  }

  if (req.method === "GET" && req.url === "/moil-logo.png") {
    const logoPath = path.join(ROOT, "moil-logo.png");
    serveFile(res, logoPath, contentTypeFor(logoPath));
    return;
  }

  if (req.method === "POST" && req.url === "/api/submit") {
    try {
      const payload = await readJson(req);
      if (!payload.companyName || !payload.representative || !payload.email || !payload.contact) {
        send(res, 400, JSON.stringify({ ok: false, error: "Missing required company details" }), "application/json");
        return;
      }
      appendSubmission(payload);
      send(res, 200, JSON.stringify({ ok: true }), "application/json");
    } catch (error) {
      send(res, 500, JSON.stringify({ ok: false, error: "Could not save submission" }), "application/json");
    }
    return;
  }

  send(res, 404, "Not found");
});

server.listen(PORT, () => {
  console.log(`MOIL form running at http://127.0.0.1:${PORT}/`);
  console.log(`Responses will be saved to ${CSV_PATH}`);
});
