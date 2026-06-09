import fs from "fs";
import path from "path";

function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/** Шлях до TTF для PDF (локально, Vercel, standalone). */
export function resolveReportFont(fileName: string): string {
  const candidates = [
    path.join(process.cwd(), "public/fonts", fileName),
    path.join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf", fileName),
  ];

  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }

  throw new Error(`PDF font not found: ${fileName}`);
}

export function getReportFonts(): { regular: string; bold: string } {
  return {
    regular: resolveReportFont("DejaVuSans.ttf"),
    bold: resolveReportFont("DejaVuSans-Bold.ttf"),
  };
}
