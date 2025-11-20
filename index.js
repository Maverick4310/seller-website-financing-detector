import express from 'express';
import axios from 'axios';
import cheerio from 'cheerio';

const app = express();
app.use(express.json());

/* ============================================================
   KEYWORDS THAT INDICATE A PROACTIVE (CREDIT OFFERING) WEBSITE
   ============================================================ */
const KEYWORDS = [
    "financing",
    "finance",
    "apply now",
    "apply today",
    "credit application",
    "credit app",
    "lease",
    "leasing",
    "get approved",
    "payment options",
    "0% financing",
    "apply for credit",
    "instant approval",
    "term financing",
    "monthly payments",
    "payment plan",
    "business financing",
    "consumer financing",
    "financing available",
    "financing options"
];

/* ============================================================
   UTIL: Fetch website HTML safely
   ============================================================ */
async function fetchWebsite(url) {
    try {
        const response = await axios.get(url, {
            timeout: 8000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Navitas Financing Discovery Bot)"
            }
        });

        return response.data;
    } catch (err) {
        console.error("Error fetching site:", err.message);
        return null;
    }
}

/* ============================================================
   ROUTE: POST /scan
   Request body:
   { "url": "https://examplevendor.com" }
   ============================================================ */
app.post('/scan', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "URL is required." });
    }

    console.log(`🔍 Scanning website: ${url}`);

    const html = await fetchWebsite(url);
    if (!html) {
        return res.status(500).json({
            error: "Unable to fetch website HTML",
            status: "Unknown"
        });
    }

    const $ = cheerio.load(html);
    const text = $("body").text().toLowerCase();

    // Check for keyword matches
    const matches = KEYWORDS.filter(keyword => text.includes(keyword.toLowerCase()));

    const result = matches.length > 0 ? "Proactive" : "Non User";

    return res.json({
        status: result,
        url: url,
        matchedKeywords: matches,
        totalMatches: matches.length
    });
});

/* ============================================================
   HEALTH CHECK
   ============================================================ */
app.get('/', (req, res) => {
    res.send("Website Proactive Checker is running.");
});

/* ============================================================
   SERVER
   ============================================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
