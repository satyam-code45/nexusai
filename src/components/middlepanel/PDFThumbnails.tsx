import { memo } from "react";
import { Document, Page } from "react-pdf";

export const PDFThumbnails = memo(function PDFThumbnails({
  url,
  numPages,
  pageNumber,
  onSelect,
}: {
  url: string;
  numPages: number;
  pageNumber: number;
  onSelect: (page: number) => void;
}) {
  return (
    <aside className="w-28 shrink-0 overflow-y-auto border-r bg-muted/30 p-2">
      <Document file={url}>
        {Array.from({ length: numPages }, (_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i + 1)}
            className={`mb-2 border rounded overflow-hidden w-full ${
              pageNumber === i + 1
                ? "border-blue-500"
                : "border-border"
            }`}
          >
            <Page
              pageNumber={i + 1}
              width={80}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </button>
        ))}
      </Document>
    </aside>
  );
});




