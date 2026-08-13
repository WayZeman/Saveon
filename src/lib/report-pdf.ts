import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type { ReportData } from "./report-data";
import { getReportFonts } from "./report-fonts";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 44;
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT = PAGE_W - MARGIN;
const FOOTER_Y = PAGE_H - 36;

const C = {
  brand: "#0a84ff",
  brandDark: "#0660c7",
  ink: "#141820",
  inkSecondary: "#4a5568",
  inkMuted: "#8a95a8",
  border: "#e2e8f0",
  surface: "#f6f8fc",
  surfaceAlt: "#eef2f8",
  white: "#ffffff",
  income: "#1a9d4f",
  expense: "#e04545",
  incomeBg: "#e8f7ee",
  expenseBg: "#fdeeee",
  netPosBg: "#e8f2ff",
  netNegBg: "#fdeeee",
};

type ReportFonts = { regular: string; bold: string };
type Doc = InstanceType<typeof PDFDocument>;

function formatUah(amount: number): string {
  return `${new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ₴`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function contentBottom(doc: Doc): number {
  return FOOTER_Y - 14;
}

function startContentPage(doc: Doc) {
  drawPageChrome(doc);
  doc.x = MARGIN;
  doc.y = 52;
}

function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > contentBottom(doc)) {
    doc.addPage();
    startContentPage(doc);
  }
}

function drawPageChrome(doc: Doc) {
  doc.save();
  doc.strokeColor(C.border).lineWidth(0.5);
  doc.moveTo(MARGIN, FOOTER_Y - 8).lineTo(RIGHT, FOOTER_Y - 8).stroke();
  doc.restore();
}

function drawCoverHeader(doc: Doc, fonts: ReportFonts, data: ReportData) {
  const headerH = 128;

  doc.save();
  doc.rect(0, 0, PAGE_W, headerH).fill(C.brand);
  doc.rect(0, headerH - 28, PAGE_W, 28).fill(C.brandDark);
  doc.restore();

  const logoPath = path.join(process.cwd(), "public/icon-192.png");
  const logoX = MARGIN;
  const logoY = 36;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, logoX, logoY, { width: 40, height: 40 });
  }

  const textX = fs.existsSync(logoPath) ? logoX + 50 : logoX;
  doc.font(fonts.bold).fontSize(26).fillColor(C.white).text("Saveon", textX, logoY + 2);
  doc.font(fonts.regular).fontSize(11).fillColor("#e8f4ff").text("Звіт про інвестиції та заощадження", textX, logoY + 32);

  doc.font(fonts.regular).fontSize(9).fillColor(C.white);
  doc.text(formatDateTime(data.generatedAt), MARGIN, headerH - 22, { width: CONTENT_W, align: "right" });

  doc.y = headerH + 22;

  const metaY = doc.y;
  const metaH = data.hasPartner ? 72 : 58;
  doc.roundedRect(MARGIN, metaY, CONTENT_W, metaH, 10).fill(C.surface);
  doc.roundedRect(MARGIN, metaY, CONTENT_W, metaH, 10).stroke(C.border);

  const colW = CONTENT_W / 2 - 16;
  const leftX = MARGIN + 16;
  const rightX = MARGIN + CONTENT_W / 2 + 4;
  const row1Y = metaY + 14;

  doc.font(fonts.regular).fontSize(8).fillColor(C.inkMuted).text("КЛІЄНТ", leftX, row1Y);
  doc.font(fonts.bold).fontSize(11).fillColor(C.ink).text(data.userName, leftX, row1Y + 12, { width: colW });

  doc.font(fonts.regular).fontSize(8).fillColor(C.inkMuted).text("ПЕРІОД ЗВІТУ", rightX, row1Y);
  doc.font(fonts.bold).fontSize(11).fillColor(C.ink).text(
    `${formatDate(data.periodFrom)} — ${formatDate(data.periodTo)}`,
    rightX,
    row1Y + 12,
    { width: colW }
  );

  if (data.userEmail) {
    doc.font(fonts.regular).fontSize(9).fillColor(C.inkSecondary).text(data.userEmail, leftX, row1Y + 30, { width: colW });
  }

  if (data.hasPartner) {
    doc.font(fonts.regular).fontSize(8).fillColor(C.inkMuted).text("ОХОПЛЕННЯ", rightX, row1Y + 30);
    doc.font(fonts.regular).fontSize(9).fillColor(C.inkSecondary).text(
      "Спільні дані з партнером",
      rightX,
      row1Y + 42,
      { width: colW }
    );
  }

  doc.y = metaY + metaH + 22;
}

function drawSectionHeader(doc: Doc, fonts: ReportFonts, title: string, subtitle?: string, minFollowing = 0) {
  const headerBlock = (subtitle ? 52 : 40) + minFollowing;
  ensureSpace(doc, headerBlock);
  doc.moveDown(0.25);

  const y = doc.y;
  doc.save();
  doc.roundedRect(MARGIN, y, 4, subtitle ? 28 : 18, 2).fill(C.brand);
  doc.restore();

  doc.font(fonts.bold).fontSize(13).fillColor(C.ink).text(title, MARGIN + 12, y);
  if (subtitle) {
    doc.font(fonts.regular).fontSize(9).fillColor(C.inkMuted).text(subtitle, MARGIN + 12, y + 16, { width: CONTENT_W - 12 });
    doc.y = y + 34;
  } else {
    doc.y = y + 22;
  }
  doc.moveDown(0.35);
}

function drawKpiCard(
  doc: Doc,
  fonts: ReportFonts,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent: string,
  bg: string
) {
  doc.roundedRect(x, y, w, h, 10).fill(bg);
  doc.roundedRect(x, y, w, h, 10).stroke(C.border);
  doc.save();
  doc.roundedRect(x, y, w, 4, 10).clip();
  doc.rect(x, y, w, 4).fill(accent);
  doc.restore();

  doc.font(fonts.regular).fontSize(8).fillColor(C.inkMuted).text(label.toUpperCase(), x + 14, y + 16, { width: w - 28 });
  doc.font(fonts.bold).fontSize(14).fillColor(accent).text(value, x + 14, y + 32, { width: w - 28 });
}

function drawSummarySection(doc: Doc, fonts: ReportFonts, data: ReportData) {
  const cardH = 68;
  drawSectionHeader(doc, fonts, "Підсумок за період", "Ключові показники інвестицій та заощаджень", cardH + 56);

  const gap = 10;
  const cardW = (CONTENT_W - gap * 2) / 3;
  ensureSpace(doc, cardH + 20);
  const y = doc.y;

  drawKpiCard(doc, fonts, MARGIN, y, cardW, cardH, "Вкладення", formatUah(data.totalIncome), C.income, C.incomeBg);
  drawKpiCard(
    doc,
    fonts,
    MARGIN + cardW + gap,
    y,
    cardW,
    cardH,
    "Вилучення",
    formatUah(data.totalExpense),
    C.expense,
    C.expenseBg
  );
  drawKpiCard(
    doc,
    fonts,
    MARGIN + (cardW + gap) * 2,
    y,
    cardW,
    cardH,
    "Заощаджено",
    formatUah(data.netChange),
    data.netChange >= 0 ? C.brand : C.expense,
    data.netChange >= 0 ? C.netPosBg : C.netNegBg
  );

  doc.y = y + cardH + 12;

  if (data.savingsRate != null) {
    ensureSpace(doc, 36);
    const rateY = doc.y;
    doc.roundedRect(MARGIN, rateY, CONTENT_W, 32, 8).fill(C.surface);
    doc.roundedRect(MARGIN, rateY, CONTENT_W, 32, 8).stroke(C.border);
    doc.font(fonts.regular).fontSize(9).fillColor(C.inkMuted).text("НОРМА ЗАОЩАДЖЕНЬ ЗА ПЕРІОД", MARGIN + 14, rateY + 10);
    doc.font(fonts.bold).fontSize(12).fillColor(data.savingsRate >= 0 ? C.brand : C.expense).text(
      `${Math.round(data.savingsRate)}%`,
      MARGIN + 14,
      rateY + 8,
      { width: CONTENT_W - 28, align: "right" }
    );
    doc.y = rateY + 44;
  } else {
    doc.y = y + cardH + 20;
  }
}

type TableColumn = { label: string; width: number; align?: "left" | "right" | "center" };

type TableCell = { text: string; color?: string; bold?: boolean };

function measureRowHeight(doc: Doc, fonts: ReportFonts, cols: TableColumn[], cells: TableCell[]): number {
  let maxTextH = 10;
  for (let i = 0; i < cols.length; i++) {
    doc.font(cells[i].bold ? fonts.bold : fonts.regular).fontSize(8.5);
    const h = doc.heightOfString(cells[i].text, { width: cols[i].width - 8 });
    maxTextH = Math.max(maxTextH, h);
  }
  return Math.max(22, Math.ceil(maxTextH) + 14);
}

function drawTableHeader(doc: Doc, fonts: ReportFonts, x: number, y: number, w: number, cols: TableColumn[]) {
  doc.roundedRect(x, y, w, 22, 6).fill(C.surfaceAlt);
  let cx = x + 10;
  doc.font(fonts.bold).fontSize(8).fillColor(C.inkMuted);
  for (const col of cols) {
    doc.text(col.label.toUpperCase(), cx, y + 7, { width: col.width - 8, align: col.align ?? "left" });
    cx += col.width;
  }
}

function drawTableRow(
  doc: Doc,
  fonts: ReportFonts,
  x: number,
  y: number,
  w: number,
  cols: TableColumn[],
  cells: TableCell[],
  alt: boolean,
  rowH: number
) {
  if (alt) doc.rect(x, y, w, rowH).fill(C.surface);
  doc.save();
  doc.strokeColor(C.border).lineWidth(0.5);
  doc.moveTo(x, y + rowH).lineTo(x + w, y + rowH).stroke();
  doc.restore();

  const textY = y + 7;
  let cx = x + 10;
  for (let i = 0; i < cols.length; i++) {
    const cell = cells[i];
    doc.font(cell.bold ? fonts.bold : fonts.regular)
      .fontSize(8.5)
      .fillColor(cell.color ?? C.ink)
      .text(cell.text, cx, textY, { width: cols[i].width - 8, align: cols[i].align ?? "left" });
    cx += cols[i].width;
  }
}

function drawTableContinuationLabel(doc: Doc, fonts: ReportFonts, label: string, y: number): number {
  doc.font(fonts.regular).fontSize(8).fillColor(C.inkMuted).text(label, MARGIN, y, { width: CONTENT_W });
  return y + 16;
}

function renderPaginatedTable(
  doc: Doc,
  fonts: ReportFonts,
  cols: TableColumn[],
  rows: TableCell[][],
  continuedLabel: string
) {
  const tableX = MARGIN;
  const tableW = CONTENT_W;
  const headerH = 22;
  let y = doc.y;
  let isContinued = false;

  const startTableBlock = () => {
    ensureSpace(doc, headerH + 28);
    y = doc.y;
    if (isContinued) {
      y = drawTableContinuationLabel(doc, fonts, continuedLabel, y);
    }
    drawTableHeader(doc, fonts, tableX, y, tableW, cols);
    y += headerH;
    isContinued = true;
    doc.y = y;
  };

  startTableBlock();

  rows.forEach((cells, i) => {
    const rowH = measureRowHeight(doc, fonts, cols, cells);
    if (y + rowH > contentBottom(doc)) {
      doc.addPage();
      startContentPage(doc);
      startTableBlock();
    }
    drawTableRow(doc, fonts, tableX, y, tableW, cols, cells, i % 2 === 1, rowH);
    y += rowH;
    doc.y = y;
  });

  doc.y = y + 12;
}

function drawCategoryTable(doc: Doc, fonts: ReportFonts, data: ReportData) {
  drawSectionHeader(doc, fonts, "Структура портфеля", "Вкладення, вилучення та нетто за обраний період", 50);

  const cols: TableColumn[] = [
    { label: "Категорія", width: 198 },
    { label: "Вкладення", width: 92, align: "right" },
    { label: "Вилучення", width: 92, align: "right" },
    { label: "Нетто", width: 117, align: "right" },
  ];

  const rows = data.categoryRows.map((row) => [
    { text: row.name, bold: true },
    { text: row.income > 0 ? formatUah(row.income) : "—", color: C.inkSecondary },
    { text: row.expense > 0 ? formatUah(row.expense) : "—", color: C.inkSecondary },
    { text: formatUah(row.net), color: row.net >= 0 ? C.income : C.expense, bold: true },
  ]);

  renderPaginatedTable(doc, fonts, cols, rows, "Структура портфеля · продовження");
}

function drawProgressBar(doc: Doc, x: number, y: number, w: number, percent: number) {
  const h = 6;
  const fill = Math.max(0, Math.min(100, percent));
  doc.roundedRect(x, y, w, h, 3).fill(C.border);
  if (fill > 0) {
    doc.roundedRect(x, y, Math.max(6, (w * fill) / 100), h, 3).fill(C.brand);
  }
}

function drawGoalsSection(doc: Doc, fonts: ReportFonts, data: ReportData) {
  const boxH = 52;
  drawSectionHeader(doc, fonts, "Цілі накопичення", "Прогрес заощаджень на момент формування звіту", boxH + 16);

  for (const goal of data.goals) {
    if (doc.y + boxH + 8 > contentBottom(doc)) {
      doc.addPage();
      startContentPage(doc);
    }
    const y = doc.y;

    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 10).fill(C.white);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 10).stroke(C.border);

    doc.font(fonts.bold).fontSize(10).fillColor(C.ink).text(goal.title, MARGIN + 14, y + 12, { width: CONTENT_W - 100 });
    doc.font(fonts.bold).fontSize(10).fillColor(C.brand).text(
      `${goal.progressPercent.toFixed(0)}%`,
      MARGIN + 14,
      y + 12,
      { width: CONTENT_W - 28, align: "right" }
    );

    drawProgressBar(doc, MARGIN + 14, y + 30, CONTENT_W - 28, goal.progressPercent);

    doc.font(fonts.regular).fontSize(8.5).fillColor(C.inkSecondary);
    doc.text(
      `Ціль ${formatUah(goal.targetAmount)}  ·  Зібрано ${formatUah(goal.balanceUsed)}`,
      MARGIN + 14,
      y + 40,
      { width: CONTENT_W - 28 }
    );

    doc.y = y + boxH + 8;
  }

  doc.moveDown(0.5);
}

function drawTransactionsSection(doc: Doc, fonts: ReportFonts, data: ReportData) {
  drawSectionHeader(doc, fonts, "Транзакції", "Деталізація операцій за період", 50);

  if (data.transactions.length === 0) {
    ensureSpace(doc, 40);
    const y = doc.y;
    doc.roundedRect(MARGIN, y, CONTENT_W, 44, 10).fill(C.surface);
    doc.font(fonts.regular).fontSize(10).fillColor(C.inkMuted).text(
      "За обраний період транзакцій немає.",
      MARGIN + 16,
      y + 16,
      { width: CONTENT_W - 32, align: "center" }
    );
    doc.y = y + 56;
    return;
  }

  const cols: TableColumn[] = [
    { label: "Дата", width: 78 },
    { label: "Категорія", width: 277 },
    { label: "Сума", width: 145, align: "right" },
  ];

  const rows = data.transactions.map((tx) => {
    const desc =
      tx.type === "expense" && tx.sourceCategoryName
        ? `${tx.categoryName} ← ${tx.sourceCategoryName}`
        : tx.categoryName;
    const amountPrefix = tx.type === "income" ? "+" : "−";
    const amountColor = tx.type === "income" ? C.income : C.expense;

    return [
      { text: formatDateShort(tx.date), color: C.inkSecondary },
      { text: desc },
      { text: `${amountPrefix}${formatUah(tx.amount)}`, color: amountColor, bold: true },
    ];
  });

  renderPaginatedTable(doc, fonts, cols, rows, "Транзакції · продовження");
}

function drawFooters(doc: Doc, fonts: ReportFonts, generatedAt: Date) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    drawPageChrome(doc);
    doc.font(fonts.regular).fontSize(7.5).fillColor(C.inkMuted);
    doc.text("Saveon · Конфіденційний звіт аналітики", MARGIN, FOOTER_Y, { width: 280 });
    doc.text(`Сторінка ${i - range.start + 1} з ${range.count}`, 0, FOOTER_Y, {
      width: PAGE_W,
      align: "center",
    });
    doc.text(formatDateTime(generatedAt), 0, FOOTER_Y, { width: PAGE_W - MARGIN, align: "right" });
  }
}

export function buildReportPdf(data: ReportData): Promise<Buffer> {
  const fonts = getReportFonts();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      info: {
        Title: `Saveon — звіт ${formatDateShort(data.periodFrom)} – ${formatDateShort(data.periodTo)}`,
        Author: "Saveon",
        Subject: "Звіт про інвестиції та заощадження",
      },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawCoverHeader(doc, fonts, data);
    drawSummarySection(doc, fonts, data);

    if (data.categoryRows.length > 0) {
      drawCategoryTable(doc, fonts, data);
    }

    if (data.goals.length > 0) {
      drawGoalsSection(doc, fonts, data);
    }

    drawTransactionsSection(doc, fonts, data);
    drawFooters(doc, fonts, data.generatedAt);

    doc.end();
  });
}
