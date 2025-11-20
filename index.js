const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const WebsiteAnalyzer = require('./websiteanalyzer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security
app.use(helmet());
app.use(cors());

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests — try again later."
  }
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Analyzer instance
const analyzer = new WebsiteAnalyzer();

// ===========================
// Health Check
// ===========================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ===========================
// POST /analyze
// ===========================
app.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: "URL is required",
        status: "error"
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: "Invalid URL format",
        status: "error"
      });
    }

    const result = await analyzer.analyzeWebsite(url);

    return res.status(200).json({
      url,
      classification: result.classification,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      analysisDate: new Date().toISOString(),
      status: "success"
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to analyze website",
      details: err.message,
      status: "error"
    });
  }
});

// ===========================
// GET /analyze?url=
// ===========================
app.get('/analyze', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: "URL parameter required",
        status: "error",
        usage: "GET /analyze?url=https://example.com"
      });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: "Invalid URL format",
        status: "error"
      });
    }

    const result = await analyzer.analyzeWebsite(url);

    return res.status(200).json({
      url,
      classification: result.classification,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      analysisDate: new Date().toISOString(),
      status: "success"
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to analyze website",
      details: err.message,
      status: "error"
    });
  }
});

// ===========================
// Root API documentation
// ===========================
app.get('/', (req, res) => {
  res.json({
    service: "Website Financing Analyzer",
    version: "1.0.0",
    description: "Scans websites to determine if they offer financing",
    endpoints: {
      "POST /analyze": "Analyze website via POST body",
      "GET /analyze?url=": "Analyze website via URL query parameter",
      "GET /health": "Health check"
    }
  });
});

// ===========================
// 404 Handler
// ===========================
app.use('*', (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    status: "error"
  });
});

// ===========================
// Start server
// ===========================
app.listen(PORT, () => {
  console.log(`🚀 Analyzer running on port ${PORT}`);
});
