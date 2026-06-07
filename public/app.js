const samplePortfolio = [
  {
    symbol: "AAPL",
    sector: "Technology",
    quantity: 13,
    purchase_price: 120.57,
    purchase_date: "2022-03-12",
  },
  {
    symbol: "MSFT",
    sector: "Technology",
    quantity: 8,
    purchase_price: 285.4,
    purchase_date: "2023-01-20",
  },
  {
    symbol: "JNJ",
    sector: "Healthcare",
    quantity: 10,
    purchase_price: 158.25,
    purchase_date: "2022-09-05",
  },
];

const goalQueries = {
  complete:
    "Analyze this portfolio using current market information and write a detailed report with actionable recommendations.",
  risk:
    "Analyze this portfolio using current market information, identify its main risks, and recommend ways to reduce risk.",
  growth:
    "Analyze this portfolio using current market information and recommend opportunities for long-term growth.",
  diversification:
    "Analyze this portfolio using current market information and recommend ways to improve diversification.",
};

const elements = {
  form: document.querySelector("#analysis-form"),
  analysisGoal: document.querySelector("#analysis-goal"),
  holdingsList: document.querySelector("#holdings-list"),
  portfolioTotal: document.querySelector("#portfolio-total"),
  addHolding: document.querySelector("#add-holding"),
  loadSample: document.querySelector("#load-sample"),
  analyzeButton: document.querySelector("#analyze-button"),
  error: document.querySelector("#error-message"),
  apiStatus: document.querySelector("#api-status"),
  emptyState: document.querySelector("#empty-state"),
  loadingState: document.querySelector("#loading-state"),
  reportView: document.querySelector("#report-view"),
  reportContent: document.querySelector("#report-content"),
  portfolioSummary: document.querySelector("#portfolio-summary"),
  reportPath: document.querySelector("#report-path"),
  downloadReport: document.querySelector("#download-report"),
};

let latestReport = "";

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function createHoldingCard(holding = {}) {
  const card = document.createElement("article");
  card.className = "holding-card";
  card.innerHTML = `
    <div class="holding-card-heading">
      <h3>Investment</h3>
      <button class="remove-holding" type="button">Remove</button>
    </div>
    <div class="holding-fields">
      <div class="holding-field">
        <label>Stock symbol</label>
        <input name="symbol" type="text" maxlength="12" placeholder="Example: AAPL" required />
      </div>
      <div class="holding-field">
        <label>Business sector</label>
        <input name="sector" type="text" placeholder="Example: Technology" required />
      </div>
      <div class="holding-field">
        <label>Number of shares</label>
        <input name="quantity" type="number" min="0.000001" step="any" placeholder="0" required />
      </div>
      <div class="holding-field">
        <label>Price paid per share ($)</label>
        <input name="purchase_price" type="number" min="0" step="any" placeholder="0.00" required />
      </div>
      <div class="holding-field">
        <label>Purchase date</label>
        <input name="purchase_date" type="date" required />
      </div>
      <div class="holding-field">
        <label>Amount invested</label>
        <div class="calculated-value" data-total>$0.00</div>
      </div>
    </div>
  `;

  for (const [name, value] of Object.entries(holding)) {
    const input = card.querySelector(`[name="${name}"]`);
    if (input) input.value = value;
  }

  card.querySelector(".remove-holding").addEventListener("click", () => {
    card.remove();
    renumberHoldingCards();
    updatePortfolioTotal();
  });

  card.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      if (input.name === "symbol") input.value = input.value.toUpperCase();
      updateHoldingTotal(card);
      updatePortfolioTotal();
    });
  });

  elements.holdingsList.append(card);
  updateHoldingTotal(card);
  renumberHoldingCards();
}

function updateHoldingTotal(card) {
  const quantity = Number(card.querySelector('[name="quantity"]').value) || 0;
  const price = Number(card.querySelector('[name="purchase_price"]').value) || 0;
  card.querySelector("[data-total]").textContent = formatMoney(quantity * price);
}

function renumberHoldingCards() {
  [...elements.holdingsList.children].forEach((card, index) => {
    card.querySelector("h3").textContent = `Investment ${index + 1}`;
  });
}

function collectPortfolio({ validate = true } = {}) {
  const cards = [...elements.holdingsList.querySelectorAll(".holding-card")];
  if (validate && cards.length === 0) {
    throw new Error("Please add at least one investment.");
  }

  return cards.map((card) => {
    const getValue = (name) => card.querySelector(`[name="${name}"]`).value.trim();
    const quantity = Number(getValue("quantity"));
    const purchasePrice = Number(getValue("purchase_price"));

    return {
      symbol: getValue("symbol"),
      sector: getValue("sector"),
      quantity,
      purchase_price: purchasePrice,
      total_invested: quantity * purchasePrice,
      purchase_date: getValue("purchase_date"),
    };
  });
}

function updatePortfolioTotal() {
  const portfolio = collectPortfolio({ validate: false });
  const total = portfolio.reduce((sum, holding) => sum + holding.total_invested, 0);
  elements.portfolioTotal.textContent = formatMoney(total);
}

function loadSample() {
  elements.holdingsList.replaceChildren();
  samplePortfolio.forEach(createHoldingCard);
  updatePortfolioTotal();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderMarkdown(markdown) {
  const escaped = escapeHtml(markdown);
  return escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^(?:- |\* )(.+)$/gm, "<li>$1</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function setLoading(isLoading) {
  elements.analyzeButton.disabled = isLoading;
  elements.emptyState.hidden = true;
  elements.reportView.hidden = true;
  elements.loadingState.hidden = !isLoading;
  elements.error.hidden = true;

  if (isLoading) {
    elements.downloadReport.hidden = true;
  }
}

function showInitialState() {
  elements.emptyState.hidden = false;
  elements.loadingState.hidden = true;
  elements.reportView.hidden = true;
  elements.downloadReport.hidden = true;
  elements.error.hidden = true;
}

function showError(message) {
  elements.loadingState.hidden = true;
  elements.emptyState.hidden = false;
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function showResult(result) {
  latestReport = result.report || result.marketResearch || result.portfolioSummary;
  elements.loadingState.hidden = true;
  elements.reportView.hidden = false;
  elements.portfolioSummary.textContent = result.portfolioSummary || "No portfolio summary.";
  elements.reportContent.innerHTML = renderMarkdown(latestReport);
  elements.reportPath.textContent = `Saved on the server: ${result.outputPath}`;
  elements.downloadReport.hidden = !latestReport;

}

async function checkStatus() {
  try {
    const response = await fetch("/api/status");
    const status = await response.json();
    const ready = status.keys.openAi && status.keys.tavily;
    elements.apiStatus.classList.add(ready ? "ready" : "missing");
    elements.apiStatus.lastChild.textContent = ready
      ? ` Ready - ${status.model}`
      : " Service setup required";
  } catch {
    elements.apiStatus.classList.add("missing");
    elements.apiStatus.lastChild.textContent = " Service unavailable";
  }
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const portfolio = collectPortfolio();
    const query = goalQueries[elements.analysisGoal.value];

    setLoading(true);
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, portfolio }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The analysis failed.");
    }

    showResult(result);
  } catch (error) {
    showError(error.message);
  } finally {
    elements.analyzeButton.disabled = false;
  }
});

elements.loadSample.addEventListener("click", loadSample);
elements.addHolding.addEventListener("click", () => {
  createHoldingCard();
  updatePortfolioTotal();
});

elements.downloadReport.addEventListener("click", () => {
  const blob = new Blob([latestReport], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "portfolio-analysis-report.md";
  link.click();
  URL.revokeObjectURL(link.href);
});

loadSample();
showInitialState();
checkStatus();
