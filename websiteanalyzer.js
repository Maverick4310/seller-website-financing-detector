const axios = require('axios');
const cheerio = require('cheerio');

class WebsiteAnalyzer {
  constructor() {
    // ============================================
    //  FINANCING KEYWORDS
    // ============================================
    this.financingKeywords = [
      // Financing
      "financing", "finance", "apply now", "credit", "loan",
      "payment plan", "installment", "monthly payment",
      "deferred payment", "credit score", "no credit check",
      "bad credit", "credit approval", "instant credit",
      "application", "pre-qualify", "get approved",
      "buy now pay later", "bnpl", "0% apr", "interest free",
      "special financing", "finance options", "payment options",
      "affirm", "klarna", "afterpay", "sezzle", "paypal credit",
      "finance available",

      // QUOTE-TRIGGERING KEYWORDS (NEW)
      "quote",
      "instant quote",
      "get a quote",
      "request a quote",
      "free quote",
      "online quote",
      "quick quote",
      "quote now",
      "get pricing",
      "see pricing",
      "get an instant quote",
      "request estimate",
      "get estimate"
    ];

    // ============================================
    // HIGH CONFIDENCE WORDS (these directly imply financing intent)
    // ============================================
    this.highConfidenceKeywords = [
      "apply now", "financing", "credit approval",
      "payment plan", "buy now pay later",
      "monthly payment", "affirm", "klarna",
      "afterpay", "finance options", "get approved",

      // HIGH CONFIDENCE QUOTE TRIGGERS
      "instant quote",
      "get a quote",
      "request a quote",
      "quote now"
    ];
  }

  // ============================================
  // MAIN ENTRY METHOD
  // ============================================
  async analyzeWebsite(url) {
    try {
      const content = await this.fetchWithAxios(url);
      const analysis = this.analyzeContent(content);

      return {
        classification: analysis.isFinancingDetected ? "Proactive" : "Non User",
        confidence: analysis.confidence,
        matchedKeywords: analysis.matchedKeywords,
        contentLength: content.length,
        javascriptRendered: false,
        analysisMethod: "axios"
      };

    } catch (error) {
      throw new Error(`Failed to analyze website: ${error.message}`);
    }
  }

  // ============================================
  // FETCH HTML WITH AXIOS
  // ============================================
  async fetchWithAxios(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 Navitas-Finance-Scanner"
        }
      });

      const $ = cheerio.load(response.data);

      // Remove noise
      $("script, style, noscript").remove();

      // Normalize text
      return $("body")
        .text()
        .normalize("NFKD")     // Fix Unicode issues
        .toLowerCase()
        .replace(/\s+/g, " "); // Clean spacing

    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }
  }

  // ============================================
  // CONTENT ANALYSIS
  // ============================================
  analyzeContent(content) {
    const matchedKeywords = [];
    let confidenceScore = 0;
    let highConfidenceMatches = 0;

    // Search for keywords WITHOUT word-boundaries (more reliable)
    this.financingKeywords.forEach(keyword => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");  
      const regex = new RegExp(escaped, "gi");
      const matches = content.match(regex);

      if (matches) {
        matchedKeywords.push({
          keyword,
          count: matches.length,
          isHighConfidence: this.highConfidenceKeywords.includes(keyword)
        });

        if (this.highConfidenceKeywords.includes(keyword)) {
          confidenceScore += 0.4 * matches.length;   // strong indicators
          highConfidenceMatches += matches.length;
        } else {
          confidenceScore += 0.15 * matches.length;  // weaker indicators
        }
      }
    });

    // Cap confidence at 1.0
    confidenceScore = Math.min(confidenceScore, 1.0);

    // Determine proactive classification
    const isFinancingDetected =
      matchedKeywords.length > 0 &&
      (highConfidenceMatches > 0 || matchedKeywords.length >= 2);

    return {
      isFinancingDetected,
      confidence: Number(confidenceScore.toFixed(3)),
      matchedKeywords
    };
  }
}

module.exports = WebsiteAnalyzer;
