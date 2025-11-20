const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const WebsiteAnalyzer = require('./websiteanalyzer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate-limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests — please try again later."
  }
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const analyzer = new WebsiteAnalyzer();

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// POST /analyze
app.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required", status: "error" });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format", status: "error" });
    }

    const result = await analyzer.analyzeWebsite(url);
