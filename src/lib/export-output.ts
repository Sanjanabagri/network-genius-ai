import { saveAs } from "file-saver";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "netassist-output";
}

export async function exportAsPdf(title: string, content: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin, margin);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`NetAssist AI · ${new Date().toLocaleString()}`, margin, margin + 16);

  doc.setTextColor(20);
  doc.setFont("courier", "normal");
  doc.setFontSize(10);

  const lineHeight = 12;
  let y = margin + 44;
  const lines = doc.splitTextToSize(content, maxWidth);
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  doc.save(`${slugify(title)}.pdf`);
}

export async function exportAsDocx(title: string, content: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  const bodyParagraphs = content.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line || " ", font: "Consolas", size: 20 })],
      }),
  );

  const doc = new Document({
    creator: "NetAssist AI",
    title,
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: title, bold: true, size: 32 })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `NetAssist AI · ${new Date().toLocaleString()}`,
                italics: true,
                color: "808080",
                size: 18,
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun(" ")] }),
          ...bodyParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slugify(title)}.docx`);
}
