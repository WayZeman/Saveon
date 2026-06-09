import PDFDocument from "pdfkit";
import type { ReportData } from "./report-data";
import { getReportFonts } from "./report-fonts";

const MARGIN = 48;
const PAGE_BOTTOM = 792 - MARGIN;

function formatUah(amount: number): string {
  return `${new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ₴`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
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

function ensureSpace(doc: InstanceType<typeof PDFDocument>, needed: number) {
  if (doc.y + needed > PAGE_BOTTOM) doc.addPage();
}

type ReportFonts = { regular: string; bold: string };

function sectionTitle(doc: InstanceType<typeof PDFDocument>, fonts: ReportFonts, title: string) {
  ensureSpace(doc, 40);
  doc.moveDown(0.5);
  doc.font(fonts.bold).fontSize(13).fillColor("#111111").text(title);
  doc.moveDown(0.35);
  doc
    .strokeColor("#cccccc")
    .lineWidth(0.5)
    .moveTo(MARGIN, doc.y)
    .lineTo(547, doc.y)
    .stroke();
  doc.moveDown(0.5);
}

function drawSummaryRow(
  doc: InstanceType<typeof PDFDocument>,
  fonts: ReportFonts,
  label: string,
  value: string,
  color = "#111111"
) {
  const y = doc.y;
  doc.font(fonts.regular).fontSize(11).fillColor("#555555").text(label, MARGIN, y, { width: 280 });
  doc.font(fonts.bold).fontSize(11).fillColor(color).text(value, 330, y, { width: 217, align: "right" });
  doc.y = y + 18;
}

export function buildReportPdf(data: ReportData): Promise<Buffer> {
  const fonts = getReportFonts();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font(fonts.bold).fontSize(22).fillColor("#0a84ff").text("Saveon");
    doc.font(fonts.regular).fontSize(12).fillColor("#444444").text("Фінансовий звіт");
    doc.moveDown(0.75);

    doc.font(fonts.regular).fontSize(10).fillColor("#666666");
    doc.text(`Користувач: ${data.userName}`);
    if (data.userEmail) doc.text(`Email: ${data.userEmail}`);
    doc.text(`Період: ${formatDate(data.periodFrom)} — ${formatDate(data.periodTo)}`);
    doc.text(`Згенеровано: ${formatDateTime(data.generatedAt)}`);
    if (data.hasPartner) doc.text("Дані включають спільні транзакції з партнером");

    sectionTitle(doc, fonts, "Підсумок за період");
    drawSummaryRow(doc, fonts, "Доходи", formatUah(data.totalIncome), "#27b554");
    drawSummaryRow(doc, fonts, "Витрати", formatUah(data.totalExpense), "#f24747");
    drawSummaryRow(doc, fonts, "Чиста зміна", formatUah(data.netChange), data.netChange >= 0 ? "#27b554" : "#f24747");

    if (data.categoryRows.length > 0) {
      sectionTitle(doc, fonts, "Рух по категоріях");
      const colX = [MARGIN, 220, 320, 420];
      ensureSpace(doc, 24);
      const headerY = doc.y;
      doc.font(fonts.bold).fontSize(9).fillColor("#888888");
      doc.text("Категорія", colX[0], headerY, { width: 190 });
      doc.text("Дохід", colX[1], headerY, { width: 90, align: "right" });
      doc.text("Витрата", colX[2], headerY, { width: 90, align: "right" });
      doc.text("Нетто", colX[3], headerY, { width: 127, align: "right" });
      doc.y = headerY + 16;

      for (const row of data.categoryRows) {
        ensureSpace(doc, 16);
        const y = doc.y;
        doc.font(fonts.regular).fontSize(9).fillColor("#222222");
        doc.text(row.name, colX[0], y, { width: 190 });
        doc.text(row.income > 0 ? formatUah(row.income) : "—", colX[1], y, { width: 90, align: "right" });
        doc.text(row.expense > 0 ? formatUah(row.expense) : "—", colX[2], y, { width: 90, align: "right" });
        doc.fillColor(row.net >= 0 ? "#27b554" : "#f24747").text(formatUah(row.net), colX[3], y, { width: 127, align: "right" });
        doc.y = y + 14;
      }
    }

    if (data.goals.length > 0) {
      sectionTitle(doc, fonts, "Активні цілі (на момент звіту)");
      for (const goal of data.goals) {
        ensureSpace(doc, 28);
        doc.font(fonts.bold).fontSize(10).fillColor("#222222").text(goal.title);
        doc.font(fonts.regular).fontSize(9).fillColor("#555555");
        doc.text(
          `Ціль: ${formatUah(goal.targetAmount)} · Зібрано: ${formatUah(goal.balanceUsed)} · ${goal.progressPercent.toFixed(0)}%`
        );
        doc.moveDown(0.25);
      }
    }

    sectionTitle(doc, fonts, "Транзакції");
    if (data.transactions.length === 0) {
      doc.font(fonts.regular).fontSize(10).fillColor("#888888").text("За обраний період транзакцій немає.");
    } else {
      const txCols = [MARGIN, 95, 155, 290, 420];
      ensureSpace(doc, 24);
      let headerY = doc.y;
      doc.font(fonts.bold).fontSize(8).fillColor("#888888");
      doc.text("Дата", txCols[0], headerY, { width: 75 });
      doc.text("Тип", txCols[1], headerY, { width: 52 });
      doc.text("Опис", txCols[2], headerY, { width: 125 });
      doc.text("Хто", txCols[3], headerY, { width: 120 });
      doc.text("Сума", txCols[4], headerY, { width: 127, align: "right" });
      doc.y = headerY + 14;

      for (const tx of data.transactions) {
        ensureSpace(doc, 14);
        const y = doc.y;
        const typeLabel = tx.type === "income" ? "Дохід" : "Витрата";
        const desc =
          tx.type === "expense" && tx.sourceCategoryName
            ? `${tx.categoryName} ← ${tx.sourceCategoryName}`
            : tx.categoryName;
        const amountPrefix = tx.type === "income" ? "+" : "−";
        const amountColor = tx.type === "income" ? "#27b554" : "#f24747";

        doc.font(fonts.regular).fontSize(8).fillColor("#333333");
        doc.text(
          tx.date.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit" }),
          txCols[0],
          y,
          { width: 75 }
        );
        doc.text(typeLabel, txCols[1], y, { width: 52 });
        doc.text(desc, txCols[2], y, { width: 125 });
        doc.text(tx.ownerLabel, txCols[3], y, { width: 120 });
        doc.fillColor(amountColor).text(`${amountPrefix}${formatUah(tx.amount)}`, txCols[4], y, {
          width: 127,
          align: "right",
        });
        doc.y = y + 12;
      }
    }

    doc.end();
  });
}
