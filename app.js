const STARTING_BALANCE = 20000;
const JOURNAL_KEY = "tradezella_local_journal_v1";
const DATA_KEY = "tradezella_local_trades_v1";
const META_KEY = "tradezella_local_import_meta_v1";
const RULES_KEY = "trading_journal_rules_v1";
const WEBULL_SYNC_COOLDOWN_KEY = "trading_journal_webull_sync_cooldown_until_v1";
const THEME_KEY = "trading_journal_theme_v1";

(function applyInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();

const defaultRules = {
  tradingDays: [1, 2, 3, 4, 5],
  emailReminder: true,
  reminderTime: "21:15",
  startDay: true,
  startTime: "09:30",
  linkPlaybook: true,
  stopLoss: true,
  maxLossTrade: true,
  maxLossTradeValue: 100,
  maxLossDay: true,
  maxLossDayValue: 100,
};

const sampleTrades = [
  ["2025-12-18", "09:34", "SPY", "Long", 100, 472.4, 473.2, 80, 12],
  ["2025-12-19", "10:05", "QQQ", "Short", 80, 403.1, 402.5, 48, 22],
  ["2025-12-22", "11:38", "TSLA", "Long", 25, 238.2, 235.7, -62.5, 46],
  ["2025-12-26", "09:44", "SPY", "Long", 150, 474.1, 473.3, -120, 18],
  ["2025-12-29", "12:11", "NVDA", "Long", 40, 135.2, 136.1, 36, 88],
  ["2026-01-02", "10:14", "SPY", "Short", 120, 471.8, 472.4, -72, 36],
  ["2026-01-05", "09:55", "AMD", "Long", 55, 172.1, 173.6, 82.5, 74],
  ["2026-01-07", "10:33", "QQQ", "Long", 80, 404.8, 403.7, -88, 41],
  ["2026-01-12", "11:22", "SPY", "Long", 100, 470.2, 471.7, 150, 54],
  ["2026-01-15", "09:49", "META", "Short", 10, 612.4, 618.3, -59, 30],
  ["2026-01-20", "13:02", "SPY", "Long", 180, 472.2, 471.5, -126, 64],
  ["2026-01-22", "10:47", "IWM", "Long", 200, 212.2, 212.7, 100, 27],
  ["2026-01-27", "09:37", "SPY", "Short", 130, 476.1, 476.8, -91, 21],
  ["2026-01-30", "12:40", "AAPL", "Long", 45, 187.4, 188.5, 49.5, 105],
  ["2026-02-03", "10:01", "SPY", "Long", 100, 475.5, 474.1, -140, 58],
  ["2026-02-05", "09:42", "SPY", "Short", 100, 473.9, 472.2, 170, 24],
  ["2026-02-06", "10:18", "QQQ", "Long", 60, 405.1, 404.2, -54, 34],
  ["2026-02-10", "11:51", "TSLA", "Short", 20, 244.8, 248.1, -66, 72],
  ["2026-02-12", "13:33", "NVDA", "Long", 55, 133.2, 134.7, 82.5, 96],
  ["2026-02-14", "09:58", "SPY", "Long", 200, 472.4, 471.3, -220, 38],
  ["2026-02-18", "10:27", "SPY", "Short", 150, 469.9, 468.4, 225, 51],
  ["2026-02-20", "14:08", "AMD", "Long", 60, 168.2, 166.7, -90, 124],
  ["2026-02-24", "09:36", "QQQ", "Long", 100, 402.2, 399.4, -280, 19],
  ["2026-02-27", "12:16", "SPY", "Long", 150, 468.5, 469.1, 90, 87],
  ["2026-03-02", "10:07", "IWM", "Short", 180, 209.2, 210.4, -216, 43],
  ["2026-03-04", "09:40", "SPY", "Long", 100, 466.4, 467.2, 80, 16],
  ["2026-03-05", "10:35", "SPY", "Long", 100, 465.8, 466.7, 90, 64],
  ["2026-03-06", "11:18", "META", "Long", 12, 601.2, 594.4, -81.6, 59],
  ["2026-03-09", "09:53", "SPY", "Short", 150, 463.9, 465.2, -195, 22],
  ["2026-03-11", "10:44", "AAPL", "Long", 80, 183.5, 181.8, -136, 82],
  ["2026-03-13", "12:27", "NVDA", "Long", 60, 128.8, 130.2, 84, 126],
  ["2026-03-17", "09:38", "SPY", "Long", 250, 461.2, 459.0, -550, 34],
  ["2026-03-18", "10:31", "TSLA", "Long", 40, 231.4, 228.6, -112, 47],
  ["2026-03-19", "13:14", "QQQ", "Short", 100, 395.2, 393.6, 160, 77],
  ["2026-03-23", "09:45", "SPY", "Long", 300, 458.8, 455.1, -1110, 25],
  ["2026-03-24", "10:06", "SPY", "Short", 200, 454.3, 453.4, 180, 37],
  ["2026-03-26", "11:57", "AMD", "Long", 80, 160.2, 158.0, -176, 118],
  ["2026-03-30", "09:41", "SPY", "Long", 180, 452.5, 451.4, -198, 28],
  ["2026-04-01", "10:24", "QQQ", "Long", 100, 388.2, 386.8, -140, 49],
  ["2026-04-03", "11:12", "NVDA", "Short", 50, 121.6, 119.6, 100, 75],
  ["2026-04-06", "09:56", "SPY", "Long", 250, 449.8, 448.2, -400, 31],
  ["2026-04-07", "10:17", "SPY", "Long", 180, 448.4, 447.1, -234, 45],
  ["2026-04-09", "12:42", "TSLA", "Short", 30, 220.5, 217.3, 96, 112],
  ["2026-04-10", "09:39", "SPY", "Long", 130, 445.2, 443.8, -182, 23],
  ["2026-04-14", "10:02", "AAPL", "Long", 90, 177.4, 178.2, 72, 66],
  ["2026-04-15", "11:31", "SPY", "Short", 140, 444.4, 445.9, -210, 73],
  ["2026-04-17", "09:48", "QQQ", "Long", 110, 382.2, 380.8, -154, 33],
  ["2026-04-21", "10:19", "SPY", "Short", 160, 440.8, 439.9, 144, 29],
  ["2026-04-23", "13:18", "AMD", "Long", 75, 153.6, 151.4, -165, 92],
  ["2026-04-24", "09:43", "SPY", "Long", 120, 439.4, 438.5, -108, 20],
  ["2026-04-27", "10:09", "SPY", "Long", 100, 438.2, 439.6, 140, 36],
  ["2026-04-28", "11:47", "NVDA", "Long", 70, 116.2, 116.9, 49, 98],
  ["2026-04-29", "09:50", "QQQ", "Short", 80, 379.3, 377.7, 128, 42],
  ["2026-04-30", "12:20", "SPY", "Long", 140, 440.1, 439.5, -84, 64],
  ["2026-05-01", "09:36", "SPY", "Long", 110, 441.5, 441.0, -55, 14],
  ["2026-05-04", "10:12", "SPY", "Long", 210, 442.1, 443.2, 231, 47],
  ["2026-05-04", "13:03", "QQQ", "Short", 100, 381.4, 380.5, 90, 83],
  ["2026-05-05", "09:44", "SPY", "Long", 120, 444.0, 443.2, -96, 21],
  ["2026-05-05", "10:22", "SPY", "Short", 140, 443.4, 444.0, -84, 33],
  ["2026-05-05", "11:38", "NVDA", "Long", 60, 118.4, 119.7, 78, 101],
].map((row, index) => createTrade({
  id: `sample-${index + 1}`,
  closeDate: row[0],
  openDate: row[0],
  closeTime: row[1],
  symbol: row[2],
  side: row[3],
  quantity: row[4],
  entryPrice: row[5],
  exitPrice: row[6],
  netPnl: row[7],
  durationMinutes: row[8],
  status: "Closed",
}));

const state = {
  trades: loadTrades(),
  importMeta: loadImportMeta(),
  journals: loadJournals(),
  rules: loadRules(),
  selectedTab: "recent",
  activeView: "dashboard",
  currentMonth: new Date(2026, 4, 1),
  filteredTrades: [],
  activeTradeId: null,
  activeTradeTab: "chart",
  selectedDay: null,
  selectedDayTradeIds: new Set(),
  reportsTab: "days",
  pendingChartImage: null,
};

const els = {
  csvInput: document.querySelector("#csvInput"),
  syncWebullButton: document.querySelector("#syncWebullButton"),
  syncStatus: document.querySelector("#syncStatus"),
  navItems: document.querySelectorAll(".nav-item[data-view]"),
  dashboardView: document.querySelector("#dashboardView"),
  dayView: document.querySelector("#dayView"),
  progressView: document.querySelector("#progressView"),
  tradeView: document.querySelector("#tradeView"),
  journalView: document.querySelector("#journalView"),
  reportsView: document.querySelector("#reportsView"),
  lastImport: document.querySelector("#lastImport"),
  dateRange: document.querySelector("#dateRange"),
  netPnl: document.querySelector("#netPnl"),
  tradeWin: document.querySelector("#tradeWin"),
  profitFactor: document.querySelector("#profitFactor"),
  dayWin: document.querySelector("#dayWin"),
  winLossRatio: document.querySelector("#winLossRatio"),
  avgWinLabel: document.querySelector("#avgWinLabel"),
  avgLossLabel: document.querySelector("#avgLossLabel"),
  avgWinBar: document.querySelector("#avgWinBar"),
  avgLossBar: document.querySelector("#avgLossBar"),
  tradeWinGauge: document.querySelector("#tradeWinGauge"),
  profitGauge: document.querySelector("#profitGauge"),
  dayWinGauge: document.querySelector("#dayWinGauge"),
  radarChart: document.querySelector("#radarChart"),
  zellaScore: document.querySelector("#zellaScore"),
  scoreMarker: document.querySelector("#scoreMarker"),
  progressHeatmap: document.querySelector("#progressHeatmap"),
  todayScore: document.querySelector("#todayScore"),
  todayScoreBar: document.querySelector("#todayScoreBar"),
  cumulativeChart: document.querySelector("#cumulativeChart"),
  dailyBars: document.querySelector("#dailyBars"),
  tradesTable: document.querySelector("#tradesTable"),
  accountChart: document.querySelector("#accountChart"),
  monthLabel: document.querySelector("#monthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  monthlyStats: document.querySelector("#monthlyStats"),
  drawdownChart: document.querySelector("#drawdownChart"),
  setupsTable: document.querySelector("#setupsTable"),
  setupsEmpty: document.querySelector("#setupsEmpty"),
  timeScatter: document.querySelector("#timeScatter"),
  durationScatter: document.querySelector("#durationScatter"),
  journalDialog: document.querySelector("#journalDialog"),
  dayDialog: document.querySelector("#dayDialog"),
  dayDialogTitle: document.querySelector("#dayDialogTitle"),
  dayDialogPnl: document.querySelector("#dayDialogPnl"),
  dayMiniChart: document.querySelector("#dayMiniChart"),
  dayTradeCount: document.querySelector("#dayTradeCount"),
  dayGrossPnl: document.querySelector("#dayGrossPnl"),
  dayWinLoss: document.querySelector("#dayWinLoss"),
  dayCommissions: document.querySelector("#dayCommissions"),
  dayDialogWinRate: document.querySelector("#dayDialogWinRate"),
  dayVolume: document.querySelector("#dayVolume"),
  dayDialogProfitFactor: document.querySelector("#dayDialogProfitFactor"),
  dayTradeRows: document.querySelector("#dayTradeRows"),
  viewDayDetails: document.querySelector("#viewDayDetails"),
  dayInsightsButton: document.querySelector("#dayInsightsButton"),
  insightsDialog: document.querySelector("#insightsDialog"),
  insightDate: document.querySelector("#insightDate"),
  insightPnl: document.querySelector("#insightPnl"),
  insightTrades: document.querySelector("#insightTrades"),
  insightsList: document.querySelector("#insightsList"),
  dayCards: document.querySelector("#dayCards"),
  daySideMonth: document.querySelector("#daySideMonth"),
  daySideCalendar: document.querySelector("#daySideCalendar"),
  dayStartButton: document.querySelector("#dayStartButton"),
  dayRulesButton: document.querySelector("#dayRulesButton"),
  dayTodayButton: document.querySelector("#dayTodayButton"),
  currentStreak: document.querySelector("#currentStreak"),
  periodGauge: document.querySelector("#periodGauge"),
  periodScore: document.querySelector("#periodScore"),
  progressTodayScore: document.querySelector("#progressTodayScore"),
  progressTodayBar: document.querySelector("#progressTodayBar"),
  progressChecklist: document.querySelector("#progressChecklist"),
  progressPageHeatmap: document.querySelector("#progressPageHeatmap"),
  dailyChecklistTitle: document.querySelector("#dailyChecklistTitle"),
  viewProgressDayButton: document.querySelector("#viewProgressDayButton"),
  rulesTable: document.querySelector("#rulesTable"),
  editRulesButton: document.querySelector("#editRulesButton"),
  editRulesTableButton: document.querySelector("#editRulesTableButton"),
  progressTodayButton: document.querySelector("#progressTodayButton"),
  rulesDialog: document.querySelector("#rulesDialog"),
  ruleTradingDays: document.querySelector("#ruleTradingDays"),
  ruleEmailReminder: document.querySelector("#ruleEmailReminder"),
  ruleReminderTime: document.querySelector("#ruleReminderTime"),
  ruleStartDay: document.querySelector("#ruleStartDay"),
  ruleStartTime: document.querySelector("#ruleStartTime"),
  ruleLinkPlaybook: document.querySelector("#ruleLinkPlaybook"),
  ruleStopLoss: document.querySelector("#ruleStopLoss"),
  ruleMaxLossTrade: document.querySelector("#ruleMaxLossTrade"),
  ruleMaxLossTradeValue: document.querySelector("#ruleMaxLossTradeValue"),
  ruleMaxLossDay: document.querySelector("#ruleMaxLossDay"),
  ruleMaxLossDayValue: document.querySelector("#ruleMaxLossDayValue"),
  saveRulesButton: document.querySelector("#saveRulesButton"),
  resetProgressButton: document.querySelector("#resetProgressButton"),
  tradePageDate: document.querySelector("#tradePageDate"),
  tradePageDayStats: document.querySelector("#tradePageDayStats"),
  tradePageList: document.querySelector("#tradePageList"),
  tradeBackButton: document.querySelector("#tradeBackButton"),
  tradeDetailTitle: document.querySelector("#tradeDetailTitle"),
  tradeDetailSubtitle: document.querySelector("#tradeDetailSubtitle"),
  markReviewedButton: document.querySelector("#markReviewedButton"),
  tradeJournalButton: document.querySelector("#tradeJournalButton"),
  tradeStatsCard: document.querySelector("#tradeStatsCard"),
  tradeChartLabel: document.querySelector("#tradeChartLabel"),
  tradingViewFrame: document.querySelector("#tradingViewFrame"),
  executionOverlay: document.querySelector("#executionOverlay"),
  tradeChartPane: document.querySelector("#tradeChartPane"),
  tradeExecutionsPane: document.querySelector("#tradeExecutionsPane"),
  tradeNotesPane: document.querySelector("#tradeNotesPane"),
  tradeRunningPane: document.querySelector("#tradeRunningPane"),
  executionsTable: document.querySelector("#executionsTable"),
  tradeInlineNotes: document.querySelector("#tradeInlineNotes"),
  tradeRunningChart: document.querySelector("#tradeRunningChart"),
  journalSelectedTrade: document.querySelector("#journalSelectedTrade"),
  journalDate: document.querySelector("#journalDate"),
  journalTitle: document.querySelector("#journalTitle"),
  journalPnl: document.querySelector("#journalPnl"),
  journalSide: document.querySelector("#journalSide"),
  journalQty: document.querySelector("#journalQty"),
  journalDuration: document.querySelector("#journalDuration"),
  journalStrategy: document.querySelector("#journalStrategy"),
  journalEmotion: document.querySelector("#journalEmotion"),
  journalNotes: document.querySelector("#journalNotes"),
  journalLesson: document.querySelector("#journalLesson"),
  saveJournal: document.querySelector("#saveJournal"),
  journalChartZone: document.querySelector("#journalChartZone"),
  journalChartFile: document.querySelector("#journalChartFile"),
  journalChartPreview: document.querySelector("#journalChartPreview"),
  journalChartRemove: document.querySelector("#journalChartRemove"),
  deleteJournal: document.querySelector("#deleteJournal"),
  journalSearch: document.querySelector("#journalSearch"),
  journalFilter: document.querySelector("#journalFilter"),
  journalDays: document.querySelector("#journalDays"),
  journalExpandAll: document.querySelector("#journalExpandAll"),
  journalCollapseAll: document.querySelector("#journalCollapseAll"),
  reportsRange: document.querySelector("#reportsRange"),
  reportsStart: document.querySelector("#reportsStart"),
  reportsEnd: document.querySelector("#reportsEnd"),
  reportsBestDay: document.querySelector("#reportsBestDay"),
  reportsBestDayValue: document.querySelector("#reportsBestDayValue"),
  reportsWorstDay: document.querySelector("#reportsWorstDay"),
  reportsWorstDayValue: document.querySelector("#reportsWorstDayValue"),
  reportsActiveDay: document.querySelector("#reportsActiveDay"),
  reportsActiveDayValue: document.querySelector("#reportsActiveDayValue"),
  reportsBestWinDay: document.querySelector("#reportsBestWinDay"),
  reportsBestWinDayValue: document.querySelector("#reportsBestWinDayValue"),
  reportsRangeLabel: document.querySelector("#reportsRangeLabel"),
  reportsStatsGrid: document.querySelector("#reportsStatsGrid"),
  reportsBreakdownChart: document.querySelector("#reportsBreakdownChart"),
  reportsBreakdownLabel: document.querySelector("#reportsBreakdownLabel"),
  reportsBreakdownTable: document.querySelector("#reportsBreakdownTable"),
  journalTotalTrades: document.querySelector("#journalTotalTrades"),
  journaledTrades: document.querySelector("#journaledTrades"),
  journalMissingTrades: document.querySelector("#journalMissingTrades"),
  journaledPnl: document.querySelector("#journaledPnl"),
  toast: document.querySelector("#toast"),
};

bindEvents();
renderRuleControls();
syncMonthToLatestTrade();
ensureImportMeta();
renderImportMeta();
render();
applyInitialRoute();
refreshSyncCooldown();
maybeAutoReconcileWebull();

function createTrade(raw) {
  const closeDate = toDateKey(raw.closeDate || raw.date || raw.closedAt || raw.time);
  const openDate = toDateKey(raw.openDate || raw.openedAt || closeDate);
  const closeTime = normalizeTime(raw.closeTime || raw.time || raw.closedTime);
  const openTimeRaw = raw.openTime || raw.entryTime || raw.openedTime || "";
  const openTime = openTimeRaw ? normalizeTime(openTimeRaw) : "";
  const quantity = number(raw.quantity ?? raw.qty ?? raw.shares ?? raw.size);
  const entryPrice = number(raw.entryPrice ?? raw.entry ?? raw.openPrice ?? raw.price);
  const exitPrice = number(raw.exitPrice ?? raw.exit ?? raw.closePrice ?? raw.price);
  const netPnl = number(raw.netPnl ?? raw.pnl ?? raw.realizedPnl ?? raw["Net P&L"] ?? raw["P&L"]);
  const symbol = String(raw.symbol || raw.ticker || raw.underlying || "SPY").trim().toUpperCase();
  const contract = String(raw.contract || raw.optionSymbol || (isOptionContract(symbol) ? symbol : "")).trim().toUpperCase();
  const option = parseOptionContract(contract);
  const side = normalizeSide(raw.side || raw.direction || raw.action || "Long");
  const durationMinutes = Math.max(1, number(raw.durationMinutes ?? raw.duration ?? raw.minutes) || estimateDuration(closeTime));
  const id = raw.id || `${closeDate}-${closeTime}-${symbol}-${side}-${quantity}-${Math.round(netPnl * 100)}`;
  const exitTime = normalizeTime(raw.exitTime || closeTime);
  const executions = normalizeExecutions(raw.executions, {
    openDate,
    closeDate,
    openTime: openTime || minutesToTime(Math.max(0, timeToMinutes(closeTime) - durationMinutes)),
    closeTime,
    side,
    quantity,
    entryPrice,
    exitPrice,
    netPnl,
  });

  return {
    id,
    closeDate,
    openDate,
    openTime: openTime || executions[0]?.time?.slice(0, 5) || tradeOpenTime({ closeTime, durationMinutes }),
    closeTime,
    exitTime,
    symbol,
    side,
    contract,
    underlying: raw.underlying || option?.underlying || symbol,
    optionType: raw.optionType || option?.type || "",
    expiry: raw.expiry || option?.expiry || "",
    strike: raw.strike || option?.strike || "",
    quantity,
    entryPrice,
    exitPrice,
    grossPnl: number(raw.grossPnl ?? raw.grossPnlValue ?? netPnl),
    commissions: number(raw.commissions ?? raw.fees ?? 0),
    adjustedCost: number(raw.adjustedCost ?? raw.costBasis ?? entryPrice * quantity * (option ? 100 : 1)),
    netPnl,
    durationMinutes,
    executions,
    reviewed: Boolean(raw.reviewed),
    source: raw.source || raw.importSource || "",
    status: raw.status || "Closed",
  };
}

function normalizeExecutions(rawExecutions, fallback) {
  if (Array.isArray(rawExecutions) && rawExecutions.length) {
    return rawExecutions.map((execution, index) => ({
      id: String(execution.id || `execution-${index}`),
      role: execution.role || (index === 0 ? "Entry" : "Exit"),
      date: toDateKey(execution.date || fallback.closeDate),
      time: normalizeExecutionTime(execution.time || fallback.closeTime),
      side: execution.side || (index === 0 ? (fallback.side === "Short" ? "Sell" : "Buy") : (fallback.side === "Short" ? "Buy" : "Sell")),
      quantity: number(execution.quantity ?? execution.qty ?? fallback.quantity),
      price: number(execution.price ?? execution.avgPrice ?? (index === 0 ? fallback.entryPrice : fallback.exitPrice)),
      pnl: execution.pnl === null || execution.pnl === undefined ? null : number(execution.pnl),
      positionIntent: execution.positionIntent || execution.intent || "",
    }));
  }
  return [
    {
      id: "entry",
      role: "Entry",
      date: fallback.openDate,
      time: normalizeExecutionTime(fallback.openTime),
      side: fallback.side === "Short" ? "Sell" : "Buy",
      quantity: fallback.quantity,
      price: fallback.entryPrice,
      pnl: null,
      positionIntent: "ENTRY",
    },
    {
      id: "exit",
      role: "Exit",
      date: fallback.closeDate,
      time: normalizeExecutionTime(fallback.closeTime),
      side: fallback.side === "Short" ? "Buy" : "Sell",
      quantity: fallback.quantity,
      price: fallback.exitPrice,
      pnl: fallback.netPnl,
      positionIntent: "EXIT",
    },
  ];
}

function bindEvents() {
  els.csvInput.addEventListener("change", handleCsvUpload);
  els.syncWebullButton.addEventListener("click", syncWebull);
  const themeToggle = document.querySelector("#themeToggle");
  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
  els.dateRange.addEventListener("change", render);
  els.navItems.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  document.querySelector("#prevMonth").addEventListener("click", () => changeMonth(-1));
  document.querySelector("#nextMonth").addEventListener("click", () => changeMonth(1));
  document.querySelector("#thisMonth").addEventListener("click", () => {
    syncMonthToLatestTrade(state.filteredTrades.filter(isClosedTrade));
    renderCalendar(groupByDate(state.filteredTrades.filter(isClosedTrade)));
  });
  document.querySelector("#startDayButton").addEventListener("click", () => {
    switchView("progress");
    showToast("Daily checklist ready.");
  });
  document.querySelector("#filterButton").addEventListener("click", () => {
    showToast("Filters are wired for date range now. Symbol/setup filters are ready for the next pass.");
  });
  document.querySelector("#dailyChecklistButton").addEventListener("click", () => {
    switchView("progress");
  });
  document.querySelector("#viewMoreProgress").addEventListener("click", () => switchView("progress"));
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.selectedTab = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
      renderTradesTable();
    });
  });
  els.saveJournal.addEventListener("click", saveJournal);

  // Journal chart-screenshot: paste anywhere in the dialog, click zone to upload, drag-and-drop, or remove
  if (els.journalDialog) {
    els.journalDialog.addEventListener("paste", (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          event.preventDefault();
          ingestJournalImageBlob(item.getAsFile());
          return;
        }
      }
    });
  }
  if (els.journalChartZone) {
    els.journalChartZone.addEventListener("click", () => els.journalChartFile?.click());
    els.journalChartZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      els.journalChartZone.classList.add("drop-active");
    });
    els.journalChartZone.addEventListener("dragleave", () => els.journalChartZone.classList.remove("drop-active"));
    els.journalChartZone.addEventListener("drop", (event) => {
      event.preventDefault();
      els.journalChartZone.classList.remove("drop-active");
      const file = event.dataTransfer?.files?.[0];
      if (file) ingestJournalImageBlob(file);
    });
  }
  if (els.journalChartFile) {
    els.journalChartFile.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) ingestJournalImageBlob(file);
      event.target.value = "";
    });
  }
  if (els.journalChartRemove) {
    els.journalChartRemove.addEventListener("click", () => {
      state.pendingChartImage = null;
      renderJournalChart();
    });
  }
  els.deleteJournal.addEventListener("click", deleteJournal);
  els.journalSearch.addEventListener("input", renderJournalPage);
  els.journalFilter.addEventListener("change", renderJournalPage);
  if (els.journalExpandAll) {
    els.journalExpandAll.addEventListener("click", () => {
      els.journalDays?.querySelectorAll(".journal-day-card").forEach((card) => card.classList.remove("collapsed"));
    });
  }
  if (els.journalCollapseAll) {
    els.journalCollapseAll.addEventListener("click", () => {
      els.journalDays?.querySelectorAll(".journal-day-card").forEach((card) => card.classList.add("collapsed"));
    });
  }
  els.dayDialog.addEventListener("close", () => {
    if (location.hash.startsWith("#day=")) history.replaceState(null, "", "#dashboard");
  });
  els.journalSelectedTrade.addEventListener("click", () => {
    const [tradeId] = state.selectedDayTradeIds;
    if (!tradeId) {
      showToast("Select a trade first.");
      return;
    }
    els.dayDialog.close();
    openJournal(tradeId);
  });
  els.viewDayDetails.addEventListener("click", () => {
    const [tradeId] = state.selectedDayTradeIds;
    if (tradeId) {
      els.dayDialog.close();
      openTradeDetail(tradeId);
    } else if (state.selectedDay) {
      els.dayDialog.close();
      switchView("day", { date: state.selectedDay });
    }
  });
  els.dayInsightsButton.addEventListener("click", () => {
    if (state.selectedDay) openDayInsights(state.selectedDay);
  });
  els.dayStartButton.addEventListener("click", () => switchView("progress"));
  els.dayRulesButton.addEventListener("click", openRulesDialog);
  els.dayTodayButton.addEventListener("click", () => {
    syncMonthToLatestTrade(state.filteredTrades.filter(isClosedTrade));
    renderDayPage();
  });
  els.progressTodayButton.addEventListener("click", () => switchView("day"));
  els.editRulesButton.addEventListener("click", openRulesDialog);
  els.editRulesTableButton.addEventListener("click", openRulesDialog);
  els.viewProgressDayButton.addEventListener("click", () => switchView("day"));
  els.saveRulesButton.addEventListener("click", saveRules);
  els.resetProgressButton.addEventListener("click", resetRulesProgress);
  els.tradeBackButton.addEventListener("click", () => switchView("day"));
  els.tradeJournalButton.addEventListener("click", () => {
    if (state.activeTradeId) openJournal(state.activeTradeId);
  });
  els.markReviewedButton.addEventListener("click", markActiveTradeReviewed);
  document.querySelectorAll("[data-trade-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeTradeTab = tab.dataset.tradeTab;
      renderTradeTabs();
    });
  });

  // Reports page wiring
  if (els.reportsRange) {
    els.reportsRange.addEventListener("change", () => {
      const isCustom = els.reportsRange.value === "custom";
      if (els.reportsStart) els.reportsStart.hidden = !isCustom;
      if (els.reportsEnd) els.reportsEnd.hidden = !isCustom;
      renderReportsPage();
    });
  }
  if (els.reportsStart) els.reportsStart.addEventListener("change", renderReportsPage);
  if (els.reportsEnd) els.reportsEnd.addEventListener("change", renderReportsPage);
  document.querySelectorAll(".reports-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".reports-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.reportsTab = tab.dataset.tab;
      renderReportsPage();
    });
  });
}

function switchView(view, options = {}) {
  const nextView = ["dashboard", "day", "progress", "trade", "journal", "reports"].includes(view) ? view : "dashboard";
  state.activeView = nextView;
  if (options.date) state.selectedDay = options.date;
  if (options.tradeId) state.activeTradeId = options.tradeId;
  [els.dashboardView, els.dayView, els.progressView, els.tradeView, els.journalView, els.reportsView].forEach((section) => {
    if (!section) return;
    section.hidden = section.id !== `${state.activeView}View`;
    section.classList.toggle("active-view", !section.hidden);
  });
  els.navItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.activeView);
  });
  if (state.activeView === "day") renderDayPage();
  if (state.activeView === "progress") renderProgressPage();
  if (state.activeView === "trade") renderTradePage();
  if (state.activeView === "journal") renderJournalPage();
  if (state.activeView === "reports") renderReportsPage();
  const hash = state.activeView === "trade" && state.activeTradeId
    ? `#trade=${encodeURIComponent(state.activeTradeId)}`
    : state.activeView === "day" && state.selectedDay
      ? `#dayview=${state.selectedDay}`
      : `#${state.activeView}`;
  if (location.hash !== hash) {
    history.replaceState(null, "", hash);
  }
}

function applyInitialRoute() {
  if (location.hash === "#journal") {
    switchView("journal");
    return;
  }
  const insightsMatch = location.hash.match(/^#insights=(\d{4}-\d{2}-\d{2})$/);
  if (insightsMatch) {
    switchView("dashboard");
    openDayInsights(insightsMatch[1]);
    return;
  }
  const dayMatch = location.hash.match(/^#day=(\d{4}-\d{2}-\d{2})$/);
  if (dayMatch) {
    switchView("dashboard");
    openDayDialog(dayMatch[1]);
  }
  const dayViewMatch = location.hash.match(/^#dayview=(\d{4}-\d{2}-\d{2})$/);
  if (dayViewMatch) {
    switchView("day", { date: dayViewMatch[1] });
    return;
  }
  const tradeMatch = location.hash.match(/^#trade=(.+)$/);
  if (tradeMatch) {
    switchView("trade", { tradeId: decodeURIComponent(tradeMatch[1]) });
    return;
  }
  if (location.hash === "#day") switchView("day");
  if (location.hash === "#progress") switchView("progress");
  if (location.hash === "#trade") switchView("trade");
}

function loadTrades() {
  try {
    const stored = JSON.parse(localStorage.getItem(DATA_KEY) || "null");
    if (Array.isArray(stored) && stored.length) {
      if (looksLikeLegacyWebullImport(stored)) {
        const migrated = buildTradesFromWebullOrders(stored.map(legacyTradeToWebullRow));
        if (migrated.length) {
          persistTrades(migrated);
          return migrated;
        }
      }
      const migratedStored = migrateStoredWebullTimes(stored);
      if (migratedStored.changed) persistTrades(migratedStored.trades.map(createTrade));
      return migratedStored.trades.map(createTrade);
    }
  } catch (error) {
    console.warn(error);
  }
  return sampleTrades;
}

function migrateStoredWebullTimes(trades) {
  let changed = false;
  const migrated = trades.map((trade) => {
    const isOldWebullApi = String(trade.id || "").startsWith("webull-api")
      && !trade.openTime
      && !Array.isArray(trade.executions)
      && trade.closeTime;
    if (!isOldWebullApi) return trade;
    changed = true;
    const closeMinutes = Math.max(0, timeToMinutes(trade.closeTime) - 180);
    const openMinutes = Math.max(0, closeMinutes - (Number(trade.durationMinutes) || 1));
    return {
      ...trade,
      closeTime: minutesToTime(closeMinutes),
      exitTime: minutesToTime(closeMinutes),
      openTime: minutesToTime(openMinutes),
    };
  });
  return { trades: migrated, changed };
}

function loadJournals() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "{}");
  } catch (error) {
    console.warn(error);
    return {};
  }
}

function loadRules() {
  try {
    return { ...defaultRules, ...(JSON.parse(localStorage.getItem(RULES_KEY) || "{}") || {}) };
  } catch (error) {
    console.warn(error);
    return { ...defaultRules };
  }
}

function loadImportMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "null");
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function persistTrades(trades) {
  localStorage.setItem(DATA_KEY, JSON.stringify(trades));
}

function persistImportMeta(meta) {
  state.importMeta = meta;
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function persistJournals() {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(state.journals));
}

function persistRules() {
  localStorage.setItem(RULES_KEY, JSON.stringify(state.rules));
}

function renderImportMeta() {
  const meta = state.importMeta;
  if (!meta) {
    els.lastImport.textContent = "Last import: sample data";
    return;
  }
  const pnlText = money(Number(meta.netPnl || 0));
  const dateRange = meta.firstDate && meta.lastDate ? `${formatShortDate(meta.firstDate)}-${formatShortDate(meta.lastDate)}` : "";
  els.lastImport.innerHTML = `Last import: ${escapeHtml(meta.fileName || "CSV")} - ${meta.tradeCount || 0} closed trades - ${pnlText} ${dateRange ? `- ${dateRange}` : ""} <button class="inline-reset" id="resetData">Reset</button>`;
  document.querySelector("#resetData")?.addEventListener("click", resetToSampleData);
}

function ensureImportMeta() {
  if (state.importMeta || !localStorage.getItem(DATA_KEY)) return;
  const trades = state.trades.filter(isClosedTrade);
  if (!trades.length) return;
  if (looksLikeSampleData(trades)) return;
  persistImportMeta(createImportMeta("stored CSV", [], trades));
}

function looksLikeSampleData(trades) {
  const closed = trades.filter(isClosedTrade);
  if (closed.length !== sampleTrades.length) return false;
  const sampleNet = roundCurrency(sum(sampleTrades.map((trade) => trade.netPnl)));
  const storedNet = roundCurrency(sum(closed.map((trade) => trade.netPnl)));
  if (sampleNet !== storedNet) return false;
  const sampleDates = new Set(sampleTrades.map((trade) => trade.closeDate));
  return closed.every((trade) => sampleDates.has(trade.closeDate));
}

function isClosedTrade(trade) {
  return String(trade.status || "Closed").toLowerCase() !== "open";
}

function handleCsvUpload(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || ""));
      const trades = rowsToTrades(rows);
      if (!trades.length) {
        showToast("No trades found. Check that the CSV has filled rows, dates, symbols, and prices.");
        return;
      }
      state.trades = trades;
      persistTrades(trades);
      persistImportMeta(createImportMeta(file.name, rows, trades));
      renderImportMeta();
      syncMonthToLatestTrade();
      render();
      showToast(`Imported ${trades.length} closed trades. Net P&L ${money(sum(trades.map((trade) => trade.netPnl)))}.`);
    } catch (error) {
      console.error(error);
      showToast("CSV import failed. Try exporting with headers enabled.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function resetToSampleData() {
  state.trades = sampleTrades;
  persistTrades(state.trades);
  localStorage.removeItem(META_KEY);
  state.importMeta = null;
  renderImportMeta();
  syncMonthToLatestTrade();
  render();
  showToast("Sample data restored.");
}

async function syncWebull() {
  const cooldownRemaining = getSyncCooldownRemaining();
  if (cooldownRemaining > 0) {
    const message = `Webull is rate-limiting sync. Try again in ${formatDuration(cooldownRemaining)}.`;
    setSyncStatus(message, "error");
    showToast(message);
    refreshSyncCooldown();
    return;
  }
  setSyncStatus("Syncing Webull orders...", "ok");
  els.syncWebullButton.disabled = true;
  els.syncWebullButton.classList.add("syncing");
  try {
    const response = await fetch("/api/webull/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merge: true }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      if (payload.retryAfterSeconds) {
        setSyncCooldown(Number(payload.retryAfterSeconds));
      }
      throw new Error(payload.error || `Sync failed with HTTP ${response.status}`);
    }

    if (payload.rateLimited && payload.retryAfterSeconds) {
      setSyncCooldown(Number(payload.retryAfterSeconds));
    }

    const trades = Array.isArray(payload.trades) && payload.trades.length
      ? payload.trades.map((trade) => createTrade({ ...trade, source: payload.source || "Webull API" }))
      : rowsToTrades(payload.rows || []);
    if (!trades.length) {
      const warningText = formatSyncWarnings(payload.warnings || []);
      const baseMessage = payload.rateLimited
        ? "Webull rate-limited before any trades synced. Earlier ranges will retry after the cooldown."
        : "Webull sync returned no filled/closed trades yet.";
      setSyncStatus(warningText ? `${baseMessage} ${warningText}` : baseMessage, payload.rateLimited || warningText ? "error" : "ok");
      showToast(payload.rateLimited
        ? "Webull rate-limited; no new trades this attempt."
        : (warningText ? "Webull sync completed with skipped windows." : "Webull sync completed with no closed trades."));
      return;
    }

    const merged = payload.source === "Webull API"
      ? mergeWebullTrades(state.trades, trades, {
        startDate: payload.startDate || "",
        endDate: payload.endDate || "",
        ranges: payload.syncedDateRanges || [],
      })
      : mergeTrades(state.trades, trades);
    state.trades = merged;
    persistTrades(merged);
    persistImportMeta({
      fileName: "Webull API sync",
      source: payload.source || "Webull API",
      rowCount: payload.rowCount || payload.rows?.length || 0,
      tradeCount: merged.filter(isClosedTrade).length,
      netPnl: roundCurrency(sum(merged.filter(isClosedTrade).map((trade) => trade.netPnl))),
      firstDate: merged.map((trade) => trade.closeDate).sort()[0] || "",
      lastDate: merged.map((trade) => trade.closeDate).sort().at(-1) || "",
      importedAt: new Date().toISOString(),
      lastSync: payload.syncedAt || new Date().toISOString(),
      syncStartDate: payload.startDate || "",
      syncEndDate: payload.endDate || "",
      syncedDateRanges: payload.syncedDateRanges || [],
      warnings: payload.warnings || [],
      accountBalance: payload.accountBalance || state.importMeta?.accountBalance || null,
      reconcilerVersion: 4,
    });
    renderImportMeta();
    syncMonthToLatestTrade();
    render();
    const warningText = formatSyncWarnings(payload.warnings || []);
    const syncedText = payload.rateLimited
      ? `Webull sync imported ${trades.length} closed trades before rate limit (${payload.rawOrderCount || 0} raw orders). Older ranges will retry after the cooldown.`
      : `Webull sync imported ${trades.length} closed trades (${payload.rawOrderCount || 0} raw orders).`;
    const tone = payload.rateLimited || warningText ? "error" : "ok";
    setSyncStatus(warningText ? `${syncedText} ${warningText}` : syncedText, tone);
    showToast(syncedText);
  } catch (error) {
    const message = String(error.message || error);
    setSyncStatus(webullSyncFailureMessage(message), "error");
    showToast("Webull sync failed. Check the status line.");
  } finally {
    if (getSyncCooldownRemaining() <= 0) els.syncWebullButton.disabled = false;
    els.syncWebullButton.classList.remove("syncing");
  }
}

function setSyncStatus(message, tone = "") {
  els.syncStatus.className = `sync-status ${tone}`.trim();
  els.syncStatus.innerHTML = message ? `<strong>Sync:</strong> ${escapeHtml(message)}` : "";
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch {}
}

function webullSyncFailureMessage(message) {
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Cannot reach the local sync server. Start it with python server.py, then retry.";
  }
  if (/missing WEBULL_APP_KEY|missing WEBULL_APP_SECRET/i.test(message)) {
    return `${message}. Add your Webull keys to .env and restart python server.py.`;
  }
  return message;
}

function formatSyncWarnings(warnings) {
  if (!Array.isArray(warnings) || !warnings.length) return "";
  const visible = warnings.slice(0, 2).map((warning) => String(warning)).join(" ");
  const extra = warnings.length > 2 ? ` ${warnings.length - 2} more skipped windows.` : "";
  return `${visible}${extra}`;
}

function setSyncCooldown(seconds) {
  const cooldownSeconds = Math.max(30, Math.min(600, Math.ceil(seconds || 0)));
  localStorage.setItem(WEBULL_SYNC_COOLDOWN_KEY, String(Date.now() + cooldownSeconds * 1000));
  refreshSyncCooldown();
}

function getSyncCooldownRemaining() {
  const until = Number(localStorage.getItem(WEBULL_SYNC_COOLDOWN_KEY) || 0);
  const remaining = Math.ceil((until - Date.now()) / 1000);
  if (remaining <= 0) {
    localStorage.removeItem(WEBULL_SYNC_COOLDOWN_KEY);
    return 0;
  }
  return remaining;
}

function refreshSyncCooldown() {
  const remaining = getSyncCooldownRemaining();
  if (!remaining) {
    els.syncWebullButton.disabled = false;
    return;
  }
  els.syncWebullButton.disabled = true;
  setSyncStatus(`Webull is rate-limiting sync. Try again in ${formatDuration(remaining)}.`, "error");
  window.clearTimeout(state.syncCooldownTimer);
  state.syncCooldownTimer = window.setTimeout(refreshSyncCooldown, 1000);
}

function formatDuration(seconds) {
  const wholeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  if (!minutes) return `${remainder}s`;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function maybeAutoReconcileWebull() {
  const meta = state.importMeta;
  if (getSyncCooldownRemaining() > 0) return;
  if (!meta || meta.source !== "Webull API" || meta.reconcilerVersion === 4) return;
  window.setTimeout(() => syncWebull(), 350);
}

function mergeTrades(existing, incoming) {
  const map = new Map(existing.map((trade) => [trade.id, createTrade(trade)]));
  incoming.forEach((trade) => map.set(trade.id, createTrade(trade)));
  return [...map.values()].sort((a, b) => `${a.closeDate} ${a.closeTime}`.localeCompare(`${b.closeDate} ${b.closeTime}`));
}

function mergeWebullTrades(existing, incoming, syncWindow = {}) {
  const cleanedExisting = removeSampleTrades(existing);
  if (looksLikeSampleData(existing) || !cleanedExisting.length) {
    return mergeTrades([], incoming.map((trade) => ({ ...trade, source: "Webull API" })));
  }
  const incomingDates = new Set(incoming.map((trade) => trade.closeDate));
  transferJournalsToIncomingTrades(cleanedExisting, incoming);
  const retained = cleanedExisting.filter((trade) => {
    if (isDateInSyncWindow(trade.closeDate, syncWindow)) return false;
    return !incomingDates.has(trade.closeDate);
  });
  return mergeTrades(retained, incoming.map((trade) => ({ ...trade, source: "Webull API" })));
}

function isDateInSyncWindow(date, syncWindow = {}) {
  if (Array.isArray(syncWindow.ranges) && syncWindow.ranges.length) {
    return syncWindow.ranges.some((range) => date >= range.startDate && date <= range.endDate);
  }
  if (!date || !syncWindow.startDate || !syncWindow.endDate) return false;
  return date >= syncWindow.startDate && date <= syncWindow.endDate;
}

function removeSampleTrades(trades) {
  const sampleSignatures = new Set(sampleTrades.map(sampleTradeSignature));
  return trades.filter((trade) => !sampleSignatures.has(sampleTradeSignature(trade)));
}

function sampleTradeSignature(trade) {
  return [
    trade.closeDate,
    trade.closeTime,
    trade.symbol,
    trade.side,
    Math.round(number(trade.quantity) * 1000),
    Math.round(number(trade.netPnl) * 100),
  ].join("|");
}

function transferJournalsToIncomingTrades(existing, incoming) {
  const journalBySignature = new Map();
  existing.forEach((trade) => {
    if (hasJournalEntry(trade.id)) journalBySignature.set(tradeSignature(trade), state.journals[trade.id]);
  });
  let changed = false;
  incoming.forEach((trade) => {
    const journal = journalBySignature.get(tradeSignature(trade));
    if (journal && !state.journals[trade.id]) {
      state.journals[trade.id] = journal;
      changed = true;
    }
  });
  if (changed) persistJournals();
}

function tradeSignature(trade) {
  return [
    trade.closeDate,
    trade.contract || trade.symbol,
    trade.openTime || tradeOpenTime(trade),
    trade.exitTime || trade.closeTime,
    Math.round(number(trade.quantity) * 1000),
    Math.round(number(trade.netPnl) * 100),
  ].join("|");
}

function rowsToTrades(rows) {
  if (isWebullOptionOrdersExport(rows)) {
    return buildTradesFromWebullOrders(rows);
  }
  return rows.map(normalizeCsvRow).map(createTrade).filter((trade) => trade.closeDate && trade.symbol);
}

function createImportMeta(fileName, rows, trades) {
  const sortedDates = trades.map((trade) => trade.closeDate).sort();
  return {
    fileName,
    source: isWebullOptionOrdersExport(rows) ? "Webull option orders" : "CSV trades",
    rowCount: rows.length,
    tradeCount: trades.length,
    netPnl: roundCurrency(sum(trades.map((trade) => trade.netPnl))),
    firstDate: sortedDates[0] || "",
    lastDate: sortedDates.at(-1) || "",
    importedAt: new Date().toISOString(),
  };
}

function normalizeCsvRow(row) {
  const closeDateValue = pickValue(row, "Close Date", "Closed Date", "Date", "Filled Time", "Filled Time(ET)", "Time", "Trade Date");
  const timeValue = pickValue(row, "Close Time", "Time", "Filled Time", "Filled Time(ET)", "Order Time");
  const pnlValue = pickValue(row, "Net P&L", "P&L", "Realized P&L", "Realized Profit/Loss", "Profit/Loss", "Net Profit", "Realized P/L");
  const priceValue = pickValue(row, "Avg Price", "Price", "Fill Price");
  return {
    id: pickValue(row, "ID", "Order ID", "Trade ID", "Transaction ID"),
    closeDate: closeDateValue,
    openDate: pickValue(row, "Open Date", "Open Time", "Trade Date") || closeDateValue,
    closeTime: timeValue,
    symbol: pickValue(row, "Symbol", "Ticker", "Underlying", "Instrument"),
    side: pickValue(row, "Side", "Action", "Direction", "Position"),
    quantity: pickValue(row, "Quantity", "Qty", "Shares", "Filled Qty", "Size"),
    entryPrice: pickValue(row, "Entry Price", "Open Price", "Average Open Price", "Buy Price") || priceValue,
    exitPrice: pickValue(row, "Exit Price", "Close Price", "Average Close Price", "Sell Price") || priceValue,
    netPnl: pnlValue,
    durationMinutes: pickValue(row, "Duration", "Duration Minutes", "Hold Time", "Minutes"),
    status: pickValue(row, "Status") || "Closed",
  };
}

function isWebullOptionOrdersExport(rows) {
  if (!rows.length) return false;
  const sample = rows.find((row) => Object.keys(row).length) || rows[0];
  const hasWebullHeaders = ["Symbol", "Side", "Status", "Filled", "Avg Price", "Filled Time"]
    .every((name) => pickValue(sample, name) !== "" || Object.keys(sample).some((key) => normalizeHeader(key) === normalizeHeader(name)));
  return hasWebullHeaders && rows.some((row) => isOptionContract(pickValue(row, "Symbol", "Name")));
}

function buildTradesFromWebullOrders(rows) {
  const fills = rows.map((row, index) => {
    const contract = String(pickValue(row, "Symbol", "Name", "Instrument")).trim().toUpperCase();
    const option = parseOptionContract(contract);
    const filledAt = parseBrokerDateTime(pickValue(row, "Filled Time", "Filled Time(ET)", "Time"));
    const status = String(pickValue(row, "Status") || "Filled").trim().toLowerCase();
    const quantity = number(pickValue(row, "Filled", "Filled Qty", "Quantity", "Qty", "Total Qty"));
    const price = number(pickValue(row, "Avg Price", "Average Price", "Price", "Fill Price"));
    const sideText = String(pickValue(row, "Side", "Action")).trim().toLowerCase();
    const side = sideText.includes("sell") || sideText === "short" ? "Sell" : "Buy";
    return {
      index,
      contract,
      underlying: option?.underlying || contract,
      optionType: option?.type || "",
      expiry: option?.expiry || "",
      strike: option?.strike || "",
      side,
      status,
      quantity,
      price,
      filledAt,
      orderId: pickValue(row, "Order ID", "Order Id", "ID") || `fill-${index}`,
      positionIntent: pickValue(row, "Position Intent", "PositionIntent"),
      multiplier: option ? 100 : 1,
    };
  }).filter((fill) => fill.contract && fill.filledAt && fill.quantity > 0 && fill.price > 0 && fill.status === "filled");

  const positions = new Map();
  const trades = [];
  fills.sort((a, b) => a.filledAt - b.filledAt || a.index - b.index);

  fills.forEach((fill) => {
    let signedQuantity = fill.side === "Buy" ? fill.quantity : -fill.quantity;
    while (Math.abs(signedQuantity) > 0.000001) {
      let position = positions.get(fill.contract);
      if (!position || Math.abs(position.quantity) < 0.000001) {
        positions.set(fill.contract, openWebullPosition(fill, signedQuantity));
        signedQuantity = 0;
        continue;
      }

      if (Math.sign(position.quantity) === Math.sign(signedQuantity)) {
        addToWebullPosition(position, fill, signedQuantity);
        signedQuantity = 0;
        continue;
      }

      const closingQuantity = Math.min(Math.abs(signedQuantity), Math.abs(position.quantity));
      closeWebullPositionPart(position, fill, closingQuantity);
      position.quantity += Math.sign(signedQuantity) * closingQuantity;
      signedQuantity -= Math.sign(signedQuantity) * closingQuantity;

      if (Math.abs(position.quantity) < 0.000001) {
        trades.push(createWebullTrade(position, fill, trades.length));
        positions.delete(fill.contract);
      }
    }
  });

  return trades.sort((a, b) => `${a.closeDate} ${a.closeTime}`.localeCompare(`${b.closeDate} ${b.closeTime}`));
}

function openWebullPosition(fill, signedQuantity) {
  return {
    contract: fill.contract,
    symbol: fill.underlying,
    underlying: fill.underlying,
    optionType: fill.optionType,
    expiry: fill.expiry,
    strike: fill.strike,
    side: signedQuantity > 0 ? "Long" : "Short",
    quantity: signedQuantity,
    openedAt: fill.filledAt,
    entryNotional: Math.abs(signedQuantity) * fill.price,
    entryExecutions: [makeWebullExecution(fill, Math.abs(signedQuantity), "Entry")],
    exitExecutions: [],
    realizedPnl: 0,
    closedQuantity: 0,
    entryClosedNotional: 0,
    exitNotional: 0,
    multiplier: fill.multiplier,
  };
}

function addToWebullPosition(position, fill, signedQuantity) {
  position.entryNotional += Math.abs(signedQuantity) * fill.price;
  position.quantity += signedQuantity;
  position.entryExecutions.push(makeWebullExecution(fill, Math.abs(signedQuantity), "Entry"));
}

function closeWebullPositionPart(position, fill, closingQuantity) {
  const averageEntry = position.entryNotional / Math.abs(position.quantity);
  const direction = position.quantity > 0 ? 1 : -1;
  const pnl = direction > 0
    ? (fill.price - averageEntry) * closingQuantity * position.multiplier
    : (averageEntry - fill.price) * closingQuantity * position.multiplier;
  position.realizedPnl += pnl;
  position.closedQuantity += closingQuantity;
  position.entryClosedNotional += averageEntry * closingQuantity;
  position.exitNotional += fill.price * closingQuantity;
  position.entryNotional -= averageEntry * closingQuantity;
  position.exitExecutions.push(makeWebullExecution(fill, closingQuantity, "Exit", pnl));
}

function createWebullTrade(position, closingFill, index) {
  const entryPrice = position.entryClosedNotional / Math.max(1, position.closedQuantity);
  const exitPrice = position.exitNotional / Math.max(1, position.closedQuantity);
  return createTrade({
    id: `webull-${position.contract}-${position.openedAt.getTime()}-${closingFill.filledAt.getTime()}-${index}`,
    openDate: toDateKey(position.openedAt),
    openTime: formatTime(position.openedAt),
    closeDate: toDateKey(closingFill.filledAt),
    closeTime: formatTime(closingFill.filledAt),
    exitTime: formatTime(closingFill.filledAt),
    symbol: position.symbol,
    contract: position.contract,
    underlying: position.underlying,
    optionType: position.optionType,
    expiry: position.expiry,
    strike: position.strike,
    side: position.side,
    quantity: position.closedQuantity,
    entryPrice,
    exitPrice,
    grossPnl: roundCurrency(position.realizedPnl),
    commissions: 0,
    adjustedCost: roundCurrency(position.entryClosedNotional * position.multiplier),
    netPnl: roundCurrency(position.realizedPnl),
    durationMinutes: Math.max(1, Math.round((closingFill.filledAt - position.openedAt) / 60000)),
    executions: [...position.entryExecutions, ...position.exitExecutions],
    status: "Closed",
  });
}

function makeWebullExecution(fill, quantity, role, pnl = null) {
  return {
    id: fill.orderId || `${fill.contract}-${fill.index}-${role}`,
    role,
    date: toDateKey(fill.filledAt),
    time: `${formatTime(fill.filledAt)}:00`,
    side: fill.side,
    quantity,
    price: fill.price,
    pnl: pnl === null ? null : roundCurrency(pnl),
    positionIntent: fill.positionIntent,
  };
}

function render() {
  state.filteredTrades = applyDateRange(state.trades);
  const closedTrades = state.filteredTrades.filter(isClosedTrade);
  const daily = groupByDate(closedTrades);
  const stats = computeStats(closedTrades, daily);

  renderMetrics(stats);
  renderRadar(stats);
  renderHeatmap(daily);
  renderLineChart(els.cumulativeChart, buildCumulativeSeries(daily), { mode: "cumulative", color: "#8f82d9", fill: "red" });
  renderBarChart(els.dailyBars, daily);
  renderTradesTable();
  const accountSeries = buildAccountSeries(daily);
  const accountBaseline = accountSeries.startingBalance ?? STARTING_BALANCE;
  renderLineChart(els.accountChart, accountSeries.points, { mode: "account", color: "#8f82d9", redLine: accountBaseline });
  renderCalendar(daily);
  renderSetups(closedTrades);
  renderLineChart(els.drawdownChart, buildDrawdownSeries(daily), { mode: "drawdown", color: "#8f82d9", fill: "red" });
  renderScatter(els.timeScatter, closedTrades, "time");
  renderScatter(els.durationScatter, closedTrades, "duration");
  if (state.activeView === "day") renderDayPage();
  if (state.activeView === "progress") renderProgressPage();
  if (state.activeView === "trade") renderTradePage();
  renderJournalPage();
  if (state.selectedDay && els.dayDialog.open) openDayDialog(state.selectedDay);
}

function renderMetrics(stats) {
  els.netPnl.textContent = money(stats.netPnl);
  els.netPnl.classList.toggle("negative", stats.netPnl < 0);
  els.netPnl.classList.toggle("positive", stats.netPnl >= 0);
  els.tradeWin.textContent = `${stats.tradeWinRate.toFixed(2)}%`;
  els.profitFactor.textContent = stats.profitFactor.toFixed(2);
  els.dayWin.textContent = `${stats.dayWinRate.toFixed(2)}%`;
  els.winLossRatio.textContent = stats.winLossRatio.toFixed(2);
  els.avgWinLabel.textContent = money(stats.avgWin);
  els.avgLossLabel.textContent = money(stats.avgLoss);

  const totalAvg = Math.abs(stats.avgWin) + Math.abs(stats.avgLoss) || 1;
  els.avgWinBar.style.width = `${Math.max(8, Math.abs(stats.avgWin) / totalAvg * 100)}%`;
  els.avgLossBar.style.width = `${Math.max(8, Math.abs(stats.avgLoss) / totalAvg * 100)}%`;

  renderMiniGauge(els.tradeWinGauge, stats.tradeWinRate / 100);
  renderDonutGauge(els.profitGauge, Math.min(stats.profitFactor / 2, 1));
  renderMiniGauge(els.dayWinGauge, stats.dayWinRate / 100);

  els.zellaScore.textContent = stats.zellaScore.toFixed(1);
  els.scoreMarker.style.left = `calc(${clamp(stats.zellaScore, 0, 100)}% - 1px)`;
  const todayRating = Math.max(1, Math.min(5, Math.round(stats.todayScore)));
  els.todayScore.textContent = `${todayRating}/5`;
  els.todayScoreBar.style.width = `${todayRating * 20}%`;
}

function renderRadar(stats) {
  const labels = ["Win %", "Profit factor", "Avg win/loss", "Recovery factor", "Max drawdown", "Consistency"];
  const values = [
    stats.tradeWinRate / 100,
    Math.min(stats.profitFactor / 2, 1),
    Math.min(stats.winLossRatio / 2, 1),
    clamp(stats.recoveryFactor / 2, 0, 1),
    clamp(1 - Math.abs(stats.maxDrawdown) / Math.max(1000, Math.abs(stats.grossLoss)), 0, 1),
    stats.consistency,
  ];
  const width = 360;
  const height = 220;
  const cx = width / 2;
  const cy = height / 2 + 2;
  const radius = 72;
  const levels = [0.25, 0.5, 0.75, 1];
  const points = values.map((value, index) => polarPoint(cx, cy, radius * value, index, labels.length));
  const grid = levels.map((level) => {
    const poly = labels.map((_, index) => polarPoint(cx, cy, radius * level, index, labels.length));
    return `<polygon points="${poly.map(pointString).join(" ")}" fill="none" stroke="#ded9e8" stroke-width="1"/>`;
  }).join("");
  const spokes = labels.map((label, index) => {
    const end = polarPoint(cx, cy, radius, index, labels.length);
    const text = polarPoint(cx, cy, radius + 33, index, labels.length);
    return `<line x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}" stroke="#e5e0eb"/>
      <text x="${text.x}" y="${text.y}" text-anchor="middle" dominant-baseline="middle" class="axis-label">${label}</text>`;
  }).join("");
  els.radarChart.innerHTML = `<svg class="radar-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Performance score radar">
    ${grid}
    ${spokes}
    <polygon points="${points.map(pointString).join(" ")}" fill="rgba(94, 78, 214, .22)" stroke="#6f61d9" stroke-width="2"/>
    ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3" fill="#6f61d9"/>`).join("")}
  </svg>`;
}

function renderHeatmap(daily) {
  renderHeatmapInto(els.progressHeatmap, daily, 146);
}

function renderHeatmapInto(container, daily, lookbackDays = 146) {
  const sortedDates = Object.keys(daily).sort();
  const end = sortedDates.length ? parseDateKey(sortedDates.at(-1)) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - lookbackDays);
  const monthLabels = new Map();
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    days.push(date);
    if (date.getDate() <= 7) monthLabels.set(days.length - 1, monthShort(date));
  }

  const weeks = [];
  while (days.length) weeks.push(days.splice(0, 7));
  const cellSize = container.classList.contains("heatmap-wide") ? 22 : 14;
  container.style.gridTemplateColumns = `34px repeat(${weeks.length}, ${cellSize}px)`;
  container.style.gridAutoRows = `${cellSize}px`;
  const rows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let html = `<div></div>`;
  weeks.forEach((week, weekIndex) => {
    html += `<div class="month-label">${monthLabels.get(weekIndex * 7) || ""}</div>`;
  });
  rows.forEach((label, rowIndex) => {
    html += `<div class="day-label">${label}</div>`;
    weeks.forEach((week) => {
      const date = week[rowIndex];
      if (!date) {
        html += `<div></div>`;
        return;
      }
      const key = toDateKey(date);
      const pnl = daily[key]?.pnl || 0;
      const count = daily[key]?.trades.length || 0;
      const intensity = count ? Math.min(4, Math.ceil(Math.abs(pnl) / 250) || 1) : 0;
      const className = pnl < 0 ? "heat-loss" : intensity ? `heat-${intensity}` : "";
      html += `<div class="heat-cell ${className}" title="${formatShortDate(key)} ${money(pnl)}"></div>`;
    });
  });
  container.innerHTML = html;
}

function renderTradesTable() {
  const rows = [...state.filteredTrades]
    .filter((trade) => state.selectedTab === "open" ? trade.status.toLowerCase() === "open" : trade.status.toLowerCase() !== "open")
    .sort((a, b) => `${b.closeDate} ${b.closeTime}`.localeCompare(`${a.closeDate} ${a.closeTime}`))
    .slice(0, 9);

  if (!rows.length) {
    els.tradesTable.innerHTML = `<tr><td colspan="4">No ${state.selectedTab === "open" ? "open positions" : "closed trades"} found.</td></tr>`;
    return;
  }

  els.tradesTable.innerHTML = rows.map((trade) => {
    const hasJournal = Boolean(state.journals[trade.id]?.notes || state.journals[trade.id]?.strategy);
    return `<tr data-trade-id="${escapeHtml(trade.id)}">
      <td>${formatShortDate(trade.closeDate)}</td>
      <td title="${escapeHtml(trade.contract || trade.symbol)}">${escapeHtml(displaySymbol(trade))}</td>
      <td class="${trade.netPnl >= 0 ? "positive" : "negative"}">${money(trade.netPnl)}</td>
      <td><button class="journal-button ${hasJournal ? "has-journal" : ""}" data-trade-id="${escapeHtml(trade.id)}">${hasJournal ? "Edit" : "Journal"}</button></td>
    </tr>`;
  }).join("");

  els.tradesTable.querySelectorAll(".journal-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openJournal(button.dataset.tradeId);
    });
  });
  els.tradesTable.querySelectorAll("tr[data-trade-id]").forEach((row) => {
    row.addEventListener("click", () => openTradeDetail(row.dataset.tradeId));
  });
}

function renderCalendar(daily) {
  const monthDate = state.currentMonth;
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  els.monthLabel.textContent = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  const monthTrades = state.filteredTrades.filter((trade) => isClosedTrade(trade)).filter((trade) => {
    const date = parseDateKey(trade.closeDate);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const monthPnl = sum(monthTrades.map((trade) => trade.netPnl));
  const monthDays = groupByDate(monthTrades);
  const dayCount = Object.keys(monthDays).length;
  els.monthlyStats.innerHTML = `Monthly stats: <b class="${monthPnl >= 0 ? "positive" : "negative"}">${money(monthPnl)}</b> <span>${dayCount} days</span>`;

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let html = weekdays.map((day) => `<div class="weekday">${day}</div>`).join("") + `<div class="weekday">Week</div>`;
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const totalDays = first.getDay() + last.getDate();
  const weekCount = Math.ceil(totalDays / 7);

  for (let week = 0; week < weekCount; week++) {
    const weekTrades = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + week * 7 + day);
      const isCurrentMonth = date.getMonth() === month && date.getFullYear() === year;
      if (!isCurrentMonth) {
        html += `<div class="calendar-day calendar-day-blank" aria-hidden="true"></div>`;
        continue;
      }
      const key = toDateKey(date);
      const info = daily[key] || { pnl: 0, trades: [] };
      weekTrades.push(...info.trades);
      const resultClass = info.pnl > 0 ? "day-win" : info.pnl < 0 ? "day-loss" : "";
      const result = info.trades.length ? `<div class="day-result ${info.pnl >= 0 ? "positive" : "negative"}">
          <strong>${money(info.pnl)}</strong>
          <span>${info.trades.length} trades</span>
        </div>` : "";
      html += `<button type="button" class="calendar-day ${resultClass} ${info.trades.length ? "" : "no-trades"}" data-date="${key}" ${info.trades.length ? "" : "disabled"}>
        <span class="day-number">${date.getDate()}</span>
        ${result}
      </button>`;
    }
    const weekPnl = sum(weekTrades.map((trade) => trade.netPnl));
    html += `<div class="week-summary">
      <span>Week ${week + 1}</span>
      <strong class="${weekPnl >= 0 ? "positive" : "negative"}">${money(roundCurrency(weekPnl))}</strong>
      <span>${weekTrades.length} trades</span>
    </div>`;
  }

  els.calendarGrid.innerHTML = html;
  els.calendarGrid.querySelectorAll(".calendar-day[data-date]:not(.no-trades)").forEach((button) => {
    button.addEventListener("click", () => openDayDialog(button.dataset.date));
  });
}

function openDayDialog(dateKey) {
  const trades = state.filteredTrades
    .filter(isClosedTrade)
    .filter((trade) => trade.closeDate === dateKey)
    .sort((a, b) => timeToMinutes(a.closeTime) - timeToMinutes(b.closeTime));
  if (!trades.length) return;

  state.selectedDay = dateKey;
  state.selectedDayTradeIds = new Set([trades[0].id]);
  const pnl = sum(trades.map((trade) => trade.netPnl));
  const wins = trades.filter((trade) => trade.netPnl > 0);
  const losses = trades.filter((trade) => trade.netPnl < 0);
  const grossWin = sum(wins.map((trade) => trade.netPnl));
  const grossLoss = sum(losses.map((trade) => trade.netPnl));
  const grossPnl = sum(trades.map((trade) => trade.grossPnl ?? trade.netPnl));
  const volume = sum(trades.map((trade) => Math.abs(number(trade.quantity))));
  const commissions = sum(trades.map((trade) => number(trade.commissions)));
  const profitFactor = grossLoss ? Math.abs(grossWin / grossLoss) : grossWin ? 99 : 0;

  els.dayDialogTitle.textContent = weekdayDate(dateKey);
  els.dayDialogPnl.textContent = `Net P&L ${money(pnl)}`;
  els.dayDialogPnl.className = pnl >= 0 ? "positive" : "negative";
  els.dayTradeCount.textContent = String(trades.length);
  els.dayGrossPnl.textContent = money(grossPnl);
  els.dayGrossPnl.className = grossPnl >= 0 ? "positive" : "negative";
  els.dayWinLoss.textContent = `${wins.length} / ${losses.length}`;
  els.dayCommissions.textContent = money(commissions);
  els.dayDialogWinRate.textContent = `${(wins.length / trades.length * 100).toFixed(2)}%`;
  els.dayVolume.textContent = volume.toLocaleString("en-US", { maximumFractionDigits: 2 });
  els.dayDialogProfitFactor.textContent = profitFactor >= 99 ? "99+" : profitFactor.toFixed(2);
  renderDayMiniChart(trades);
  renderDayTradeRows(trades);
  if (location.hash !== `#day=${dateKey}`) {
    history.replaceState(null, "", `#day=${dateKey}`);
  }
  if (!els.dayDialog.open) els.dayDialog.showModal();
}

function renderDayTradeRows(trades) {
  const datalistId = "day-setup-suggestions";
  const tagOptions = knownSetups()
    .map((tag) => `<option value="${escapeHtml(tag)}"></option>`)
    .join("");
  els.dayTradeRows.innerHTML = trades.map((trade) => {
    const journal = state.journals[trade.id] || {};
    const checked = state.selectedDayTradeIds.has(trade.id) ? "checked" : "";
    return `<tr data-trade-id="${escapeHtml(trade.id)}">
      <td><input class="trade-select" type="checkbox" ${checked} data-trade-id="${escapeHtml(trade.id)}" aria-label="Select ${escapeHtml(displaySymbol(trade))}"></td>
      <td>${tradeOpenTime(trade)}</td>
      <td title="${escapeHtml(trade.contract || trade.symbol)}">${escapeHtml(displayInstrument(trade))}</td>
      <td>${escapeHtml(trade.optionType || trade.side)}</td>
      <td><span class="ticker-pill">${escapeHtml(trade.underlying || trade.symbol)}</span></td>
      <td class="${trade.netPnl >= 0 ? "positive" : "negative"}">${money(trade.netPnl)}</td>
      <td><input class="setup-tag-input" type="text" list="${datalistId}" placeholder="tag setup..." value="${escapeHtml(journal.strategy || "")}" data-trade-id="${escapeHtml(trade.id)}" aria-label="Setup tag for ${escapeHtml(displaySymbol(trade))}"></td>
      <td><button class="mini-journal-button" type="button" data-trade-id="${escapeHtml(trade.id)}">${journal.notes || journal.strategy ? "Edit" : "Journal"}</button></td>
    </tr>`;
  }).join("") + `<datalist id="${datalistId}">${tagOptions}</datalist>`;

  els.dayTradeRows.querySelectorAll(".trade-select").forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selectedDayTradeIds.add(checkbox.dataset.tradeId);
      else state.selectedDayTradeIds.delete(checkbox.dataset.tradeId);
    });
  });
  els.dayTradeRows.querySelectorAll("tr[data-trade-id]").forEach((row) => {
    row.addEventListener("click", () => {
      const checkbox = row.querySelector(".trade-select");
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    });
  });
  els.dayTradeRows.querySelectorAll(".mini-journal-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      els.dayDialog.close();
      openJournal(button.dataset.tradeId);
    });
  });
  els.dayTradeRows.querySelectorAll(".setup-tag-input").forEach((input) => {
    input.addEventListener("click", (event) => event.stopPropagation());
    const commit = () => {
      const tradeId = input.dataset.tradeId;
      const next = input.value.trim();
      const previous = (state.journals[tradeId]?.strategy || "").trim();
      if (next === previous) return;
      const existing = state.journals[tradeId] || {};
      state.journals[tradeId] = { ...existing, strategy: next, updatedAt: new Date().toISOString() };
      persistJournals();
      renderSetups(state.filteredTrades.filter(isClosedTrade));
    };
    input.addEventListener("change", commit);
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });
  });
}

function renderDayMiniChart(trades) {
  let running = 0;
  const series = trades.map((trade) => {
    running = roundCurrency(running + trade.netPnl);
    return { date: trade.closeTime, value: running };
  });
  const width = 320;
  const height = 120;
  const pad = { top: 12, right: 8, bottom: 18, left: 42 };
  const values = series.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const spread = max - min || 1;
  const x = (index) => pad.left + (index / Math.max(1, series.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - (value - min) / spread) * (height - pad.top - pad.bottom);
  const points = series.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const area = `${pad.left},${y(0)} ${points} ${x(series.length - 1)},${y(0)}`;
  const ticks = makeTicks(min, max, 4);
  els.dayMiniChart.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" aria-label="Day cumulative P&L">
    <defs>
      <linearGradient id="dayGreenGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#43c89a" stop-opacity=".36"/>
        <stop offset="100%" stop-color="#43c89a" stop-opacity=".04"/>
      </linearGradient>
    </defs>
    ${ticks.map((tick) => `<line class="grid-line" x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}"/>
      <text class="axis-label" x="${pad.left - 7}" y="${y(tick) + 3}" text-anchor="end">${moneyCompact(tick)}</text>`).join("")}
    <line class="zero-line" x1="${pad.left}" y1="${y(0)}" x2="${width - pad.right}" y2="${y(0)}"/>
    <polygon points="${area}" fill="url(#dayGreenGradient)"/>
    <polyline points="${points}" class="line-purple"/>
  </svg>`;
}

function openDayInsights(dateKey) {
  const closedTrades = state.filteredTrades.filter(isClosedTrade);
  const daily = groupByDate(closedTrades);
  const trades = daily[dateKey]?.trades || [];
  if (!trades.length) return;
  const stats = getTradeSetStats(trades);
  els.insightDate.textContent = weekdayDate(dateKey);
  els.insightPnl.textContent = `Net P&L ${money(stats.netPnl)}`;
  els.insightPnl.className = stats.netPnl >= 0 ? "positive" : "negative";
  els.insightTrades.textContent = `Total Trades ${trades.length}`;
  els.insightsList.innerHTML = buildDailyInsights(dateKey, trades, daily).map((insight) => `<article class="insight-item ${insight.tone}">
    <strong><span>${insight.tone === "alert" ? "!" : "i"}</span>${escapeHtml(insight.title)}</strong>
    <p>${escapeHtml(insight.body)}</p>
  </article>`).join("");
  if (!els.insightsDialog.open) els.insightsDialog.showModal();
}

function buildDailyInsights(dateKey, trades, daily) {
  const sortedPriorDays = Object.keys(daily).filter((date) => date < dateKey).sort().slice(-60);
  const priorTradeCounts = sortedPriorDays.map((date) => daily[date].trades.length);
  const avgTrades = priorTradeCounts.length ? sum(priorTradeCounts) / priorTradeCounts.length : Math.max(1, trades.length);
  const stats = getTradeSetStats(trades);
  const losses = trades.filter((trade) => trade.netPnl < 0);
  const wins = trades.filter((trade) => trade.netPnl > 0);
  const biggestLoss = losses.sort((a, b) => a.netPnl - b.netPnl)[0];
  const bestWin = wins.sort((a, b) => b.netPnl - a.netPnl)[0];
  const firstHourTrades = trades.filter((trade) => timeToMinutes(trade.openTime || tradeOpenTime(trade)) <= 450);
  const insights = [];

  if (trades.length > Math.max(3, Math.round(avgTrades * 1.5))) {
    insights.push({
      tone: "alert",
      title: "Overtrading Day",
      body: `You placed ${trades.length} trades today, ${Math.round(trades.length / Math.max(avgTrades, 1) * 100)}% of your 60-day pace (${avgTrades.toFixed(1)} avg). ${stats.netPnl >= 0 ? "Still ended green, but review whether the extra trades improved expectancy." : "The extra frequency amplified a red day."}`,
    });
  } else {
    insights.push({
      tone: "neutral",
      title: "Trade Count In Range",
      body: `You placed ${trades.length} trades today versus a 60-day average of ${avgTrades.toFixed(1)}. The day did not flag as a volume outlier.`,
    });
  }

  insights.push({
    tone: trades.length > avgTrades + 1 ? "neutral" : "positive",
    title: "Unusual Number of Trades",
    body: `This day had ${trades.length} trades. Your recent average is ${avgTrades.toFixed(1)} trades per day, so this session was ${trades.length > avgTrades ? "more active" : "quieter"} than normal.`,
  });

  if (biggestLoss && bestWin) {
    const giveBack = Math.abs(biggestLoss.netPnl);
    insights.push({
      tone: giveBack > Math.abs(bestWin.netPnl) * 0.7 ? "alert" : "neutral",
      title: "Left Money on the Table",
      body: `Your best trade made ${money(bestWin.netPnl)}, while the largest loss gave back ${money(giveBack)}. Review entries/exits and MAE/MFE notes to tighten profit-taking and risk.`,
    });
  } else if (bestWin) {
    insights.push({
      tone: "positive",
      title: "Clean Green Session",
      body: `No losing trades were recorded. Best trade was ${displayInstrument(bestWin)} for ${money(bestWin.netPnl)}.`,
    });
  } else if (biggestLoss) {
    insights.push({
      tone: "alert",
      title: "Loss Concentration",
      body: `No winners offset the day. Largest loss was ${displayInstrument(biggestLoss)} for ${money(biggestLoss.netPnl)}.`,
    });
  }

  if (firstHourTrades.length >= Math.max(2, trades.length * 0.6)) {
    insights.push({
      tone: "neutral",
      title: "Front-Loaded Session",
      body: `${firstHourTrades.length} of ${trades.length} trades happened in the first market hour. Check whether later trades had the same quality as your opening plan.`,
    });
  }

  return insights.slice(0, 4);
}

function renderDayPage() {
  const closedTrades = [...state.filteredTrades].filter(isClosedTrade);
  const daily = groupByDate(closedTrades);
  const sortedDays = Object.keys(daily).sort().reverse();
  if (!state.selectedDay && sortedDays.length) state.selectedDay = sortedDays[0];
  if (!sortedDays.length) {
    els.dayCards.innerHTML = `<article class="day-view-card empty-state">No closed trades for this date range.</article>`;
    els.daySideCalendar.innerHTML = "";
    return;
  }
  els.dayCards.innerHTML = sortedDays.map((date) => renderDayCard(date, daily[date])).join("");
  renderSideCalendar(daily);
  els.dayCards.querySelectorAll("[data-open-day]").forEach((button) => {
    button.addEventListener("click", () => openDayDialog(button.dataset.openDay));
  });
  els.dayCards.querySelectorAll("[data-open-trade]").forEach((button) => {
    button.addEventListener("click", () => openTradeDetail(button.dataset.openTrade));
  });
  els.dayCards.querySelectorAll("[data-insights-day]").forEach((button) => {
    button.addEventListener("click", () => openDayInsights(button.dataset.insightsDay));
  });
  els.dayCards.querySelectorAll("[data-journal-trade]").forEach((button) => {
    button.addEventListener("click", () => openJournal(button.dataset.journalTrade));
  });
}

function renderDayCard(dateKey, info) {
  const trades = [...info.trades].sort((a, b) => timeToMinutes(a.openTime || tradeOpenTime(a)) - timeToMinutes(b.openTime || tradeOpenTime(b)));
  const stats = getTradeSetStats(trades);
  return `<article class="day-view-card ${dateKey === state.selectedDay ? "selected" : ""}">
    <header>
      <button class="day-expand" data-open-day="${dateKey}" type="button">&gt;</button>
      <div>
        <h2>${weekdayDate(dateKey)}</h2>
        <strong class="${info.pnl >= 0 ? "positive" : "negative"}">Net P&L ${money(info.pnl)}</strong>
      </div>
      <div class="day-card-actions">
        <button class="toolbar-button" data-insights-day="${dateKey}" type="button">AI insights</button>
        <button class="toolbar-button" data-open-day="${dateKey}" type="button">Replay</button>
        <button class="toolbar-button" data-journal-trade="${escapeHtml(trades[0]?.id || "")}" type="button">Add note</button>
      </div>
    </header>
    <div class="day-card-body">
      <div class="day-card-chart">${daySparklineSvg(trades, 310, 116)}</div>
      <div class="day-card-stat"><span>Total Trades</span><strong>${trades.length}</strong></div>
      <div class="day-card-stat"><span>Gross P&L</span><strong>${money(stats.netPnl)}</strong></div>
      <div class="day-card-stat"><span>Winners / Losers</span><strong>${stats.wins.length} / ${stats.losses.length}</strong></div>
      <div class="day-card-stat"><span>Commissions</span><strong>${money(stats.commissions)}</strong></div>
      <div class="day-card-stat"><span>Win Rate</span><strong>${stats.winRate.toFixed(0)}%</strong></div>
      <div class="day-card-stat"><span>Volume</span><strong>${sum(trades.map((trade) => trade.quantity))}</strong></div>
      <div class="day-card-stat"><span>Profit Factor</span><strong>${stats.profitFactor >= 99 ? "--" : stats.profitFactor.toFixed(2)}</strong></div>
    </div>
    <div class="day-card-trades">
      ${trades.map((trade) => `<button class="day-trade-chip" data-open-trade="${escapeHtml(trade.id)}" type="button">
        <span>${escapeHtml(trade.underlying || trade.symbol)}</span>
        <b class="${trade.netPnl >= 0 ? "positive" : "negative"}">${money(trade.netPnl)}</b>
        <small>${trade.openTime || tradeOpenTime(trade)} - ${trade.exitTime || trade.closeTime}</small>
      </button>`).join("")}
    </div>
  </article>`;
}

function renderSideCalendar(daily) {
  const selected = state.selectedDay ? parseDateKey(state.selectedDay) : state.currentMonth;
  const year = selected.getFullYear();
  const month = selected.getMonth();
  els.daySideMonth.textContent = selected.toLocaleString("en-US", { month: "long", year: "numeric" });
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const first = new Date(year, month, 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  let html = weekdays.map((day) => `<span>${day}</span>`).join("");
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const key = toDateKey(date);
    const info = daily[key];
    const klass = [
      date.getMonth() === month ? "" : "muted",
      key === state.selectedDay ? "active" : "",
      info?.pnl > 0 ? "win" : info?.pnl < 0 ? "loss" : "",
    ].join(" ");
    html += `<button class="${klass}" data-side-day="${key}" type="button">${date.getDate()}</button>`;
  }
  els.daySideCalendar.innerHTML = html;
  els.daySideCalendar.querySelectorAll("[data-side-day]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDay = button.dataset.sideDay;
      renderDayPage();
    });
  });
}

function renderProgressPage() {
  const closedTrades = state.filteredTrades.filter(isClosedTrade);
  const daily = groupByDate(closedTrades);
  const sortedDays = Object.keys(daily).sort();
  const dayKey = state.selectedDay || sortedDays.at(-1) || toDateKey(new Date());
  state.selectedDay = dayKey;
  const checks = evaluateDayRules(dayKey, daily[dayKey]?.trades || []);
  const passed = checks.filter((item) => item.passed).length;
  const score = checks.length ? Math.round(passed / checks.length * 100) : 0;
  els.currentStreak.textContent = `${computeCurrentStreak(sortedDays, daily)} days`;
  els.periodScore.textContent = `${score}%`;
  renderMiniGauge(els.periodGauge, score / 100);
  els.progressTodayScore.textContent = `${passed}/${checks.length}`;
  els.progressTodayBar.style.width = `${checks.length ? passed / checks.length * 100 : 0}%`;
  els.dailyChecklistTitle.textContent = `Daily checklist, ${monthShort(parseDateKey(dayKey))} ${parseDateKey(dayKey).getDate()}`;
  els.progressChecklist.innerHTML = checks.map((item) => `<div class="${item.passed ? "passed" : "failed"}">
    <span>${item.passed ? "OK" : "NO"}</span>
    <strong>${escapeHtml(item.label)}</strong>
    <em>${escapeHtml(item.value)}</em>
  </div>`).join("");
  renderHeatmapInto(els.progressPageHeatmap, daily, 216);
  renderRulesTable(daily);
}

function renderRulesTable(daily) {
  const rows = [
    ["Start my day by", state.rules.startTime, 0, state.rules.startTime, followRateForRule(daily, "start")],
    ["Link trades to playbook", "100%", 0, `${journalCoverage()}%`, journalCoverage()],
    ["Input Stop loss to all trades", "100%", 0, "0%", 0],
    ["Net max loss /trade", money(state.rules.maxLossTradeValue), 2, money(avgMaxLossTrade(daily)), maxLossTradeFollowRate(daily)],
    ["Net max loss /day", money(state.rules.maxLossDayValue), 0, money(avgDailyLoss(daily)), maxLossDayFollowRate(daily)],
  ];
  els.rulesTable.innerHTML = rows.map((row) => `<tr>
    <td>${escapeHtml(row[0])}</td>
    <td>${escapeHtml(row[1])}</td>
    <td>${row[2]}</td>
    <td>${escapeHtml(row[3])}</td>
    <td class="${row[4] >= 70 ? "positive" : row[4] >= 45 ? "warning" : "negative"}">${row[4]}%</td>
  </tr>`).join("");
}

function evaluateDayRules(dayKey, trades) {
  const earliest = trades.map((trade) => timeToMinutes(trade.openTime || tradeOpenTime(trade))).sort((a, b) => a - b)[0];
  const dayPnl = sum(trades.map((trade) => trade.netPnl));
  const maxTradeLoss = Math.max(0, ...trades.map((trade) => trade.netPnl < 0 ? Math.abs(trade.netPnl) : 0));
  return [
    { label: "Start my day by", passed: !state.rules.startDay || !trades.length || earliest <= timeToMinutes(state.rules.startTime), value: state.rules.startTime },
    { label: "Link trades to playbook", passed: !state.rules.linkPlaybook || trades.every((trade) => state.journals[trade.id]?.strategy), value: `${trades.filter((trade) => state.journals[trade.id]?.strategy).length} / ${trades.length}` },
    { label: "Input Stop loss to all trades", passed: !state.rules.stopLoss || trades.every((trade) => state.journals[trade.id]?.stopLoss), value: `${trades.filter((trade) => state.journals[trade.id]?.stopLoss).length} / ${trades.length}` },
    { label: "Net max loss /trade", passed: !state.rules.maxLossTrade || maxTradeLoss <= state.rules.maxLossTradeValue, value: `${money(maxTradeLoss)} / ${money(state.rules.maxLossTradeValue)}` },
    { label: "Net max loss /day", passed: !state.rules.maxLossDay || dayPnl >= -state.rules.maxLossDayValue, value: `${money(Math.abs(Math.min(0, dayPnl)))} / ${money(state.rules.maxLossDayValue)}` },
  ];
}

function renderRuleControls() {
  const labels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  els.ruleTradingDays.innerHTML = labels.map((label, index) => `<button class="${state.rules.tradingDays.includes(index) ? "active" : ""}" data-weekday="${index}" type="button">${label}</button>`).join("");
  els.ruleTradingDays.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => button.classList.toggle("active"));
  });
}

function openRulesDialog() {
  renderRuleControls();
  els.ruleEmailReminder.checked = state.rules.emailReminder;
  els.ruleReminderTime.value = state.rules.reminderTime;
  els.ruleStartDay.checked = state.rules.startDay;
  els.ruleStartTime.value = state.rules.startTime;
  els.ruleLinkPlaybook.checked = state.rules.linkPlaybook;
  els.ruleStopLoss.checked = state.rules.stopLoss;
  els.ruleMaxLossTrade.checked = state.rules.maxLossTrade;
  els.ruleMaxLossTradeValue.value = state.rules.maxLossTradeValue;
  els.ruleMaxLossDay.checked = state.rules.maxLossDay;
  els.ruleMaxLossDayValue.value = state.rules.maxLossDayValue;
  els.rulesDialog.showModal();
}

function saveRules() {
  state.rules = {
    tradingDays: [...els.ruleTradingDays.querySelectorAll(".active")].map((button) => Number(button.dataset.weekday)),
    emailReminder: els.ruleEmailReminder.checked,
    reminderTime: els.ruleReminderTime.value || "21:15",
    startDay: els.ruleStartDay.checked,
    startTime: els.ruleStartTime.value || "09:30",
    linkPlaybook: els.ruleLinkPlaybook.checked,
    stopLoss: els.ruleStopLoss.checked,
    maxLossTrade: els.ruleMaxLossTrade.checked,
    maxLossTradeValue: number(els.ruleMaxLossTradeValue.value || 100),
    maxLossDay: els.ruleMaxLossDay.checked,
    maxLossDayValue: number(els.ruleMaxLossDayValue.value || 100),
  };
  persistRules();
  els.rulesDialog.close();
  renderProgressPage();
  showToast("Rules saved.");
}

function resetRulesProgress() {
  state.rules = { ...defaultRules };
  persistRules();
  els.rulesDialog.close();
  renderProgressPage();
  showToast("Progress rules reset.");
}

function renderTradePage() {
  const trades = [...state.filteredTrades].filter(isClosedTrade).sort((a, b) => `${b.closeDate} ${b.closeTime}`.localeCompare(`${a.closeDate} ${a.closeTime}`));
  if (!trades.length) {
    els.tradePageList.innerHTML = `<div class="empty-state">No trades available.</div>`;
    return;
  }
  let trade = trades.find((item) => item.id === state.activeTradeId) || trades[0];
  state.activeTradeId = trade.id;
  const dayTrades = trades.filter((item) => item.closeDate === trade.closeDate).sort((a, b) => timeToMinutes(a.openTime || tradeOpenTime(a)) - timeToMinutes(b.openTime || tradeOpenTime(b)));
  const dayStats = getTradeSetStats(dayTrades);
  els.tradePageDate.textContent = weekdayDate(trade.closeDate);
  els.tradePageDayStats.textContent = `Net P&L ${money(dayStats.netPnl)} - ${dayTrades.length} trades`;
  els.tradePageList.innerHTML = dayTrades.map((item) => `<button class="${item.id === trade.id ? "active" : ""}" data-trade-row="${escapeHtml(item.id)}" type="button">
    <span>${escapeHtml(item.underlying || item.symbol)}</span>
    <b class="${item.netPnl >= 0 ? "positive" : "negative"}">${money(item.netPnl)}</b>
    <small>${item.openTime || tradeOpenTime(item)} - ${item.exitTime || item.closeTime}</small>
  </button>`).join("");
  els.tradePageList.querySelectorAll("[data-trade-row]").forEach((button) => {
    button.addEventListener("click", () => openTradeDetail(button.dataset.tradeRow));
  });
  els.tradeDetailTitle.textContent = `${trade.underlying || trade.symbol}`;
  els.tradeDetailSubtitle.textContent = `${displayInstrument(trade)} - ${weekdayDate(trade.closeDate)}`;
  els.tradeStatsCard.innerHTML = renderTradeStats(trade);
  els.markReviewedButton.textContent = trade.reviewed ? "Reviewed" : "Mark reviewed";
  renderExecutionsTable(trade);
  renderTradeChart(trade);
  renderTradeNotesPane(trade);
  renderTradeTabs();
}

function openTradeDetail(tradeId) {
  switchView("trade", { tradeId });
}

function renderTradeStats(trade) {
  const roi = trade.adjustedCost ? trade.netPnl / trade.adjustedCost * 100 : 0;
  return `<div class="trade-net ${trade.netPnl >= 0 ? "positive" : "negative"}">
      <span>Net P&L</span><strong>${money(trade.netPnl)}</strong>
    </div>
    <dl>
      <dt>Side</dt><dd>${escapeHtml(displaySide(trade))}</dd>
      <dt>Account</dt><dd>Webull</dd>
      <dt>Options traded</dt><dd>${trade.quantity}</dd>
      <dt>Commissions & Fees</dt><dd>${money(trade.commissions || 0)}</dd>
      <dt>Net ROI</dt><dd>${roi.toFixed(2)}%</dd>
      <dt>Gross P&L</dt><dd>${money(trade.grossPnl ?? trade.netPnl)}</dd>
      <dt>Adjusted Cost</dt><dd>${money(trade.adjustedCost || 0)}</dd>
      <dt>Average Entry</dt><dd>${priceLabel(trade.entryPrice)}</dd>
      <dt>Average Exit</dt><dd>${priceLabel(trade.exitPrice)}</dd>
      <dt>Entry Time</dt><dd>${trade.openTime || tradeOpenTime(trade)}</dd>
      <dt>Exit Time</dt><dd>${trade.exitTime || trade.closeTime}</dd>
    </dl>
    <div class="rating-row">* * * * *</div>`;
}

function renderExecutionsTable(trade) {
  els.executionsTable.innerHTML = trade.executions.map((execution) => `<tr>
    <td>${escapeHtml(execution.time)}</td>
    <td>${escapeHtml(execution.role)}</td>
    <td>${escapeHtml(execution.side)}</td>
    <td>${execution.quantity}</td>
    <td>${priceLabel(execution.price)}</td>
    <td class="${(execution.pnl || 0) >= 0 ? "positive" : "negative"}">${execution.pnl === null ? "--" : money(execution.pnl)}</td>
  </tr>`).join("");
}

function renderTradeChart(trade) {
  const tvSymbolValue = tradingViewSymbol(trade.underlying || trade.symbol);
  const symbol = encodeURIComponent(tvSymbolValue);
  const config = encodeURIComponent(JSON.stringify({
    symbol: tvSymbolValue,
    interval: "1",
    timezone: "America/Los_Angeles",
    theme: "light",
    style: "1",
    locale: "en",
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_side_toolbar: false,
    allow_symbol_change: true,
    save_image: false,
    calendar: false,
    support_host: "https://www.tradingview.com",
  }));
  els.tradingViewFrame.src = `https://www.tradingview-widget.com/embed-widget/advanced-chart/?symbol=${symbol}#${config}`;
  els.tradeChartLabel.textContent = `${trade.underlying || trade.symbol} - executions`;
  els.executionOverlay.innerHTML = trade.executions.map((execution) => `<span class="${execution.role.toLowerCase()}">
    ${execution.role} ${execution.side} ${execution.quantity} @ ${priceLabel(execution.price)} ${execution.time}
  </span>`).join("");
  renderRunningExecutionChart(trade);
}

function tradingViewSymbol(symbol) {
  const ticker = String(symbol || "SPY").toUpperCase();
  if (["SPY", "IWM", "DIA", "GLD", "SLV"].includes(ticker)) return `AMEX:${ticker}`;
  if (["QQQ", "AAPL", "AMD", "META", "MSFT", "NVDA", "TSLA"].includes(ticker)) return `NASDAQ:${ticker}`;
  return ticker;
}

function renderTradeNotesPane(trade) {
  const journal = state.journals[trade.id] || {};
  const chartImageBlock = journal.chartImage
    ? `<div class="notes-block notes-chart-block">
         <strong>Chart</strong>
         <img class="notes-chart-image" src="${journal.chartImage}" alt="Saved chart screenshot for trade" />
       </div>`
    : "";
  els.tradeInlineNotes.innerHTML = `<div class="notes-block">
    <strong>Trade note</strong>
    <p>${escapeHtml(journal.notes || "No trade note yet.")}</p>
  </div>
  <div class="notes-block">
    <strong>Daily Journal</strong>
    <p>${escapeHtml(journal.lesson || "Add a lesson or rule for next time.")}</p>
  </div>
  ${chartImageBlock}
  <button class="primary-button" data-note-trade="${escapeHtml(trade.id)}" type="button">Write note</button>`;
  els.tradeInlineNotes.querySelector("[data-note-trade]").addEventListener("click", () => openJournal(trade.id));
}

function renderTradeTabs() {
  document.querySelectorAll("[data-trade-tab]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tradeTab === state.activeTradeTab);
  });
  [
    ["chart", els.tradeChartPane],
    ["executions", els.tradeExecutionsPane],
    ["notes", els.tradeNotesPane],
    ["running", els.tradeRunningPane],
  ].forEach(([name, pane]) => {
    pane.hidden = name !== state.activeTradeTab;
    pane.classList.toggle("active", !pane.hidden);
  });
}

function renderRunningExecutionChart(trade) {
  const points = trade.executions.filter((execution) => execution.pnl !== null).reduce((acc, execution) => {
    const previous = acc.at(-1)?.value || 0;
    acc.push({ date: execution.time, value: roundCurrency(previous + execution.pnl) });
    return acc;
  }, []);
  renderLineChart(els.tradeRunningChart, points.length ? points : [{ date: trade.closeTime, value: trade.netPnl }], { mode: "cumulative", color: "#6f61d9", fill: trade.netPnl < 0 ? "red" : "green" });
}

function markActiveTradeReviewed() {
  const index = state.trades.findIndex((trade) => trade.id === state.activeTradeId);
  if (index < 0) return;
  state.trades[index] = createTrade({ ...state.trades[index], reviewed: true });
  persistTrades(state.trades);
  render();
  showToast("Trade marked reviewed.");
}

function getTradeSetStats(trades) {
  const wins = trades.filter((trade) => trade.netPnl > 0);
  const losses = trades.filter((trade) => trade.netPnl < 0);
  const grossWin = sum(wins.map((trade) => trade.netPnl));
  const grossLoss = sum(losses.map((trade) => trade.netPnl));
  return {
    wins,
    losses,
    netPnl: roundCurrency(sum(trades.map((trade) => trade.netPnl))),
    commissions: roundCurrency(sum(trades.map((trade) => trade.commissions || 0))),
    winRate: trades.length ? wins.length / trades.length * 100 : 0,
    profitFactor: grossLoss ? Math.abs(grossWin / grossLoss) : grossWin ? 99 : 0,
  };
}

function daySparklineSvg(trades, width, height) {
  let running = 0;
  const series = trades.map((trade) => {
    running = roundCurrency(running + trade.netPnl);
    return { date: trade.closeTime, value: running };
  });
  if (!series.length) return "";
  const pad = { top: 12, right: 8, bottom: 18, left: 42 };
  const values = series.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const spread = max - min || 1;
  const x = (index) => pad.left + (index / Math.max(1, series.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - (value - min) / spread) * (height - pad.top - pad.bottom);
  const points = series.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const area = `${pad.left},${y(0)} ${points} ${x(series.length - 1)},${y(0)}`;
  const ticks = makeTicks(min, max, 4);
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" aria-label="Day cumulative P&L">
    ${ticks.map((tick) => `<line class="grid-line" x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}"/>
      <text class="axis-label" x="${pad.left - 7}" y="${y(tick) + 3}" text-anchor="end">${moneyCompact(tick)}</text>`).join("")}
    <line class="zero-line" x1="${pad.left}" y1="${y(0)}" x2="${width - pad.right}" y2="${y(0)}"/>
    <polygon points="${area}" fill="${running >= 0 ? "rgba(67,200,154,.22)" : "rgba(255,102,109,.18)"}"/>
    <polyline points="${points}" class="line-purple"/>
  </svg>`;
}

function computeCurrentStreak(sortedDays, daily) {
  let streak = 0;
  [...sortedDays].reverse().some((date) => {
    const checks = evaluateDayRules(date, daily[date]?.trades || []);
    const passed = checks.filter((item) => item.passed).length;
    if (passed >= Math.ceil(checks.length * 0.6)) {
      streak += 1;
      return false;
    }
    return true;
  });
  return streak;
}

function journalCoverage() {
  const closed = state.trades.filter(isClosedTrade);
  if (!closed.length) return 0;
  return Math.round(closed.filter((trade) => state.journals[trade.id]?.strategy).length / closed.length * 100);
}

function followRateForRule(daily, rule) {
  const days = Object.keys(daily);
  if (!days.length) return 0;
  const passed = days.filter((date) => evaluateDayRules(date, daily[date].trades).find((item) => item.label.toLowerCase().includes(rule))?.passed).length;
  return Math.round(passed / days.length * 100);
}

function avgMaxLossTrade(daily) {
  const days = Object.values(daily);
  if (!days.length) return 0;
  return roundCurrency(sum(days.map((day) => Math.max(0, ...day.trades.map((trade) => trade.netPnl < 0 ? Math.abs(trade.netPnl) : 0)))) / days.length);
}

function avgDailyLoss(daily) {
  const days = Object.values(daily);
  if (!days.length) return 0;
  return roundCurrency(sum(days.map((day) => Math.abs(Math.min(0, day.pnl)))) / days.length);
}

function maxLossTradeFollowRate(daily) {
  const days = Object.keys(daily);
  if (!days.length) return 0;
  const passed = days.filter((date) => evaluateDayRules(date, daily[date].trades).find((item) => item.label === "Net max loss /trade")?.passed).length;
  return Math.round(passed / days.length * 100);
}

function maxLossDayFollowRate(daily) {
  const days = Object.keys(daily);
  if (!days.length) return 0;
  const passed = days.filter((date) => evaluateDayRules(date, daily[date].trades).find((item) => item.label === "Net max loss /day")?.passed).length;
  return Math.round(passed / days.length * 100);
}

function renderJournalPage() {
  const allTrades = [...state.filteredTrades]
    .filter((trade) => trade.status.toLowerCase() !== "open")
    .sort((a, b) => `${b.closeDate} ${b.closeTime}`.localeCompare(`${a.closeDate} ${a.closeTime}`));
  const journaled = allTrades.filter((trade) => hasJournalEntry(trade.id));
  els.journalTotalTrades.textContent = String(allTrades.length);
  els.journaledTrades.textContent = String(journaled.length);
  els.journalMissingTrades.textContent = String(allTrades.length - journaled.length);
  els.journaledPnl.textContent = money(sum(journaled.map((trade) => trade.netPnl)));
  els.journaledPnl.className = sum(journaled.map((trade) => trade.netPnl)) >= 0 ? "positive" : "negative";

  const search = els.journalSearch.value.trim().toLowerCase();
  const filter = els.journalFilter.value;
  const matchesFilter = (trade) => {
    const journal = state.journals[trade.id] || {};
    const haystack = [
      trade.closeDate,
      displaySymbol(trade),
      displayInstrument(trade),
      trade.side,
      trade.optionType,
      trade.underlying,
      journal.strategy,
      journal.emotion,
      journal.notes,
      journal.lesson,
    ].join(" ").toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (filter === "journaled") return hasJournalEntry(trade.id);
    if (filter === "missing") return !hasJournalEntry(trade.id);
    if (filter === "wins") return trade.netPnl > 0;
    if (filter === "losses") return trade.netPnl < 0;
    return true;
  };

  const filtered = allTrades.filter(matchesFilter);
  if (!filtered.length) {
    els.journalDays.innerHTML = `<div class="empty-state">No trades match this journal view.</div>`;
    return;
  }

  // Group filtered trades by closeDate (preserves descending order from sort above)
  const byDate = new Map();
  filtered.forEach((trade) => {
    if (!byDate.has(trade.closeDate)) byDate.set(trade.closeDate, []);
    byDate.get(trade.closeDate).push(trade);
  });

  // Render one card per day
  els.journalDays.innerHTML = [...byDate.entries()].map(([dateKey, dayTrades]) => {
    return renderJournalDayCard(dateKey, dayTrades);
  }).join("");

  // Wire up interactions on the rendered cards
  els.journalDays.querySelectorAll(".journal-day-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      const card = toggle.closest(".journal-day-card");
      if (card) card.classList.toggle("collapsed");
    });
  });
  els.journalDays.querySelectorAll(".journal-trade-row[data-trade-id]").forEach((row) => {
    row.addEventListener("click", (event) => {
      // Don't trigger when clicking a chart screenshot (modal preview) or the edit button
      if (event.target.closest(".journal-trade-screenshot") || event.target.closest("button")) return;
      openJournal(row.dataset.tradeId);
    });
  });
  els.journalDays.querySelectorAll(".journal-trade-edit").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openJournal(button.dataset.tradeId);
    });
  });
  els.journalDays.querySelectorAll(".journal-trade-screenshot img").forEach((img) => {
    img.addEventListener("click", (event) => {
      event.stopPropagation();
      openJournalImagePreview(img.src);
    });
  });
}

function renderJournalDayCard(dateKey, dayTrades) {
  const tradesByTime = [...dayTrades].sort((a, b) => timeToMinutes(a.closeTime) - timeToMinutes(b.closeTime));
  const totalPnl = sum(dayTrades.map((trade) => trade.netPnl));
  const wins = dayTrades.filter((trade) => trade.netPnl > 0);
  const winRate = dayTrades.length ? (wins.length / dayTrades.length) * 100 : 0;
  const journaledCount = dayTrades.filter((trade) => hasJournalEntry(trade.id)).length;
  const allJournaled = journaledCount === dayTrades.length;
  // Default expansion: a day is expanded if it has any journal entries (so you can see them
  // when scrolling), collapsed otherwise to keep unjournaled noise quiet.
  const collapseClass = journaledCount === 0 ? " collapsed" : "";
  const tradeRowsHtml = tradesByTime.map((trade) => renderJournalTradeRow(trade)).join("");

  return `<section class="journal-day-card${collapseClass}" data-date="${escapeHtml(dateKey)}">
    <button class="journal-day-toggle" type="button" aria-expanded="${journaledCount > 0}">
      <span class="journal-day-chevron" aria-hidden="true">▸</span>
      <div class="journal-day-meta">
        <strong class="journal-day-date">${escapeHtml(weekdayDate(dateKey))}</strong>
        <span class="journal-day-stats">
          <span class="${totalPnl >= 0 ? "positive" : "negative"}"><b>${money(totalPnl)}</b></span>
          <span>${dayTrades.length} ${dayTrades.length === 1 ? "trade" : "trades"}</span>
          <span>${winRate.toFixed(0)}% win</span>
          <span class="journal-day-status ${allJournaled ? "done" : journaledCount > 0 ? "partial" : "todo"}">${journaledCount}/${dayTrades.length} journaled</span>
        </span>
      </div>
    </button>
    <div class="journal-day-body">${tradeRowsHtml}</div>
  </section>`;
}

function renderJournalTradeRow(trade) {
  const journal = state.journals[trade.id] || {};
  const hasJournal = hasJournalEntry(trade.id);
  const screenshot = journal.chartImage
    ? `<div class="journal-trade-screenshot"><img src="${journal.chartImage}" alt="Chart screenshot for ${escapeHtml(displayInstrument(trade))}" /></div>`
    : "";
  const notesText = journal.notes ? journal.notes : (hasJournal ? "" : "");
  const lessonText = journal.lesson ? journal.lesson : "";
  const tagBits = [];
  if (journal.strategy) tagBits.push(`<span class="journal-tag setup">${escapeHtml(journal.strategy)}</span>`);
  if (journal.emotion && journal.emotion !== "Focused") tagBits.push(`<span class="journal-tag emotion">${escapeHtml(journal.emotion)}</span>`);
  return `<article class="journal-trade-row" data-trade-id="${escapeHtml(trade.id)}">
    <div class="journal-trade-head">
      <span class="journal-trade-time">${escapeHtml(tradeOpenTime(trade) || "--")}</span>
      <span class="journal-trade-instrument" title="${escapeHtml(trade.contract || trade.symbol)}">${escapeHtml(displayInstrument(trade))}</span>
      <span class="journal-trade-side">${escapeHtml(displaySide(trade))}</span>
      <span class="journal-trade-pnl ${trade.netPnl >= 0 ? "positive" : "negative"}">${money(trade.netPnl)}</span>
      <button class="journal-trade-edit small-button" type="button" data-trade-id="${escapeHtml(trade.id)}">${hasJournal ? "Edit" : "Journal"}</button>
    </div>
    ${tagBits.length ? `<div class="journal-trade-tags">${tagBits.join("")}</div>` : ""}
    ${notesText ? `<p class="journal-trade-notes"><b>Notes:</b> ${escapeHtml(notesText)}</p>` : ""}
    ${lessonText ? `<p class="journal-trade-notes lesson"><b>Lesson:</b> ${escapeHtml(lessonText)}</p>` : ""}
    ${!hasJournal ? `<p class="journal-trade-notes empty">No journal yet — click to add notes, strategy, or paste a chart screenshot.</p>` : ""}
    ${screenshot}
  </article>`;
}

function renderReportsPage() {
  if (!els.reportsView) return;
  const range = els.reportsRange?.value || "ytd";
  const today = new Date();
  let startDate = null;
  let endDate = today;
  if (range === "all") {
    startDate = null;
  } else if (range === "ytd") {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else if (range === "month") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (range === "last30") {
    startDate = new Date(today); startDate.setDate(today.getDate() - 30);
  } else if (range === "last90") {
    startDate = new Date(today); startDate.setDate(today.getDate() - 90);
  } else if (range === "last365") {
    startDate = new Date(today); startDate.setDate(today.getDate() - 365);
  } else if (range === "custom") {
    const s = els.reportsStart?.value;
    const e = els.reportsEnd?.value;
    startDate = s ? parseDateKey(s) : null;
    endDate = e ? parseDateKey(e) : today;
  }

  const inRange = (trade) => {
    if (!trade.closeDate) return false;
    const d = parseDateKey(trade.closeDate);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };
  const trades = state.trades.filter(isClosedTrade).filter(inRange);
  const formatRangeLabel = (start, end) => {
    if (!start) return `All time → ${formatShortDate(toDateKey(end))}`;
    return `${formatShortDate(toDateKey(start))} → ${formatShortDate(toDateKey(end))}`;
  };
  if (els.reportsRangeLabel) {
    els.reportsRangeLabel.textContent = formatRangeLabel(startDate, endDate);
  }

  // Comprehensive stats
  const stats = computeReportsStats(trades);
  els.reportsStatsGrid.innerHTML = renderReportsStatsCards(stats);

  // Day-of-week or month breakdown
  const tab = state.reportsTab || "days";
  if (tab === "days") {
    renderReportsBreakdown(trades, "dow");
    if (els.reportsBreakdownLabel) els.reportsBreakdownLabel.textContent = "Day";
  } else {
    renderReportsBreakdown(trades, "month");
    if (els.reportsBreakdownLabel) els.reportsBreakdownLabel.textContent = "Month";
  }
}

function computeReportsStats(trades) {
  const winners = trades.filter((t) => t.netPnl > 0);
  const losers = trades.filter((t) => t.netPnl < 0);
  const totalPnl = sum(trades.map((t) => t.netPnl));
  const grossWin = sum(winners.map((t) => t.netPnl));
  const grossLoss = sum(losers.map((t) => t.netPnl));
  const avgWin = winners.length ? grossWin / winners.length : 0;
  const avgLoss = losers.length ? grossLoss / losers.length : 0;
  const winRate = trades.length ? (winners.length / trades.length) * 100 : 0;
  const profitFactor = grossLoss !== 0 ? Math.abs(grossWin / grossLoss) : (grossWin > 0 ? 99 : 0);
  const expectancy = trades.length ? totalPnl / trades.length : 0;

  // Group by date for daily/drawdown stats
  const daily = new Map();
  trades.forEach((t) => {
    if (!daily.has(t.closeDate)) daily.set(t.closeDate, 0);
    daily.set(t.closeDate, daily.get(t.closeDate) + t.netPnl);
  });
  const dailyEntries = [...daily.entries()].sort();
  const winningDays = dailyEntries.filter(([, v]) => v > 0).length;
  const losingDays = dailyEntries.filter(([, v]) => v < 0).length;
  const breakEvenDays = dailyEntries.filter(([, v]) => v === 0).length;
  const totalTradingDays = dailyEntries.length;

  // Drawdown calc (peak-to-trough on running cumulative P&L)
  let running = 0; let peak = 0; let maxDrawdown = 0;
  dailyEntries.forEach(([, v]) => {
    running += v;
    peak = Math.max(peak, running);
    maxDrawdown = Math.min(maxDrawdown, running - peak);
  });

  // Streaks
  let curWinStreak = 0, maxWinStreak = 0, curLoseStreak = 0, maxLoseStreak = 0;
  dailyEntries.forEach(([, v]) => {
    if (v > 0) { curWinStreak += 1; curLoseStreak = 0; }
    else if (v < 0) { curLoseStreak += 1; curWinStreak = 0; }
    else { curWinStreak = 0; curLoseStreak = 0; }
    maxWinStreak = Math.max(maxWinStreak, curWinStreak);
    maxLoseStreak = Math.max(maxLoseStreak, curLoseStreak);
  });

  const largestWin = winners.length ? Math.max(...winners.map((t) => t.netPnl)) : 0;
  const largestLoss = losers.length ? Math.min(...losers.map((t) => t.netPnl)) : 0;
  const avgDailyPnl = totalTradingDays ? totalPnl / totalTradingDays : 0;
  const avgWinningDayPnl = winningDays ? sum(dailyEntries.filter(([, v]) => v > 0).map(([, v]) => v)) / winningDays : 0;
  const avgLosingDayPnl = losingDays ? sum(dailyEntries.filter(([, v]) => v < 0).map(([, v]) => v)) / losingDays : 0;
  const largestProfitDay = dailyEntries.length ? Math.max(...dailyEntries.map(([, v]) => v)) : 0;
  const largestLossDay = dailyEntries.length ? Math.min(...dailyEntries.map(([, v]) => v)) : 0;

  return {
    totalPnl, totalTrades: trades.length, winners: winners.length, losers: losers.length,
    winRate, avgWin, avgLoss, expectancy, profitFactor,
    largestWin, largestLoss,
    totalTradingDays, winningDays, losingDays, breakEvenDays,
    avgDailyPnl, avgWinningDayPnl, avgLosingDayPnl,
    largestProfitDay, largestLossDay,
    maxDrawdown, maxWinStreak, maxLoseStreak,
  };
}

function renderReportsStatsCards(s) {
  const cell = (label, value, klass = "") =>
    `<div class="reports-stat"><span>${escapeHtml(label)}</span><strong class="${klass}">${value}</strong></div>`;
  return [
    cell("Total P&L", money(s.totalPnl), s.totalPnl >= 0 ? "positive" : "negative"),
    cell("Total trades", s.totalTrades),
    cell("Win rate", `${s.winRate.toFixed(2)}%`),
    cell("Profit factor", s.profitFactor >= 99 ? "99+" : s.profitFactor.toFixed(2)),
    cell("Avg trade P&L", money(s.expectancy), s.expectancy >= 0 ? "positive" : "negative"),
    cell("Avg winning trade", money(s.avgWin), "positive"),
    cell("Avg losing trade", money(s.avgLoss), "negative"),
    cell("Largest win", money(s.largestWin), "positive"),
    cell("Largest loss", money(s.largestLoss), "negative"),
    cell("Total trading days", s.totalTradingDays),
    cell("Winning days", s.winningDays),
    cell("Losing days", s.losingDays),
    cell("Avg daily P&L", money(s.avgDailyPnl), s.avgDailyPnl >= 0 ? "positive" : "negative"),
    cell("Avg winning day", money(s.avgWinningDayPnl), "positive"),
    cell("Avg losing day", money(s.avgLosingDayPnl), "negative"),
    cell("Largest profitable day", money(s.largestProfitDay), "positive"),
    cell("Largest losing day", money(s.largestLossDay), "negative"),
    cell("Max drawdown", money(s.maxDrawdown), s.maxDrawdown < 0 ? "negative" : ""),
    cell("Max consecutive winning days", s.maxWinStreak),
    cell("Max consecutive losing days", s.maxLoseStreak),
  ].join("");
}

function renderReportsBreakdown(trades, mode) {
  // Build buckets keyed by either day-of-week (0..6) or month (YYYY-MM)
  const buckets = new Map();
  const labels = mode === "dow"
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : null;

  // Day-level rollups (so win-rate is per-day, not per-trade — matches Tradezella's screenshot)
  const dailyByBucket = new Map();
  trades.forEach((trade) => {
    const date = parseDateKey(trade.closeDate);
    const key = mode === "dow" ? String(date.getDay()) : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) buckets.set(key, { trades: 0, totalPnl: 0, winsTrades: 0, winSum: 0, lossSum: 0, winLossCount: 0, lossesTrades: 0 });
    const bucket = buckets.get(key);
    bucket.trades += 1;
    bucket.totalPnl += trade.netPnl;
    if (trade.netPnl > 0) { bucket.winsTrades += 1; bucket.winSum += trade.netPnl; }
    else if (trade.netPnl < 0) { bucket.lossesTrades += 1; bucket.lossSum += trade.netPnl; }

    if (!dailyByBucket.has(key)) dailyByBucket.set(key, new Map());
    const dayMap = dailyByBucket.get(key);
    dayMap.set(trade.closeDate, (dayMap.get(trade.closeDate) || 0) + trade.netPnl);
  });

  const rows = [...buckets.entries()].map(([key, b]) => {
    const dayMap = dailyByBucket.get(key) || new Map();
    const dayTotals = [...dayMap.values()];
    const winningDays = dayTotals.filter((v) => v > 0).length;
    const totalDays = dayTotals.length;
    const dayWinRate = totalDays ? (winningDays / totalDays) * 100 : 0;
    const avgWin = b.winsTrades ? b.winSum / b.winsTrades : 0;
    const avgLoss = b.lossesTrades ? b.lossSum / b.lossesTrades : 0;
    const expectancy = b.trades ? b.totalPnl / b.trades : 0;
    const label = mode === "dow" ? labels[Number(key)] : key;
    return { key, label, ...b, dayWinRate, avgWin, avgLoss, expectancy };
  }).sort((a, b) => mode === "dow" ? Number(a.key) - Number(b.key) : a.key.localeCompare(b.key));

  // Highlight cards (only meaningful for dow)
  if (mode === "dow") {
    const withTrades = rows.filter((r) => r.trades > 0);
    const best = withTrades.reduce((acc, r) => (!acc || r.totalPnl > acc.totalPnl) ? r : acc, null);
    const worst = withTrades.reduce((acc, r) => (!acc || r.totalPnl < acc.totalPnl) ? r : acc, null);
    const active = withTrades.reduce((acc, r) => (!acc || r.trades > acc.trades) ? r : acc, null);
    const bestWin = withTrades.reduce((acc, r) => (!acc || r.dayWinRate > acc.dayWinRate) ? r : acc, null);
    const setHighlight = (labelEl, valEl, row, format) => {
      if (!labelEl || !valEl) return;
      if (!row) { labelEl.textContent = "--"; valEl.textContent = "--"; return; }
      labelEl.textContent = row.label;
      valEl.textContent = format(row);
    };
    setHighlight(els.reportsBestDay, els.reportsBestDayValue, best, (r) => `${r.trades} trades · ${money(r.totalPnl)}`);
    setHighlight(els.reportsWorstDay, els.reportsWorstDayValue, worst, (r) => `${r.trades} trades · ${money(r.totalPnl)}`);
    setHighlight(els.reportsActiveDay, els.reportsActiveDayValue, active, (r) => `${r.trades} trades`);
    setHighlight(els.reportsBestWinDay, els.reportsBestWinDayValue, bestWin, (r) => `${r.dayWinRate.toFixed(0)}% · ${r.trades} trades`);
  } else {
    // Hide/clear highlight cards for month view (less meaningful at this granularity)
    [els.reportsBestDay, els.reportsWorstDay, els.reportsActiveDay, els.reportsBestWinDay].forEach((el) => { if (el) el.textContent = "--"; });
    [els.reportsBestDayValue, els.reportsWorstDayValue, els.reportsActiveDayValue, els.reportsBestWinDayValue].forEach((el) => { if (el) el.textContent = "--"; });
  }

  // Bar chart
  if (els.reportsBreakdownChart) {
    if (!rows.length) {
      els.reportsBreakdownChart.innerHTML = `<div class="empty-chart">No trades in this date range</div>`;
    } else {
      const series = rows.map((r) => ({ label: r.label, value: r.totalPnl }));
      els.reportsBreakdownChart.innerHTML = renderReportsBars(series);
      attachChartTooltip(els.reportsBreakdownChart);
    }
  }

  // Table
  if (els.reportsBreakdownTable) {
    if (!rows.length) {
      els.reportsBreakdownTable.innerHTML = `<tr><td colspan="7">No trades in this date range.</td></tr>`;
    } else {
      els.reportsBreakdownTable.innerHTML = rows.map((r) => `<tr>
        <td>${escapeHtml(r.label)}</td>
        <td>${r.trades}</td>
        <td>${r.dayWinRate.toFixed(1)}%</td>
        <td class="${r.totalPnl >= 0 ? "positive" : "negative"}">${money(r.totalPnl)}</td>
        <td class="positive">${money(r.avgWin)}</td>
        <td class="negative">${money(r.avgLoss)}</td>
        <td class="${r.expectancy >= 0 ? "positive" : "negative"}">${money(r.expectancy)}</td>
      </tr>`).join("");
    }
  }
}

function renderReportsBars(series) {
  const width = 720;
  const height = 220;
  const pad = { top: 16, right: 14, bottom: 38, left: 60 };
  const values = series.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const spread = (max - min) || 1;
  const xStep = (width - pad.left - pad.right) / Math.max(series.length, 1);
  const y = (v) => pad.top + (1 - (v - min) / spread) * (height - pad.top - pad.bottom);
  const zero = y(0);
  const ticks = makeTicks(min, max, 5);
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Reports breakdown bar chart">
    ${ticks.map((tick) => `<line class="grid-line" x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}"/>
      <text class="axis-label" x="${pad.left - 8}" y="${y(tick) + 3}" text-anchor="end">${moneyCompact(tick)}</text>`).join("")}
    <line class="zero-line" x1="${pad.left}" y1="${zero}" x2="${width - pad.right}" y2="${zero}"/>
    ${series.map((point, index) => {
      const cx = pad.left + index * xStep + xStep / 2;
      const barWidth = Math.max(4, xStep * 0.7);
      const barX = cx - barWidth / 2;
      const barY = point.value >= 0 ? y(point.value) : zero;
      const barH = Math.max(1, Math.abs(y(point.value) - zero));
      return `<rect class="${point.value >= 0 ? "bar-positive" : "bar-negative"} chart-hit-fill" x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="2" data-chart-tip="${escapeHtml(`${point.label}: ${money(point.value)}`)}"/>
        <text class="axis-label" x="${cx}" y="${height - 12}" text-anchor="middle">${escapeHtml(String(point.label).slice(0, 3))}</text>`;
    }).join("")}
  </svg>`;
}

function openJournalImagePreview(src) {
  const existing = document.querySelector(".journal-image-modal");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.className = "journal-image-modal";
  modal.innerHTML = `<button class="journal-image-close" aria-label="Close">×</button><img src="${src}" alt="Chart screenshot enlarged" />`;
  modal.addEventListener("click", () => modal.remove());
  document.body.appendChild(modal);
}

function renderLineChart(container, series, options = {}) {
  const width = 560;
  const height = 220;
  const pad = { top: 16, right: 14, bottom: 30, left: 56 };
  const values = series.map((point) => point.value);
  if (!values.length) {
    container.innerHTML = `<div class="empty-chart">No data</div>`;
    return;
  }

  const min = Math.min(...values, options.redLine ?? Infinity, 0);
  const max = Math.max(...values, options.redLine ?? -Infinity, 0);
  const spread = max - min || 1;
  const x = (index) => pad.left + (index / Math.max(1, series.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - (value - min) / spread) * (height - pad.top - pad.bottom);
  const points = series.map((point, index) => `${x(index)},${y(point.value)}`);
  const line = points.join(" ");
  const area = `${pad.left},${y(0)} ${line} ${x(series.length - 1)},${y(0)}`;
  const yTicks = makeTicks(min, max, 5);
  const xTicks = makeDateTicks(series, 4);
  const hitPoints = series.map((point, index) => ({
    cx: x(index),
    cy: y(point.value),
    tip: `${point.date ? formatChartDate(point.date) : point.label || "Point"}: ${money(point.value)}`,
  }));

  container.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.mode || "line"} chart">
    <defs>
      <linearGradient id="redAreaGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff666d" stop-opacity=".38"/>
        <stop offset="100%" stop-color="#ff666d" stop-opacity=".04"/>
      </linearGradient>
    </defs>
    ${yTicks.map((tick) => `<line class="grid-line" x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}"/>
      <text class="axis-label" x="${pad.left - 8}" y="${y(tick) + 3}" text-anchor="end">${moneyCompact(tick)}</text>`).join("")}
    <line class="zero-line" x1="${pad.left}" y1="${y(0)}" x2="${width - pad.right}" y2="${y(0)}"/>
    ${options.fill ? `<polygon points="${area}" class="area-red"/>` : ""}
    ${options.redLine !== undefined ? `<line class="line-red" x1="${pad.left}" y1="${y(options.redLine)}" x2="${width - pad.right}" y2="${y(options.redLine)}"/>` : ""}
    <polyline points="${line}" class="line-purple"/>
    ${hitPoints.map((point) => `<circle class="chart-hit" cx="${point.cx}" cy="${point.cy}" r="8" data-chart-tip="${escapeHtml(point.tip)}"/>`).join("")}
    ${xTicks.map((tick) => `<text class="axis-label" x="${x(tick.index)}" y="${height - 8}" text-anchor="${chartAnchor(tick.index, series.length - 1)}">${formatChartDate(tick.date)}</text>`).join("")}
  </svg>`;
  attachChartTooltip(container);
}

function renderBarChart(container, daily) {
  const series = Object.keys(daily).sort().map((date) => ({ date, value: daily[date].pnl }));
  if (!series.length) {
    container.innerHTML = `<div class="empty-chart">No data</div>`;
    return;
  }
  const width = 560;
  const height = 220;
  const pad = { top: 14, right: 12, bottom: 30, left: 55 };
  const values = series.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const spread = max - min || 1;
  const xStep = (width - pad.left - pad.right) / Math.max(series.length, 1);
  const y = (value) => pad.top + (1 - (value - min) / spread) * (height - pad.top - pad.bottom);
  const zero = y(0);
  const ticks = makeTicks(min, max, 6);
  const xTicks = makeDateTicks(series, 4);

  container.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily P&L bar chart">
    ${ticks.map((tick) => `<line class="grid-line" x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}"/>
      <text class="axis-label" x="${pad.left - 8}" y="${y(tick) + 3}" text-anchor="end">${moneyCompact(tick)}</text>`).join("")}
    <line class="zero-line" x1="${pad.left}" y1="${zero}" x2="${width - pad.right}" y2="${zero}"/>
    ${series.map((point, index) => {
      const barX = pad.left + index * xStep + 1;
      const barWidth = Math.max(3, xStep - 2);
      const barY = point.value >= 0 ? y(point.value) : zero;
      const barH = Math.max(1, Math.abs(y(point.value) - zero));
      const hasTrades = (daily[point.date]?.trades?.length || 0) > 0;
      return `<rect class="${point.value >= 0 ? "bar-positive" : "bar-negative"} chart-hit-fill${hasTrades ? " chart-bar-clickable" : ""}" x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="1" data-chart-tip="${escapeHtml(`${formatChartDate(point.date)}: ${money(point.value)}`)}"${hasTrades ? ` data-day="${point.date}"` : ""}/>`;
    }).join("")}
    ${xTicks.map((tick) => `<text class="axis-label" x="${pad.left + tick.index * xStep}" y="${height - 8}" text-anchor="${chartAnchor(tick.index, series.length - 1)}">${formatChartDate(tick.date)}</text>`).join("")}
  </svg>`;
  attachChartTooltip(container);
  container.querySelectorAll("[data-day]").forEach((bar) => {
    bar.addEventListener("click", () => openDayDialog(bar.dataset.day));
  });
}

function renderScatter(container, trades, mode) {
  const width = 560;
  const height = 220;
  const pad = { top: 14, right: 14, bottom: 34, left: 55 };
  const points = trades.map((trade) => ({
    x: mode === "time" ? timeToMinutes(trade.closeTime) : trade.durationMinutes,
    y: trade.netPnl,
    pnl: trade.netPnl,
  })).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) {
    container.innerHTML = `<div class="empty-chart">No data</div>`;
    return;
  }
  const dataMinX = Math.min(...points.map((point) => point.x));
  const dataMaxX = Math.max(...points.map((point) => point.x));
  const minX = mode === "time" ? Math.min(570, Math.floor(dataMinX / 30) * 30) : Math.min(dataMinX, 0);
  const maxX = mode === "time" ? Math.max(960, Math.ceil(dataMaxX / 30) * 30) : Math.max(dataMaxX, 10);
  const minY = Math.min(...points.map((point) => point.y), 0);
  const maxY = Math.max(...points.map((point) => point.y), 0);
  const ySpread = maxY - minY || 1;
  const xSpread = maxX - minX || 1;
  const x = (value) => pad.left + ((value - minX) / xSpread) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - (value - minY) / ySpread) * (height - pad.top - pad.bottom);
  const yTicks = makeTicks(minY, maxY, 6);
  const xTicks = makeTicks(minX, maxX, 7);

  container.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${mode} performance scatter chart">
    ${yTicks.map((tick) => `<line class="grid-line" x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}"/>
      <text class="axis-label" x="${pad.left - 8}" y="${y(tick) + 3}" text-anchor="end">${moneyCompact(tick)}</text>`).join("")}
    <line class="zero-line" x1="${pad.left}" y1="${y(0)}" x2="${width - pad.right}" y2="${y(0)}"/>
    ${points.map((point) => `<circle class="${point.pnl >= 0 ? "dot-green" : "dot-red"}" cx="${x(point.x)}" cy="${y(point.y)}" r="3" opacity=".9"/>
      <circle class="chart-hit" cx="${x(point.x)}" cy="${y(point.y)}" r="8" data-chart-tip="${escapeHtml(`${mode === "time" ? minutesToTime(point.x) : durationLabel(point.x)}: ${money(point.y)}`)}"/>`).join("")}
    ${xTicks.map((tick) => `<text class="axis-label" x="${x(tick)}" y="${height - 8}" text-anchor="middle">${mode === "time" ? minutesToTime(tick) : durationLabel(tick)}</text>`).join("")}
  </svg>`;
  attachChartTooltip(container);
}

function attachChartTooltip(container) {
  const targets = container.querySelectorAll("[data-chart-tip]");
  if (!targets.length) return;
  const tooltip = getChartTooltip();
  const show = (event) => {
    const target = event.currentTarget;
    tooltip.textContent = target.dataset.chartTip || "";
    tooltip.classList.add("show");
    move(event);
  };
  const move = (event) => {
    const offset = 14;
    tooltip.style.left = `${event.clientX + offset}px`;
    tooltip.style.top = `${event.clientY + offset}px`;
  };
  const hide = () => tooltip.classList.remove("show");
  targets.forEach((target) => {
    target.addEventListener("pointerenter", show);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerleave", hide);
    target.addEventListener("click", show);
  });
}

function getChartTooltip() {
  let tooltip = document.querySelector("#chartTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "chartTooltip";
    tooltip.className = "chart-tooltip";
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function renderMiniGauge(container, value) {
  const pct = clamp(value, 0, 1);
  const size = 58;
  const radius = 20;
  const cx = 29;
  const cy = 30;
  const red = describeArc(cx, cy, radius, -90, 90);
  const green = describeArc(cx, cy, radius, -90, -90 + pct * 180);
  const needleAngle = (-90 + pct * 180) * Math.PI / 180;
  const nx = cx + Math.cos(needleAngle) * 17;
  const ny = cy + Math.sin(needleAngle) * 17;
  container.innerHTML = `<svg class="gauge-svg" viewBox="0 0 ${size} 42" aria-hidden="true">
    <path d="${red}" fill="none" stroke="#ff666d" stroke-width="5" stroke-linecap="round"/>
    <path d="${green}" fill="none" stroke="#43c89a" stroke-width="5" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#7b6ed6" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="2.5" fill="#7b6ed6"/>
    <text x="8" y="40" class="axis-label">${Math.round(pct * 100)}</text>
    <text x="45" y="40" class="axis-label">100</text>
  </svg>`;
}

function renderDonutGauge(container, value) {
  const pct = clamp(value, 0, 1);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  container.innerHTML = `<svg class="gauge-svg" viewBox="0 0 58 42" aria-hidden="true">
    <circle cx="29" cy="21" r="${radius}" fill="none" stroke="#ff666d" stroke-width="5"/>
    <circle cx="29" cy="21" r="${radius}" fill="none" stroke="#43c89a" stroke-width="5"
      stroke-dasharray="${circumference * pct} ${circumference}" transform="rotate(-90 29 21)" stroke-linecap="round"/>
  </svg>`;
}

function computeStats(trades, daily) {
  const closed = trades.filter((trade) => trade.status.toLowerCase() !== "open");
  const wins = closed.filter((trade) => trade.netPnl > 0);
  const losses = closed.filter((trade) => trade.netPnl < 0);
  const grossWin = sum(wins.map((trade) => trade.netPnl));
  const grossLoss = sum(losses.map((trade) => trade.netPnl));
  const dailyRows = Object.values(daily);
  const winDays = dailyRows.filter((day) => day.pnl > 0).length;
  const netPnl = sum(closed.map((trade) => trade.netPnl));
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const tradeWinRate = closed.length ? wins.length / closed.length * 100 : 0;
  const dayWinRate = dailyRows.length ? winDays / dailyRows.length * 100 : 0;
  const profitFactor = grossLoss ? Math.abs(grossWin / grossLoss) : grossWin ? 99 : 0;
  const winLossRatio = avgLoss ? Math.abs(avgWin / avgLoss) : avgWin ? 99 : 0;
  const cumulative = buildCumulativeSeries(daily);
  const drawdown = buildDrawdownSeries(daily);
  const maxDrawdown = Math.min(0, ...drawdown.map((point) => point.value));
  const recoveryFactor = Math.abs(maxDrawdown) ? Math.max(0, netPnl / Math.abs(maxDrawdown)) : 1;
  const consistency = computeConsistency(dailyRows);
  const zellaScore = (
    tradeWinRate * 0.18 +
    Math.min(profitFactor / 2, 1) * 100 * 0.2 +
    Math.min(winLossRatio / 2, 1) * 100 * 0.14 +
    Math.min(recoveryFactor / 2, 1) * 100 * 0.15 +
    Math.max(0, 1 - Math.abs(maxDrawdown) / Math.max(1000, Math.abs(grossLoss))) * 100 * 0.15 +
    consistency * 100 * 0.18
  );

  const latestDate = Object.keys(daily).sort().at(-1);
  const todayKey = latestDate || toDateKey(new Date());
  const today = daily[todayKey];
  const todayScore = today ? 2.5 + Math.sign(today.pnl) * 0.7 + Math.min(1, Math.abs(today.pnl) / 300) : 2;

  return {
    netPnl,
    grossWin,
    grossLoss,
    avgWin,
    avgLoss,
    tradeWinRate,
    dayWinRate,
    profitFactor,
    winLossRatio,
    recoveryFactor,
    maxDrawdown,
    consistency,
    zellaScore,
    todayScore,
  };
}

function groupByDate(trades) {
  return trades.reduce((acc, trade) => {
    if (!acc[trade.closeDate]) acc[trade.closeDate] = { date: trade.closeDate, pnl: 0, trades: [] };
    acc[trade.closeDate].pnl = roundCurrency(acc[trade.closeDate].pnl + trade.netPnl);
    acc[trade.closeDate].trades.push(trade);
    return acc;
  }, {});
}

function buildCumulativeSeries(daily) {
  let running = 0;
  return Object.keys(daily).sort().map((date) => {
    running = roundCurrency(running + daily[date].pnl);
    return { date, value: running };
  });
}

function tradeSetup(trade) {
  const raw = state.journals[trade.id]?.strategy;
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function knownSetups() {
  const set = new Set();
  Object.values(state.journals || {}).forEach((entry) => {
    const tag = (entry?.strategy || "").trim();
    if (tag) set.add(tag);
  });
  return [...set].sort();
}

function computeSetupStats(closedTrades) {
  const buckets = new Map();
  const untaggedKey = "(untagged)";
  closedTrades.forEach((trade) => {
    const setup = tradeSetup(trade) || untaggedKey;
    if (!buckets.has(setup)) {
      buckets.set(setup, { setup, count: 0, wins: 0, losses: 0, winSum: 0, lossSum: 0, totalPnl: 0 });
    }
    const bucket = buckets.get(setup);
    bucket.count += 1;
    bucket.totalPnl += Number(trade.netPnl) || 0;
    if (trade.netPnl > 0) {
      bucket.wins += 1;
      bucket.winSum += Number(trade.netPnl) || 0;
    } else if (trade.netPnl < 0) {
      bucket.losses += 1;
      bucket.lossSum += Number(trade.netPnl) || 0;
    }
  });
  return [...buckets.values()].map((bucket) => {
    const winRate = bucket.count ? bucket.wins / bucket.count : 0;
    const avgWin = bucket.wins ? bucket.winSum / bucket.wins : 0;
    const avgLoss = bucket.losses ? bucket.lossSum / bucket.losses : 0;
    const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;
    return {
      ...bucket,
      winRate,
      avgWin,
      avgLoss,
      expectancy: roundCurrency(expectancy),
      totalPnl: roundCurrency(bucket.totalPnl),
    };
  }).sort((a, b) => b.totalPnl - a.totalPnl);
}

function renderSetups(closedTrades) {
  if (!els.setupsTable) return;
  const stats = computeSetupStats(closedTrades);
  const tagged = stats.filter((row) => row.setup !== "(untagged)");
  if (!tagged.length) {
    els.setupsTable.innerHTML = "";
    if (els.setupsEmpty) els.setupsEmpty.hidden = false;
    return;
  }
  if (els.setupsEmpty) els.setupsEmpty.hidden = true;
  // Show tagged setups first, then a single rolled-up "(untagged)" row at the bottom
  const ordered = [...tagged, ...stats.filter((row) => row.setup === "(untagged)")];
  els.setupsTable.innerHTML = ordered.map((row) => {
    const pnlClass = row.totalPnl >= 0 ? "positive" : "negative";
    const expClass = row.expectancy >= 0 ? "positive" : "negative";
    return `<tr>
      <td title="${escapeHtml(row.setup)}">${escapeHtml(row.setup)}</td>
      <td>${row.count}</td>
      <td>${(row.winRate * 100).toFixed(1)}%</td>
      <td class="${expClass}">${money(row.expectancy)}</td>
      <td class="${pnlClass}"><strong>${money(row.totalPnl)}</strong></td>
    </tr>`;
  }).join("");
}

function buildAccountSeries(daily) {
  // If we have a live account balance from the most recent Webull sync, anchor
  // the chart there: starting_balance = current_balance - sum(all trade pnl).
  // Otherwise fall back to the legacy STARTING_BALANCE constant.
  const liveBalance = Number(state.importMeta?.accountBalance?.netLiquidation);
  const sortedDates = Object.keys(daily).sort();
  const totalPnl = sortedDates.reduce((sum, date) => sum + daily[date].pnl, 0);
  const startingBalance = Number.isFinite(liveBalance)
    ? roundCurrency(liveBalance - totalPnl)
    : STARTING_BALANCE;
  let running = startingBalance;
  const points = sortedDates.map((date) => {
    running = roundCurrency(running + daily[date].pnl);
    return { date, value: running };
  });
  return { startingBalance, points };
}

function buildDrawdownSeries(daily) {
  let running = 0;
  let peak = 0;
  return Object.keys(daily).sort().map((date) => {
    running = roundCurrency(running + daily[date].pnl);
    peak = Math.max(peak, running);
    return { date, value: roundCurrency(running - peak) };
  });
}

function applyDateRange(trades) {
  const value = els.dateRange.value;
  if (value === "all") return [...trades];
  const sorted = [...trades].sort((a, b) => a.closeDate.localeCompare(b.closeDate));
  const latest = sorted.length ? parseDateKey(sorted.at(-1).closeDate) : new Date();
  if (value === "month") {
    return sorted.filter((trade) => {
      const date = parseDateKey(trade.closeDate);
      return date.getFullYear() === latest.getFullYear() && date.getMonth() === latest.getMonth();
    });
  }
  const cutoff = new Date(latest);
  cutoff.setDate(cutoff.getDate() - Number(value));
  return sorted.filter((trade) => parseDateKey(trade.closeDate) >= cutoff);
}

function syncMonthToLatestTrade(trades = state.trades) {
  const sorted = [...trades].filter((trade) => trade.closeDate).sort((a, b) => a.closeDate.localeCompare(b.closeDate));
  const latest = sorted.length ? parseDateKey(sorted.at(-1).closeDate) : new Date();
  state.currentMonth = new Date(latest.getFullYear(), latest.getMonth(), 1);
}

function changeMonth(delta) {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + delta, 1);
  renderCalendar(groupByDate(state.filteredTrades.filter(isClosedTrade)));
}

function openJournal(tradeId) {
  const trade = state.trades.find((item) => item.id === tradeId);
  if (!trade) return;
  state.activeTradeId = trade.id;
  const journal = state.journals[trade.id] || {};
  els.journalDate.textContent = formatShortDate(trade.closeDate);
  els.journalTitle.textContent = `${displaySymbol(trade)} trade journal`;
  els.journalPnl.textContent = money(trade.netPnl);
  els.journalPnl.className = trade.netPnl >= 0 ? "positive" : "negative";
  els.journalSide.textContent = displaySide(trade);
  els.journalQty.textContent = String(trade.quantity);
  els.journalDuration.textContent = durationLabel(trade.durationMinutes);
  // Refresh the strategy dropdown with every previously-used setup so the user
  // can pick from history instead of retyping.
  const strategyDatalist = document.querySelector("#journalStrategyOptions");
  if (strategyDatalist) {
    strategyDatalist.innerHTML = knownSetups()
      .map((tag) => `<option value="${escapeHtml(tag)}"></option>`)
      .join("");
  }
  els.journalStrategy.value = journal.strategy || "";
  els.journalEmotion.value = journal.emotion || "Focused";
  els.journalNotes.value = journal.notes || "";
  els.journalLesson.value = journal.lesson || "";
  state.pendingChartImage = journal.chartImage || null;
  renderJournalChart();
  els.journalDialog.showModal();
}

function renderJournalChart() {
  const image = state.pendingChartImage;
  if (image) {
    els.journalChartPreview.src = image;
    els.journalChartPreview.hidden = false;
    els.journalChartZone.hidden = true;
    if (els.journalChartRemove) els.journalChartRemove.hidden = false;
  } else {
    els.journalChartPreview.removeAttribute("src");
    els.journalChartPreview.hidden = true;
    els.journalChartZone.hidden = false;
    if (els.journalChartRemove) els.journalChartRemove.hidden = true;
  }
}

function saveJournal() {
  const tradeId = state.activeTradeId;
  if (!tradeId) return;
  const existing = state.journals[tradeId] || {};
  const next = {
    strategy: els.journalStrategy.value.trim(),
    emotion: els.journalEmotion.value,
    notes: els.journalNotes.value.trim(),
    lesson: els.journalLesson.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  if (state.pendingChartImage) {
    next.chartImage = state.pendingChartImage;
  } else if (existing.chartImage) {
    // chart was explicitly removed
  }
  state.journals[tradeId] = next;
  try {
    persistJournals();
  } catch (error) {
    if (error?.name === "QuotaExceededError" || /quota/i.test(String(error))) {
      showToast("Storage full — try removing the screenshot or clearing older journal images.");
      return;
    }
    throw error;
  }
  state.pendingChartImage = null;
  els.journalDialog.close();
  renderTradesTable();
  renderJournalPage();
  if (state.activeView === "trade") renderTradePage();
  if (state.selectedDay && els.dayDialog.open) {
    openDayDialog(state.selectedDay);
  }
  showToast("Journal saved.");
}

async function ingestJournalImageBlob(blob) {
  if (!blob || !blob.type || !blob.type.startsWith("image/")) return;
  try {
    const compressed = await compressImageBlob(blob, 1600, 0.82);
    state.pendingChartImage = compressed;
    renderJournalChart();
  } catch (error) {
    showToast("Couldn't process that image. Try a smaller screenshot.");
  }
}

function compressImageBlob(blob, maxWidth = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetW = Math.round(img.width * scale);
        const targetH = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, targetW, targetH);
        // JPEG keeps file size sane for chart screenshots (mostly flat colors).
        // For PNG-ish source with text overlays, JPEG @ 0.82 usually still looks sharp.
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(blob);
  });
}

function deleteJournal() {
  if (!state.activeTradeId) return;
  delete state.journals[state.activeTradeId];
  persistJournals();
  els.journalDialog.close();
  renderTradesTable();
  renderJournalPage();
  if (state.activeView === "trade") renderTradePage();
  if (state.selectedDay && els.dayDialog.open) {
    openDayDialog(state.selectedDay);
  }
  showToast("Journal cleared.");
}

function parseCsv(text) {
  const rows = [];
  let current = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      current.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      current.push(field);
      if (current.some((value) => value.trim())) rows.push(current);
      current = [];
      field = "";
    } else {
      field += char;
    }
  }

  current.push(field);
  if (current.some((value) => value.trim())) rows.push(current);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => headers.reduce((record, header, index) => {
    record[header] = (row[index] || "").trim();
    return record;
  }, {}));
}

function pickValue(row, ...names) {
  const key = Object.keys(row || {}).find((candidate) => names.some((name) => normalizeHeader(candidate) === normalizeHeader(name)));
  return key ? row[key] : "";
}

function looksLikeLegacyWebullImport(trades) {
  const optionRows = trades.filter((trade) => isOptionContract(trade.symbol || trade.contract));
  const zeroPnlRows = trades.filter((trade) => Math.abs(number(trade.netPnl)) < 0.000001);
  return optionRows.length >= Math.max(3, trades.length * 0.7) && zeroPnlRows.length === trades.length
    && trades.some((trade) => String(trade.status || "").toLowerCase() === "filled");
}

function legacyTradeToWebullRow(trade) {
  const date = parseDateKey(trade.closeDate);
  const [hours, minutes] = normalizeTime(trade.closeTime).split(":");
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return {
    Symbol: trade.contract || trade.symbol,
    Side: trade.side === "Short" ? "Sell" : "Buy",
    Status: "Filled",
    Filled: trade.quantity,
    "Total Qty": trade.quantity,
    Price: trade.entryPrice || trade.exitPrice,
    "Avg Price": trade.entryPrice || trade.exitPrice,
    "Filled Time": `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()} ${formatTime(date)}:00 EDT`,
  };
}

function parseOptionContract(value) {
  const text = String(value || "").trim().toUpperCase();
  const match = text.match(/^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/);
  if (!match) return null;
  const [, underlying, yy, mm, dd, type, strikeRaw] = match;
  return {
    underlying,
    expiry: `20${yy}-${mm}-${dd}`,
    type: type === "C" ? "Call" : "Put",
    strike: Number(strikeRaw) / 1000,
  };
}

function isOptionContract(value) {
  return Boolean(parseOptionContract(value));
}

function parseBrokerDateTime(value) {
  const raw = String(value || "").trim();
  const zoneMatch = raw.match(/\s+(EDT|EST|PDT|PST|UTC|GMT)$/i);
  const zone = zoneMatch?.[1]?.toUpperCase() || "";
  const text = raw.replace(/\s+(EDT|EST|PDT|PST|UTC|GMT)$/i, "");
  const usMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (usMatch) {
    const year = Number(usMatch[3]) < 100 ? Number(`20${usMatch[3]}`) : Number(usMatch[3]);
    let hours = Number(usMatch[4]);
    const minutes = Number(usMatch[5]);
    const seconds = Number(usMatch[6] || 0);
    const suffix = usMatch[7];
    if (suffix && /pm/i.test(suffix) && hours < 12) hours += 12;
    if (suffix && /am/i.test(suffix) && hours === 12) hours = 0;
    if (zone) {
      const offsets = { EDT: 240, EST: 300, PDT: 420, PST: 480, UTC: 0, GMT: 0 };
      const utc = Date.UTC(year, Number(usMatch[1]) - 1, Number(usMatch[2]), hours, minutes, seconds);
      return new Date(utc + offsets[zone] * 60000);
    }
    return new Date(year, Number(usMatch[1]) - 1, Number(usMatch[2]), hours, minutes, seconds);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function displaySide(trade) {
  const side = String(trade.side || "").toUpperCase();
  const optionType = String(trade.optionType || "").toUpperCase();
  if (optionType === "CALL" || optionType === "PUT") {
    // Long-the-contract = bought to open. Short-the-contract = sold to open.
    // Surfacing "LONG PUT" vs "SHORT PUT" removes the bullish/bearish ambiguity
    // that "LONG" alone causes for option traders.
    return `${side} ${optionType}`;
  }
  return side;
}

function displaySymbol(trade) {
  return trade.contract || trade.symbol;
}

function displayInstrument(trade) {
  if (trade.expiry && trade.strike && trade.optionType) {
    return `${formatOptionExpiry(trade.expiry)} ${Number(trade.strike).toLocaleString("en-US")} ${trade.optionType.toUpperCase()}`;
  }
  return displaySymbol(trade);
}

function formatOptionExpiry(value) {
  const date = parseDateKey(value);
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${date.getFullYear()}`;
}

function tradeOpenTime(trade) {
  if (trade.openTime) return trade.openTime;
  const closeMinutes = timeToMinutes(trade.closeTime);
  const openMinutes = closeMinutes - (Number(trade.durationMinutes) || 0);
  return minutesToTime(Math.max(0, openMinutes));
}

function weekdayDate(key) {
  const date = parseDateKey(key);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function hasJournalEntry(tradeId) {
  const journal = state.journals[tradeId];
  return Boolean(journal && (journal.strategy || journal.notes || journal.lesson));
}

function makeTicks(min, max, count) {
  const span = max - min || 1;
  return Array.from({ length: count }, (_, index) => min + span * (index / (count - 1)));
}

function makeDateTicks(series, count) {
  if (!series.length) return [];
  const ticks = [];
  const maxIndex = series.length - 1;
  for (let i = 0; i < count; i++) {
    const index = Math.round(maxIndex * (i / Math.max(1, count - 1)));
    ticks.push({ index, date: series[index].date });
  }
  return ticks.filter((tick, index, arr) => index === 0 || tick.index !== arr[index - 1].index);
}

function polarPoint(cx, cy, radius, index, total) {
  const angle = -Math.PI / 2 + index * (Math.PI * 2 / total);
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function pointString(point) {
  return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = arcPoint(cx, cy, radius, endAngle);
  const end = arcPoint(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function arcPoint(cx, cy, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function computeConsistency(days) {
  if (!days.length) return 0;
  const pnls = days.map((day) => day.pnl);
  const avg = sum(pnls) / pnls.length;
  const variance = sum(pnls.map((pnl) => Math.pow(pnl - avg, 2))) / pnls.length;
  const stdDev = Math.sqrt(variance);
  return clamp(1 - stdDev / Math.max(1, Math.max(...pnls.map(Math.abs))), 0, 1);
}

function estimateDuration(time) {
  const minutes = timeToMinutes(time);
  if (!Number.isFinite(minutes)) return 30;
  return Math.max(5, Math.min(240, Math.round((minutes - 570) * 0.7 + 18)));
}

function timeToMinutes(value) {
  const text = String(value || "10:00").trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 600;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (/pm/i.test(text) && hours < 12) hours += 12;
  if (/am/i.test(text) && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return `${hours}:${String(mins).padStart(2, "0")}`;
}

function durationLabel(minutes) {
  const rounded = Math.round(Number(minutes) || 0);
  if (rounded < 60) return `${rounded}m`;
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function number(value) {
  if (typeof value === "number") return value;
  const cleaned = String(value || "0")
    .replace(/\(([^)]+)\)/, "-$1")
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSide(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("sell") || text.includes("short") || text === "s") return "Short";
  return "Long";
}

function normalizeTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if (!match) return "10:00";
  let hours = Number(match[1]);
  const minutes = match[2];
  const suffix = match[3];
  if (suffix && /pm/i.test(suffix) && hours < 12) hours += 12;
  if (suffix && /am/i.test(suffix) && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function normalizeExecutionTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return "10:00:00";
  let hours = Number(match[1]);
  const minutes = match[2];
  const seconds = match[3] || "00";
  const suffix = match[4];
  if (suffix && /pm/i.test(suffix) && hours < 12) hours += 12;
  if (suffix && /am/i.test(suffix) && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
}

function toDateKey(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  const text = String(value || "").trim();
  const isoMatch = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(Number(isoMatch[2])).padStart(2, "0")}-${String(Number(isoMatch[3])).padStart(2, "0")}`;
  }
  const usMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (usMatch) {
    const year = Number(usMatch[3]) < 100 ? `20${usMatch[3]}` : usMatch[3];
    return `${year}-${String(Number(usMatch[1])).padStart(2, "0")}-${String(Number(usMatch[2])).padStart(2, "0")}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return toDateKey(parsed);
  return toDateKey(new Date());
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(key) {
  const date = parseDateKey(key);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatChartDate(key) {
  const date = parseDateKey(key);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

function chartAnchor(index, maxIndex) {
  if (index === 0) return "start";
  if (index === maxIndex) return "end";
  return "middle";
}

function formatDateTime(date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthShort(date) {
  return date.toLocaleString("en-US", { month: "short" });
}

function money(value) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 0 : 2;
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function moneyCompact(value) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function priceLabel(value) {
  const num = number(value);
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => els.toast.classList.remove("show"), 2800);
}

