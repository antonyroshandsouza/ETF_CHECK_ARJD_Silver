async function fetchYahoo(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
  const res = await fetch(url);
  const data = await res.json();
  const close = data.chart.result[0].indicators.quote[0].close;
  const len = close.length;
  return ((close[len - 1] - close[len - 2]) / close[len - 2]) * 100;
}

async function fetchRSS(rssUrl) {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;
  const res = await fetch(url);
  return await res.json();
}

function usdSignal(items) {
  for (let i of items) {
    const t = i.title.toLowerCase();
    if (t.includes("fed") || t.includes("inflation") || t.includes("yield")) {
      return "USD_STRONG";
    }
  }
  return "USD_NEUTRAL";
}

function decide(premium, silver, dxy, usdSig) {
  if (silver < -0.7 && dxy > 0.4) return ["SELL", "Silver weak + USD strong"];
  if (premium > 1 && usdSig === "USD_STRONG") return ["SELL", "ETF premium + USD pressure"];
  return ["HOLD", "No strong sell signal"];
}

async function runCheck() {
  document.getElementById("output").innerText = "Fetching data...";

  const silver = await fetchYahoo("SI=F");
  const dxy = await fetchYahoo("DX-Y.NYB");

  const etfPrice = prompt("Enter Nippon Silver ETF price:");
  const nav = prompt("Enter NAV:");

  const premium = ((etfPrice - nav) / nav) * 100;

  const usdNews = await fetchRSS("https://www.reuters.com/markets/us/rss");
  const usdSig = usdSignal(usdNews.items);

  const [action, reason] = decide(premium, silver, dxy, usdSig);

  document.getElementById("output").innerText = `
ETF vs NAV: ${premium.toFixed(2)}%
COMEX Silver: ${silver.toFixed(2)}%
USD (DXY): ${dxy.toFixed(2)}%
USD News: ${usdSig}

FINAL ACTION: ${action}
REASON: ${reason}
`;
}
