import { PDFDocument, rgb } from "pdf-lib";
import type { PriceLineItem } from "@/types/payments";
import fs from "fs/promises";
import path from "path";

const FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/rubik@main/Rubik%5Bwght%5D.ttf";

export interface InvoicePdfInput {
  invoiceNumber: string;
  createdAt: Date;
  businessName: string;
  themeColor?: string;
  clientName: string;
  clientPhone: string;
  lineItems: PriceLineItem[];
  amount: number;
  paymentMethod: string;
}

async function loadHebrewFont(): Promise<ArrayBuffer> {
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error("Failed to load font");
  return res.arrayBuffer();
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

export async function generateInvoicePdfBuffer(input: InvoicePdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBytes = await loadHebrewFont();
  const font = await pdfDoc.embedFont(fontBytes);
  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();
  const brand = input.themeColor ? hexToRgb(input.themeColor) : { r: 0.75, g: 0.15, b: 0.83 };

  let y = height - 50;

  page.drawText(input.businessName, { x: 50, y, size: 20, font, color: rgb(brand.r, brand.g, brand.b) });
  y -= 28;
  page.drawText(`חשבונית / קבלה ${input.invoiceNumber}`, { x: 50, y, size: 14, font });
  y -= 20;
  page.drawText(`תאריך: ${input.createdAt.toLocaleDateString("he-IL")}`, { x: 50, y, size: 11, font });
  y -= 30;

  page.drawText(`לקוחה: ${input.clientName}`, { x: 50, y, size: 12, font });
  y -= 18;
  page.drawText(`טלפון: ${input.clientPhone}`, { x: 50, y, size: 11, font });
  y -= 30;

  page.drawText("פירוט", { x: 50, y, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 22;

  for (const item of input.lineItems) {
    const label = `${item.label}`;
    const amount = `₪${item.amount.toFixed(0)}`;
    page.drawText(label, { x: 50, y, size: 11, font });
    page.drawText(amount, { x: 480, y, size: 11, font });
    y -= 18;
    if (y < 120) break;
  }

  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 24;
  page.drawText(`סה"כ לתשלום: ₪${input.amount.toFixed(0)}`, {
    x: 50,
    y,
    size: 14,
    font,
    color: rgb(brand.r, brand.g, brand.b),
  });
  y -= 22;
  page.drawText(`אמצעי תשלום: ${input.paymentMethod}`, { x: 50, y, size: 10, font });

  return pdfDoc.save();
}

export function getInvoiceStorageDir(userId: string) {
  return path.join(process.cwd(), "storage", "invoices", userId);
}

export async function saveInvoicePdf(
  userId: string,
  invoiceId: string,
  buffer: Uint8Array
): Promise<string> {
  const dir = getInvoiceStorageDir(userId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${invoiceId}.pdf`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "מזומן",
  card: "אשראי",
  bit: "ביט",
  paypal: "PayPal",
  other: "אחר",
};
