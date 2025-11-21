const axios = require('axios');
const cheerio = require('cheerio');

class WebsiteAnalyzer {
  constructor() {
    // ======================================================
    // FINANCING & QUOTING KEYWORDS
    // ======================================================
    this.financingKeywords = [
      "financing", "finance", "apply now", "credit", "loan",
      "payment plan", "installment", "monthly payment",
      "deferred payment", "credit score", "no credit check",
      "bad credit", "credit approval", "instant credit",
      "application", "pre-qualify", "get approved",
      "buy now pay later", "bnpl", "0% apr", "interest free",
      "special financing", "finance options", "payment options",
      "affirm", "klarna", "afterpay", "sezzle", "paypal credit",
      "finance available", "leasing"

      // Quoting
      "quote", "instant quote", "get a quote", "request a quote",
      "free quote", "online quote", "quick quote", "quote now",
      "get pricing", "see pricing", "get an instant quote",
      "request estimate", "get estimate"
    ];

    this.highConfidenceKeywords = [
      "apply now", "financing", "credit approval",
      "payment plan", "buy now pay later", "monthly payment",
      "affirm", "klarna", "afterpay", "finance options", "get approved",

      "instant quote", "get a quote", "request a quote",
      "quote now", "get an instant quote"
    ];

    // SHALLOW CRAWL SETTINGS
    this.maxPages = 5;
    this.requestDelayMs = 100; // short pause between pages
  }

  // ======================================================
  // MAIN ANALYSIS — includes shallow crawling
  // ======================================================
  async analyzeWebsite(url) {
    try {
      const visited = new Set();
      const toVisit = [url];
      const allMatches = [];
      let combinedConfidence = 0;

      while (toVisit.length > 0 && visited.size < this.maxPages) {
        const currentUrl = toVisit.shift();
        if (!currentUrl || visited.has(currentUrl)) continue;

        visited.add(currentUrl);

        // Fetch HTML
        const content = await this.fetchWithAxios(currentUrl);
        const analysis = this.analyzeContent(content);

        // Aggregate results
        if (analysis.matchedKeywords.length > 0) {
          allMatches.push(...analysis.matchedKeywords);
          combinedConfidence += analysis.confidence;

          // SHORT-CIRCUIT → Stop crawling immediately
          return {
            classification: "Proactive",
            confidence: Math.min(1, combinedConfidence),
            matchedKeywords: allMatches,
            crawledPages: [...visited],
            triggeredUrl: currentUrl,
            status: "success"
          };
        }

        // Extract internal link candidates
        const internalLinks = this.extractLinks(content, url);

        // Add candidates to visit queue
        for (const link of internalLinks) {
          if (toVisit.length < this.maxPages && !visited.has(link)) {
            toVisit.push(link);
          }
        }

        await this.sleep(this.requestDelayMs);
      }

      // No financing found anywhere
      return {
        classification: "Non-User",
        confidence: 0,
        matchedKeywords: [],
        crawledPages: [...visited],
        status: "success"
      };

    } catch (error) {
      throw new Error(`Failed to analyze website: ${error.message}`);
    }
  }

  // ======================================================
  // FETCH + NORMALIZE
  // ======================================================
  async fetchWithAxios(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml"
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
      return ""; // Gracefully handle blocking
    }
  }

  // ======================================================
  // KEYWORD ENGINE
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
    return {
      confidence: confidenceScore,
      matchedKeywords
    };
  }

  // ======================================================
  // EXTRACT INTERNAL LINKS FOR SHALLOW CRAWL
  // ======================================================
  extractLinks(content, baseUrl) {
    const root = this.getRootDomain(baseUrl);
    const links = new Set();

    const regex = /href="([^"]+)"/gi;
    let match;
    while ((match = regex.exec(content))) {
      let href = match[1];

      // Make absolute if needed
      if (href.startsWith("/")) href = root + href;

      // Only keep internal links
      if (!href.startsWith(root)) continue;

      // Skip noise pages
      if (/\.(jpg|png|gif|pdf|zip|svg)$/i.test(href)) continue;
      if (/blog|news|about|privacy|terms|career|admin|login/i.test(href)) continue;

      links.add(href);
    }

    return [...links];
  }

  getRootDomain(url) {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WebsiteAnalyzer;
