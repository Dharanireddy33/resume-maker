export const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!file) return 'No file selected.';
  if (file.size > MAX_FILE_SIZE) return 'File is too large. Maximum size is 5 MB.';
  const name = file.name.toLowerCase();
  const isValidType = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!isValidType) return 'Unsupported file format. Please upload a PDF or DOCX file.';
  return null;
}

let pdfjsPromise: Promise<any> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      const workerUrl = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    return extractPdfText(file);
  }
  if (name.endsWith('.docx')) {
    return extractDocxText(file);
  }
  throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjs = await getPdfjs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ');
      textParts.push(pageText);
    }
    const text = textParts.join('\n').trim();
    if (!text) throw new Error('Could not extract any text from the PDF. It may be a scanned image.');
    return text;
  } catch (err) {
    if (err instanceof Error && err.message.includes('scanned image')) throw err;
    throw new Error('Failed to read the PDF file. Please ensure it is a valid, text-based PDF.');
  }
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();
    if (!text) throw new Error('Could not extract any text from the DOCX file.');
    return text;
  } catch {
    throw new Error('Failed to read the DOCX file. Please ensure it is a valid Word document.');
  }
}
