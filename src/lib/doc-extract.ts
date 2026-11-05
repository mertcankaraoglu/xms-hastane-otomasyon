// Browser-only text extraction for knowledge base uploads. Libraries are
// imported dynamically so they never load during SSR.
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      let line = "";
      const lines: string[] = [];
      for (const it of tc.items as { str?: string; hasEOL?: boolean }[]) {
        line += it.str ?? "";
        if (it.hasEOL) { lines.push(line); line = ""; }
      }
      if (line) lines.push(line);
      pages.push(lines.join("\n"));
    }
    return pages.join("\n\n");
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value;
  }
  if (/\.(txt|md|csv)$/.test(name)) return await file.text();
  throw new Error("Desteklenen türler: PDF, DOCX, TXT, MD");
}
