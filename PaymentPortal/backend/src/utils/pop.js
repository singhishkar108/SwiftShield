//backend/src/utils/pop.js
import PDFDocument from "pdfkit";
import { decrypt } from "./crypto.js";

export function buildPopPdfBuffer(payment) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Proof of Payment", { align: "center" }).moveDown();
    doc.fontSize(12)
      .text(`Reference: ${payment.popRef || payment._id}`)
      .text(`Date: ${new Date(payment.completedAt || Date.now()).toLocaleString()}`)
      .moveDown()
      .text(`Amount: ${Number(payment.amount).toFixed(2)} ${payment.currency}`)
      .text(`Provider: ${payment.provider}`)
      .moveDown()
      .text("Beneficiary:")
      .text(`  ${payment.beneficiaryName}`)
      .text(`  Account: ${decrypt(payment.beneficiaryAccountEnc)}`)
      .text(`  SWIFT/BIC: ${payment.beneficiarySwift}`);

    doc.end();
  });
}
