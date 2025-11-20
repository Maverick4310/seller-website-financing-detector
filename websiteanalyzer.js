const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class WebsiteAnalyzer {
  constructor() {
    this.financingKeywords = [
      // Primary financing terms
      'financing', 'apply now', 'credit', 'loan', 'payment plan',
      'installment', 'monthly payment', 'deferred payment',
      
      // Credit-related terms
      'credit score', 'credit check', 'no credit check', 'bad credit',
      'credit approval', 'instant credit', 'pre-approved',
      
      // Application terms
      'apply online', 'quick approval', 'instant approval',
      'application', 'pre-qualify', 'get approved',
      
      // Payment terms
      'buy now pay later', 'bnpl', 'split payment', 'pay over time',
      '0% apr', 'no interest', 'interest free', 'same as cash',
      
      // Promotional terms
      'special financing', 'promotional financing', 'finance options',
      'payment options', 'flexible payment', 'easy payment',
      
      // Common financing providers
      'affirm', 'klarna', 'afterpay', 'sezzle', 'quadpay', 'zip',
      'paypal credit', 'synchrony', 'care credit', 'wells fargo',
      
      // Call-to-action terms
      'finance it', 'finance today', 'get financing', 'check financing',
      'financing available', 'finance this purchase'
    ];
    
    // High-confidence keywords that strongly suggest financing
    this.highConfidenceKeywords = [
      'apply now', 'financing', 'credit approval', 'payment plan',
      'buy now pay later', 'monthly payment', 'affirm', 'klarna',
      'afterpay', 'finance options', 'get approved'
    ];
  }

  async analyzeWebsite(url) {
    try {
      // First try with simple HTTP request
      let content = await this.fetchWithAxios(url);
      let isJavaScriptRendered = false;

      // If we get minimal content, try with Puppeteer for JavaScript-heavy sites
      if (content.length < 1000) {
        console.log('Content seems minimal, trying JavaScript rendering...');
        content = await this.fetchWithPuppeteer(url);
        isJavaScriptRendered = true;
      }

      const analysis = this.analyzeContent(content);
      
      return {
        classification: analysis.isFinancingDetected ? 'Proactive' : 'Non User',
        confidence: analysis.confidence,
        matchedKeywords: analysis.matchedKeywords,
        contentLength: content.length,
        javascriptRendered: isJavaScriptRendered,
        analysisMethod: isJavaScriptRendered ? 'puppeteer' : 'axios'
      };

    } catch (error) {
      console.error(`Error analyzing ${url}:`, error.message);
      throw new Error(`Failed to analyze website: ${error.message}`);
    }
  }

  async fetchWithAxios(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style tags
      $('script, style, noscript').remove();
      
      // Extract text content
      const textContent = $('body').text().toLowerCase();
      
      return textContent;

    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Website not accessible or does not exist');
      }
      if (error.response && error.response.status === 403) {
        throw new Error('Access denied - website may block automated requests');
      }
      if (error.response && error.response.status === 404) {
        throw new Error('Website not found (404)');
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  async fetchWithPuppeteer(url) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });

      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set a reasonable timeout
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      });

      // Wait for any dynamic content to load
      await page.waitForTimeout(2000);

      // Extract text content
      const textContent = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());
        
        return document.body.innerText.toLowerCase();
      });

      return textContent;

    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new Error('Website took too long to load');
      }
      throw new Error(`Browser error: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  analyzeContent(content) {
    const matchedKeywords = [];
    let confidenceScore = 0;
    let highConfidenceMatches = 0;

    // Clean content and normalize spaces
    const cleanContent = content.replace(/\s+/g, ' ').trim();

    // Check for each financing keyword
    this.financingKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = cleanContent.match(regex);
      
      if (matches) {
        matchedKeywords.push({
          keyword: keyword,
          count: matches.length,
          isHighConfidence: this.highConfidenceKeywords.includes(keyword.toLowerCase())
        });

        // Calculate confidence based on keyword importance and frequency
        if (this.highConfidenceKeywords.includes(keyword.toLowerCase())) {
          confidenceScore += 0.3 * matches.length;
          highConfidenceMatches += matches.length;
        } else {
          confidenceScore += 0.1 * matches.length;
        }
      }
    });

    // Additional patterns that suggest financing
    const financingPatterns = [
      /\$\d+[\s]*per[\s]*month/gi,
      /\d+[\s]*months[\s]*financing/gi,
      /\d+[\s]*%[\s]*apr/gi,
      /no[\s]*money[\s]*down/gi,
      /zero[\s]*percent/gi,
      /\d+[\s]*easy[\s]*payments/gi
    ];

    financingPatterns.forEach(pattern => {
      const matches = cleanContent.match(pattern);
      if (matches) {
        matchedKeywords.push({
          keyword: 'financial_pattern',
          count: matches.length,
          isHighConfidence: true,
          examples: matches.slice(0, 3) // Keep first 3 examples
        });
        confidenceScore += 0.25 * matches.length;
        highConfidenceMatches += matches.length;
      }
    });

    // Normalize confidence score
    confidenceScore = Math.min(confidenceScore, 1.0);

    // Determine if financing is detected
    const isFinancingDetected = matchedKeywords.length > 0 && 
                               (highConfidenceMatches > 0 || matchedKeywords.length >= 3);

    return {
      isFinancingDetected,
      confidence: parseFloat(confidenceScore.toFixed(3)),
      matchedKeywords: matchedKeywords.sort((a, b) => b.count - a.count),
      totalMatches: matchedKeywords.reduce((sum, item) => sum + item.count, 0),
      highConfidenceMatches
    };
  }

  // Utility method to validate URL
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

module.exports = WebsiteAnalyzer;
