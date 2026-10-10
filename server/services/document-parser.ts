import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  charCount: number;
}

export class DocumentParser {
  private static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  private static MAX_TEXT_LENGTH = 50_000; // 50,000 characters

  /**
   * Validates and parses uploaded resume file buffer into clean plain text.
   * Performs file signature (magic byte) verification to prevent masquerading files.
   */
  static async parseBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<ParsedDocument> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Uploaded document is empty (0 bytes).');
    }

    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new Error('File exceeds maximum size limit of 5 MB.');
    }

    // Sanitize filename to prevent directory traversal or control char issues
    const safeName = originalName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 150);
    const ext = safeName.split('.').pop()?.toLowerCase();
    let text = '';
    let fileType: 'pdf' | 'docx' | 'txt';

    // 1. PDF File Check & Signature Validation
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      fileType = 'pdf';
      const headerSnippet = buffer.subarray(0, Math.min(1024, buffer.length)).toString('latin1');
      if (!headerSnippet.includes('%PDF-')) {
        throw new Error(
          'Invalid PDF file signature. The uploaded file does not match standard PDF specifications.'
        );
      }

      try {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const res = await parser.getText();
        text = res.text || '';
        await parser.destroy();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Strip any absolute filesystem paths from upstream parser error messages
        const cleanMsg = msg.replace(/[A-Za-z]:\\[^:\s]+|\/[^:\s]+/g, '[redacted_path]');
        throw new Error(
          `Failed to parse PDF document: ${cleanMsg}. If this is a scanned image, please provide selectable text.`
        );
      }
    }
    // 2. DOCX File Check & Signature Validation (ZIP archive with PK\x03\x04)
    else if (
      ext === 'docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      fileType = 'docx';
      const isZip =
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04;

      if (!isZip) {
        throw new Error(
          'Invalid DOCX file signature. The uploaded Word document does not match standard OpenXML packaging.'
        );
      }

      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || '';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const cleanMsg = msg.replace(/[A-Za-z]:\\[^:\s]+|\/[^:\s]+/g, '[redacted_path]');
        throw new Error(`Failed to parse DOCX document: ${cleanMsg}.`);
      }
    }
    // 3. Plain Text Check & Binary Executable Rejection
    else if (ext === 'txt' || mimeType.startsWith('text/')) {
      fileType = 'txt';

      // Disallow binary files disguised as text (PE executable, ELF, Mach-O, ZIP, etc.)
      const isPeExe = buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a; // 'MZ'
      const isElf =
        buffer.length >= 4 &&
        buffer[0] === 0x7f &&
        buffer[1] === 0x45 &&
        buffer[2] === 0x4c &&
        buffer[3] === 0x46; // '\x7fELF'
      const isZip =
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04;

      if (isPeExe || isElf || isZip) {
        throw new Error(
          'Binary or executable file detected. Executable binaries are strictly prohibited.'
        );
      }

      // Check for excessive binary null bytes in initial sample
      const sample = buffer.subarray(0, Math.min(512, buffer.length));
      let nullCount = 0;
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) nullCount++;
      }
      if (nullCount > 2) {
        throw new Error('File contains unreadable binary data. Only plain UTF-8 text is accepted.');
      }

      text = buffer.toString('utf-8');
    } else {
      throw new Error(
        `Unsupported file format: .${ext || 'unknown'}. Proofline AI supports PDF (.pdf), Word (.docx), and plain text (.txt).`
      );
    }

    // Sanitize text and prevent prompt injection boundary escapes
    let sanitized = this.sanitizeText(text);

    if (sanitized.trim().length < 30) {
      throw new Error(
        'Document contained insufficient readable text. Please ensure the resume has selectable text, not scanned images.'
      );
    }

    // Bound maximum text length to prevent context window exhaustion / DoS
    if (sanitized.length > this.MAX_TEXT_LENGTH) {
      sanitized = sanitized.slice(0, this.MAX_TEXT_LENGTH);
    }

    return {
      text: sanitized,
      fileName: safeName,
      fileType,
      charCount: sanitized.length,
    };
  }

  /**
   * Sanitizes text:
   * - Removes null bytes and unprintable control characters.
   * - Strips prompt delimiter injection strings to prevent escaping AI untrusted boundaries.
   */
  static sanitizeText(raw: string): string {
    return raw
      .replace(/\0/g, '') // remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // remove unprintable control chars
      .replace(/=== UNTRUSTED RESUME (START|END) ===/gi, '') // prevent delimiter injection
      .replace(/<resume_document>|<\/resume_document>/gi, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }
}
