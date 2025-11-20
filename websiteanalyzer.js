const axios = require('axios');
const cheerio = require('cheerio');

class WebsiteAnalyzer {
  constructor() {
    this.financingKeywords = [
      "financing", "finance", "apply now", "credit", "loan",
      "payment plan", "installment", "monthly payment",
      "deferred payment", "credit score", "no credit check",
      "bad credit", "credit approval", "instant credit",
      "application", "pre-qualify", "get approved",
      "buy now pay later", "bnpl", "0% apr", "interest free",
      "special financing", "finance options", "payment options",
      "affirm", "klarna", "afterpay", "sezzle", "paypal credit",
      "finance available",

      // Quoting / Pricing indicators
      "quote", "instant quote", "get a quote", "request a quote",
      "free quote", "online quote", "quick quote", "quote now",
      "get pricing", "see pricing", "get an instant quote",
      "request estimate", "get estimate"
    ];

    this.highConfidenceKeywords = [
      "apply now", "financing", "credit approval",
      "payment plan", "buy now pay later",
      "monthly payment", "affirm", "klarna",
      "afterpay", "finance options", "get approved",

      "instant quote", "get a quote", "request a quote",
      "quote now", "get an instant quote"
    ];
  }

  // ======================================================
  // MAIN ANALYSIS FUNCTION
  // ======================================================
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
        analysisMethod: "axios",
        fullText: content  // REQUIRED FOR DEBUG
      };

    } catch (error) {
      throw new Error(`Failed to analyze website: ${error.message}`);
    }
  }

  // ======================================================
  // FETCH HTML VIA AXIOS
  // ======================================================
  async fetchWithAxios(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 Navitas-Finance-Scanner"
        }
      });

      const $ = cheerio.load(response.data);

      $("script, style, noscript").remove();

      return $("body")
        .text()
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]/g, " ")
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }
  }

  // ======================================================
  // KEYWORD & SCORING ENGINE
  // ======================================================
  analyzeContent(content) {
    const matchedKeywords = [];
    let confidenceScore = 0;
    let highConfidenceMatches = 0;

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
          confidenceScore += 0.4 * matches.length;
          highConfidenceMatches += matches.length;
        } else {
          confidenceScore += 0.15 * matches.length;
        }
      }
    });

    confidenceScore = Math.min(confidenceScore, 1.0);

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
