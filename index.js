const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const WebsiteAnalyzer = require('./websiteanalyzer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================================
// SECURITY + STABILITY
// ======================================================
app.use(helmet());
app.use(cors());

// Rate limit tuned for Salesforce batch scans
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 45,             // Allow ~45 calls/minute safely
  message: { error: "Rate limit reached. Slow down." }
}));

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Analyzer instance
const analyzer = new WebsiteAnalyzer();

// ======================================================
// HEALTH CHECK
// ======================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    version: "optimized-crawler-1.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ======================================================
// SHARED ANALYZE HANDLER
// ======================================================
async function runAnalysis(url, debug) {
  if (!url) return { error: "URL is required", status: "error" };

  try {
    new URL(url);
  } catch {
    return { error: "Invalid URL format", status: "error" };
  }

  const result = await analyzer.analyzeWebsite(url);

  const response = {
    url,
    classification: result.classification,
    confidence: result.confidence,
    matchedKeywords: result.matchedKeywords,
    crawledPages: result.crawledPages,
    triggeredUrl: result.triggeredUrl || null,
    analysisDate: new Date().toISOString(),
    status: "success"
  };

  // Include extracted text if debug enabled
  if (debug && result.fullText) {
    response.debug = {
      textLength: result.fullText.length,
      extractedText: result.fullText.substring(0, 5000)
    };
  }

  return response;
}

// ======================================================
// POST /analyze
// ======================================================
app.post('/analyze', async (req, res) => {
  try {
    const response = await runAnalysis(req.body.url, req.query.debug === "true");
    res.status(response.error ? 400 : 200).json(response);
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
      status: "error"
    });
  }
});

// ======================================================
// GET /analyze?url=...
// ======================================================
app.get('/analyze', async (req, res) => {
  try {
    const response = await runAnalysis(req.query.url, req.query.debug === "true");
    res.status(response.error ? 400 : 200).json(response);
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
      status: "error"
    });
  }
});

// ======================================================
// ROOT API DOCS
// ======================================================
app.get('/', (req, res) => {
  res.json({
    service: "Navitas Website Analyzer",
    mode: "Shallow Crawler Enabled",
    version: "1.0.0",
    endpoints: {
      "POST /analyze": "Analyze a website",
      "GET /analyze?url=x": "Analyze via URL",
      "GET /analyze?url=x&debug=true": "Include extracted text",
      "GET /health": "Service health"
    }
  });
});

// ======================================================
// 404 HANDLER
// ======================================================
app.use('*', (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    status: "error"
  });
});

// ======================================================
// START SERVER
// ======================================================
app.listen(PORT, () => {
  console.log(`🚀 Optimized Website Analyzer running on ${PORT}`);
});
