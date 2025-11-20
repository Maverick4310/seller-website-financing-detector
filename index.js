const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const WebsiteAnalyzer = require('./websiteanalyzer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize website analyzer
const analyzer = new WebsiteAnalyzer();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({
        error: 'URL is required',
        status: 'error'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format',
        status: 'error'
      });
    }

    console.log(`Analyzing URL: ${url}`);

    // Analyze the website
    const result = await analyzer.analyzeWebsite(url);

    res.status(200).json({
      url: url,
      classification: result.classification,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      analysisDate: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    console.error('Analysis error:', error.message);
    
    res.status(500).json({
      error: 'Failed to analyze website',
      details: error.message,
      status: 'error'
    });
  }
});

// GET endpoint for simple URL analysis
app.get('/analyze', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: 'URL parameter is required',
        status: 'error',
        usage: 'GET /analyze?url=https://example.com'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format',
        status: 'error'
      });
    }

    console.log(`Analyzing URL via GET: ${url}`);

    const result = await analyzer.analyzeWebsite(url);

    res.status(200).json({
      url: url,
      classification: result.classification,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      analysisDate: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    console.error('Analysis error:', error.message);
    
    res.status(500).json({
      error: 'Failed to analyze website',
      details: error.message,
      status: 'error'
    });
  }
});

// API documentation endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Website Financing Analyzer',
    version: '1.0.0',
    description: 'Analyzes websites to detect financing and credit offerings',
    endpoints: {
      'POST /analyze': {
        description: 'Analyze a website for financing content',
        body: {
          url: 'Website URL to analyze'
        },
        response: {
          classification: 'Proactive or Non User',
          confidence: 'Confidence score (0-1)',
          matchedKeywords: 'Array of matched financing keywords'
        }
      },
      'GET /analyze?url=': {
        description: 'Analyze a website via GET request',
        parameters: {
          url: 'Website URL to analyze'
        }
      },
      'GET /health': 'Health check endpoint'
    },
    examples: [
      'POST /analyze with body: {"url": "https://example.com"}',
      'GET /analyze?url=https://example.com'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    status: 'error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    status: 'error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Website Financing Analyzer running on port ${PORT}`);
  console.log(`📊 Ready to analyze websites for financing content`);
  console.log(`🔗 API Documentation: http://localhost:${PORT}`);
});

module.exports = app;
