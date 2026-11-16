"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut } from "lucide-react";

interface PdfPagePreviewProps {
  pdfBytes: Uint8Array | null;
  pdfPassword?: string;
  activePage: number;
  onPageChange: (nextPage: number) => void;
}

export default function PdfPagePreview({
  pdfBytes,
  pdfPassword,
  activePage,
  onPageChange,
}: PdfPagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBytes || pdfBytes.byteLength === 0) return;

    let cancelled = false;
    let activeRenderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    const renderPage = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }
        const loadingTask = pdfjs.getDocument({
          data: pdfBytes.slice(),
          password: pdfPassword,
        });
        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        const maxPages = Math.max(1, pdfDoc.numPages);
        setTotalPages(maxPages);
        setStatusMessage(null);

        const safePage = Math.min(Math.max(1, activePage), maxPages);
        const page = await pdfDoc.getPage(safePage);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const baseViewport = page.getViewport({ scale: 1.0 });
        // Fit reasonably inside side-by-side panel width (~440px base) * zoom
        const containerScale = (440 / baseViewport.width) * zoom;
        const viewport = page.getViewport({ scale: containerScale * dpr });

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        activeRenderTask = page.render({ canvas, viewport });
        await activeRenderTask.promise;
      } catch (err) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        if (name === "RenderingCancelledException") return;
        setStatusMessage("Preview unavailable for text-only paste/CSV input.");
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      try {
        activeRenderTask?.cancel();
      } catch {
        // Ignore cancellation cleanup errors
      }
    };
  }, [pdfBytes, pdfPassword, activePage, zoom]);

  return (
    <div className="flex h-full flex-col bg-slate-100/90">
      {/* Compact Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
          <FileText className="h-3.5 w-3.5 text-blue-600" />
          Original PDF Preview
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, activePage - 1))}
            disabled={activePage <= 1 || !pdfBytes}
            aria-label="Previous PDF page"
            className="rounded border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="mono-nums min-w-[68px] text-center text-[11px] font-medium text-slate-600">
            Page {Math.min(activePage, totalPages)} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, activePage + 1))}
            disabled={activePage >= totalPages || !pdfBytes}
            aria-label="Next PDF page"
            className="rounded border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-3.5 w-px bg-slate-300" />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
            disabled={zoom <= 0.75 || !pdfBytes}
            aria-label="Zoom out PDF preview"
            className="rounded border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="mono-nums w-9 text-center text-[11px] font-medium text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.25).toFixed(2))))}
            disabled={zoom >= 1.5 || !pdfBytes}
            aria-label="Zoom in PDF preview"
            className="rounded border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Canvas Viewport */}
      <div className="flex max-h-[500px] min-h-[340px] flex-1 items-start justify-center overflow-auto p-3 sm:p-4">
        {pdfBytes && !statusMessage ? (
          <canvas
            ref={canvasRef}
            className="max-w-full rounded-lg border border-slate-300 bg-white shadow-sm"
          />
        ) : (
          <div className="flex h-64 flex-col items-center justify-center px-6 text-center text-xs text-slate-500">
            <FileText className="mb-2 h-7 w-7 text-slate-400" />
            <p className="font-medium text-slate-600">
              {statusMessage ?? "No binary PDF loaded for preview."}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Drop a PDF file or click any sample statement to preview original PDF pages alongside the extracted spreadsheet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
