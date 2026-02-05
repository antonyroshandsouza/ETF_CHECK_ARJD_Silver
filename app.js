// ---------- RSS fetcher ----------
async function fetchRSS(rssUrl) {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;
  const res = await fetch(url);
  return await res.json();
}

// ---------- USD Signal Logic ----------
const USD_TRIGGER = ["fed", "inflation", "yields", "treasury", "rates"];
const USD_STRONG_WORDS = ["rise", "rises", "rising", "surge", "hot", "higher", "hawkish", "sticky"];
const USD_WEAK_WORDS = ["fall", "falls", "falling", "ease", "cool", "lower", "dovish", "slow"];
const USD_NEGATIONS = ["no", "not", "without", "eases"];

function usdSignal(items) {
  let score = 0;

  for (let i of items) {
    const t = i.title.toLowerCase();
    if (!USD_TRIGGER.some(w => t.includes(w))) continue;

    if (USD_NEGATIONS.some(w => t.includes(w))) score -= 1;
    if (USD_STRONG_WORDS.some(w => t.includes(w))) score += 1;
    if (USD_WEAK_WORDS.some(w => t.includes(w))) score -= 1;
  }

  if (score >= 2) return "USD_STRONG";
  if (score <= -2) return "USD_WEAK";
  return "USD_NEUTRAL";
}

// ---------- Silver Signal Logic ----------
const SILVER_TRIGGER = ["silver", "metals", "industrial", "demand", "mine", "etf"];
const SILVER_POSITIVE = ["increase", "rise", "surge", "strong", "higher"];
const SILVER_NEGATIVE = ["fall", "decline", "weak", "drop", "lower"];
const SILVER_NEGATIONS = ["no", "not", "without"];

function silverSignal(items) {
  let score = 0;

  for (let i of items) {
    const t = i.title.toLowerCase();
    if (!SILVER_TRIGGER.some(w => t.includes(w))) continue;

    if (SILVER_NEGATIONS.some(w => t.includes(w))) score -= 1;
    if (SILVER_POSITIVE.some(w => t.includes(w))) score += 1;
    if (SILVER_NEGATIVE.some(w => t.includes(w))) score -= 1;
  }

  if (score >= 2) return "BULLISH_SILVER";
  if (score <= -2) return "BEARISH_SILVER";
  return "NEUTRAL";
}

// ---------- Decision Logic ----------
function decide(premium, silverSignalStr, usdSignalStr) {
  if (silverSignalStr === "BEARISH_SILVER" && usdSignalStr === "USD_STRONG") {
    return ["SELL", "Silver weak + USD strong"];
  }
  if (premium > 1 && usdSignalStr === "USD_STRONG") {
    return ["SELL", "ETF premium + USD pressure"];
  }
  return ["HOLD", "No strong sell signal"];
}

// ---------- Main function ----------
async function runCheck() {
  document.getElementById("output").innerText = "Fetching data...";

  // ---- Manual input for now ----
  const etfPrice = parseFloat(prompt("Enter Nippon Silver ETF price:"));
  const nav = parseFloat(prompt("Enter NAV:"));
  const premium = ((etfPrice - nav) / nav) * 100;

  // ---- Fetch RSS feeds ----
  const silverRSS = await fetchRSS("https://api.rss2json.com/v1/api.json?rss_url=https://www.reuters.com/markets/commodities/rss");
  const usdRSS = await fetchRSS("https://api.rss2json.com/v1/api.json?rss_url=https://www.reuters.com/markets/us/rss");
  const indiaRSS = await fetchRSS("https://api.rss2json.com/v1/api.json?rss_url=https://www.moneycontrol.com/rss/commodity.xml");

  const silverSig = silverSignal(silverRSS.items);
  const usdSig = usdSignal(usdRSS.items);

  // ---- Optional India news summary ----
  let indiaNews = "Neutral";
  for (let i of indiaRSS.items.slice(0,5)) {
    const t = i.title.toLowerCase();
    if (t.includes("silver") && (t.includes("duty") || t.includes("mcx") || t.includes("tax"))) {
      indiaNews = "Watch India policy";
      break;
    }
  }

  // ---- Decision ----
  const [action, reason] = decide(premium, silverSig, usdSig);

  // ---- Output ----
  document.getElementById("output").innerText = `
ETF vs NAV: ${premium.toFixed(2)}% (${premium >= 0 ? "Premium" : "Discount"})
Silver Trend: ${silverSig}
USD Trend: ${usdSig}
India News: ${indiaNews}

FINAL ACTION: ${action}
REASON: ${reason}
`;
}
