// ---------------- RSS Fetch ----------------
// Use RSSHub if rss2json.com is limited
async function fetchRSS(rssUrl) {
  try {
    const res = await fetch(rssUrl);
    const data = await res.json();
    return data.items || data; // handle different JSON structures
  } catch (e) {
    console.error("RSS fetch error:", e);
    return [];
  }
}

// ---------------- Utility: Text scoring ----------------
function scoreText(title, triggers, positive, negative, negations) {
  const t = title.toLowerCase();
  if (!triggers.some(w => t.includes(w))) return 0;

  let score = 0;
  if (negations.some(w => t.includes(w))) return -1; // simple negation handling
  if (positive.some(w => t.includes(w))) score += 1;
  if (negative.some(w => t.includes(w))) score -= 1;

  return score;
}

// ---------------- USD Signal ----------------
const USD_TRIGGER = ["fed", "inflation", "yields", "treasury", "rates"];
const USD_POSITIVE = ["rise", "rises", "rising", "surge", "hot", "higher", "hawkish", "sticky"];
const USD_NEGATIVE = ["fall", "falls", "falling", "ease", "cool", "lower", "dovish", "slow"];
const USD_NEGATIONS = ["no", "not", "without", "eases"];

function usdSignal(items) {
  let score = 0;
  items.forEach(item => {
    score += scoreText(item.title, USD_TRIGGER, USD_POSITIVE, USD_NEGATIVE, USD_NEGATIONS);
  });

  if (score >= 2) return "USD_STRONG";
  if (score <= -2) return "USD_WEAK";
  return "USD_NEUTRAL";
}

// ---------------- Silver Signal ----------------
const SILVER_TRIGGER = ["silver", "metals", "industrial", "demand", "mine", "etf"];
const SILVER_POSITIVE = ["increase", "rise", "surge", "strong", "higher"];
const SILVER_NEGATIVE = ["fall", "decline", "weak", "drop", "lower"];
const SILVER_NEGATIONS = ["no", "not", "without"];

function silverSignal(items) {
  let score = 0;
  items.forEach(item => {
    score += scoreText(item.title, SILVER_TRIGGER, SILVER_POSITIVE, SILVER_NEGATIVE, SILVER_NEGATIONS);
  });

  if (score >= 2) return "BULLISH_SILVER";
  if (score <= -2) return "BEARISH_SILVER";
  return "NEUTRAL";
}

// ---------------- India Policy Check ----------------
function indiaPolicy(items) {
  for (let i of items.slice(0, 5)) {
    const t = i.title.toLowerCase();
    if (t.includes("silver") && (t.includes("duty") || t.includes("mcx") || t.includes("tax"))) {
      return `Check Indian policy: "${i.title}" (${i.link})`;
    }
  }
  return "Neutral";
}

// ---------------- Decision Logic (Full Checklist) ----------------
function decideETF(premium, silverTrend, usdTrend, indiaNews) {
  // Step 1: ETF vs NAV
  if (premium < 0) return ["HOLD", "ETF below NAV (discount)"];

  // Step 2: COMEX / Silver news
  if (silverTrend === "BEARISH_SILVER") {
    if (usdTrend === "USD_STRONG") return ["SELL", "Silver weak + USD strong"];
    else return ["SELL", "Silver weak"];
  }

  // Step 3: USD
  if (usdTrend === "USD_STRONG") return ["SELL", "USD rising strongly"];
  if (usdTrend === "USD_NEUTRAL" || usdTrend === "USD_WEAK") return ["HOLD", "USD flat/falling"];

  // Step 4: Check India / premium unwinding
  if (premium > 1) return ["SELL", "ETF trading at premium"];
  if (indiaNews.startsWith("Check Indian policy")) return ["HOLD", indiaNews];

  return ["HOLD", "No strong sell signal"];
}

// ---------------- Main Function ----------------
async function runCheck() {
  document.getElementById("output").innerText = "Fetching data...";

  // Manual ETF/NAV input
  const etfPrice = parseFloat(prompt("Enter Nippon Silver ETF price:"));
  const nav = parseFloat(prompt("Enter NAV:"));
  const premium = ((etfPrice - nav) / nav) * 100;

  // RSS feeds (use RSSHub JSON URLs)
  const silverRSS = await fetchRSS("https://rsshub.app/reuters/markets/commodities");
  const usdRSS = await fetchRSS("https://rsshub.app/reuters/markets/us");
  const indiaRSS = await fetchRSS("https://rsshub.app/moneycontrol/commodity");

  const silverTrend = silverSignal(silverRSS);
  const usdTrend = usdSignal(usdRSS);
  const indiaNews = indiaPolicy(indiaRSS);

  const [action, reason] = decideETF(premium, silverTrend, usdTrend, indiaNews);

  // Output
  document.getElementById("output").innerHTML = `
ETF vs NAV: ${premium.toFixed(2)}% (${premium >= 0 ? "Premium" : "Discount"})
Silver Trend: ${silverTrend}
USD Trend: ${usdTrend}
India News: ${indiaNews}

<span class="action ${action === "HOLD" ? "hold" : "sell"}">FINAL ACTION: ${action}</span>
REASON: ${reason}
`;
}
