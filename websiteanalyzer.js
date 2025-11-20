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
      "finance available"
    ];

    this.highConfidenceKeywords = [
      "apply now", "financing", "credit approval",
      "payment plan", "buy now pay later",
      "monthly payment", "affirm", "klarna",
      "afterpay", "finance options", "get approved"
    ];
  }

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
        .toLowerCase()
        .replace(/\s+/g, " ");
        
    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }
  }

  analyzeContent(content) {
    const matchedKeywords = [];
    let confidenceScore = 0;
    let highConfidenceMatches = 0;

    this.financingKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = content.match(regex);

      if (matches) {
        matchedKeywords.push({
          keyword,
          count: matches.length,
          isHighConfidence: this.highConfidenceKeywords.includes(keyword)
        });

        if (this.highConfidenceKeywords.includes(keyword)) {
          confidenceScore += 0.3 * matches.length;
          highConfidenceMatches += matches.length;
        } else {
          confidenceScore += 0.1 * matches.length;
        }
      }
    });

    confidenceScore = Math.min(confidenceScore, 1.0);

    const isFinancingDetected =
      matchedKeywords.length > 0 &&
      (highConfidenceMatches > 0 || matchedKeywords.length >= 3);

    return {
      isFinancingDetected,
      confidence: Number(confidenceScore.toFixed(3)),
      matchedKeywords
    };
  }
}

module.exports = WebsiteAnalyzer;
