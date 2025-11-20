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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Analyzer instance
const analyzer = new WebsiteAnalyzer();

// =====================================================
// HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// =====================================================
// POST /analyze   (main production endpoint)
// =====================================================
app.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    const debug = req.query.debug === "true";

    if (!url) {
      return res.status(400).json({
        error: "URL is required",
        status: "error"
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

    // Run analyzer
    const result = await analyzer.analyzeWebsite(url);

    // Build response
    const response = {
      url,
      classification: result.classification,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      analysisDate: new Date().toISOString(),
      status: "success"
    };

    // Include debug data
    if (debug && result.fullText) {
      response.debug = {
        extractedText: result.fullText.substring(0, 5000), // Prevent huge response
        textLength: result.fullText.length
      };
    }

    res.status(200).json(response);

  } catch (err) {
    res.status(500).json({
      error: "Failed to analyze website",
      details: err.message,
      status: "error"
    });
  }
});

// =====================================================
// GET /analyze?url= (for browser testing)
// =====================================================
app.get('/analyze', async (req, res) => {
  try {
    const { url, debug } = req.query;

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

    const response = {
      url,
      classification: result.classification,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      analysisDate: new Date().toISOString(),
      status: "success"
    };

    if (debug === "true" && result.fullText) {
      response.debug = {
        extractedText: result.fullText.substring(0, 5000),
        textLength: result.fullText.length
      };
    }

    res.status(200).json(response);

  } catch (err) {
    res.status(500).json({
      error: "Failed to analyze website",
      details: err.message,
      status: "error"
    });
  }
});

// =====================================================
// API documentation
// =====================================================
app.get('/', (req, res) => {
  res.json({
    service: "Website Financing Analyzer",
    version: "1.0.0",
    description: "Scans websites to detect financing, quoting, and lead-gen behavior",
    endpoints: {
      "POST /analyze": "Analyze website via POST body",
      "GET /analyze?url=": "Analyze website via query",
      "GET /analyze?url=x&debug=true": "Includes extracted text for troubleshooting",
      "GET /health": "Health check"
    }
  });
});

// =====================================================
// 404 Handler
// =====================================================
app.use('*', (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    status: "error"
  });
});

// =====================================================
// Start server
// =====================================================
app.listen(PORT, () => {
  console.log(`🚀 Analyzer running on port ${PORT}`);
});
