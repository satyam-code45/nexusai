import { useRef, useState } from "react";

export function useSnippingTool() {
  const pdfWrapperRef = useRef<HTMLDivElement | null>(null);

  const [snipMode, setSnipMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const start = useRef({ x: 0, y: 0 });
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function onMouseDown(e: React.MouseEvent) {
    if (!snipMode || !pdfWrapperRef.current) return;

    const el = pdfWrapperRef.current;
    const bounds = el.getBoundingClientRect();

    start.current = {
      x: e.clientX - bounds.left + el.scrollLeft,
      y: e.clientY - bounds.top + el.scrollTop,
    };

    setRect({ x: start.current.x, y: start.current.y, w: 0, h: 0 });
    setDragging(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !snipMode || !pdfWrapperRef.current) return;

    const el = pdfWrapperRef.current;
    const bounds = el.getBoundingClientRect();

    const x = e.clientX - bounds.left + el.scrollLeft;
    const y = e.clientY - bounds.top + el.scrollTop;

    setRect({
      x: Math.min(x, start.current.x),
      y: Math.min(y, start.current.y),
      w: Math.abs(x - start.current.x),
      h: Math.abs(y - start.current.y),
    });
  }

  async function onMouseUp() {
    if (!rect || rect.w < 4 || rect.h < 4 || !pdfWrapperRef.current) {
      setDragging(false);
      setRect(null);
      setSnipMode(false);
      return;
    }

    setDragging(false);
    setLoading(true);

    try {
      const wrapper = pdfWrapperRef.current;
      const scale = window.devicePixelRatio || 1;

      // Find all react-pdf canvas elements inside the wrapper
      const canvases = Array.from(wrapper.querySelectorAll("canvas")) as HTMLCanvasElement[];

      if (canvases.length === 0) {
        setLoading(false);
        setRect(null);
        setSnipMode(false);
        return;
      }

      // Build a composite canvas covering the full scrollable content
      const wrapperScrollWidth = wrapper.scrollWidth;
      const wrapperScrollHeight = wrapper.scrollHeight;

      const composite = document.createElement("canvas");
      composite.width = wrapperScrollWidth * scale;
      composite.height = wrapperScrollHeight * scale;
      const ctx = composite.getContext("2d")!;
      ctx.scale(scale, scale);

      // Paint each pdf canvas onto the composite at its position relative to the wrapper
      for (const canvas of canvases) {
        const canvasBounds = canvas.getBoundingClientRect();
        const wrapperBounds = wrapper.getBoundingClientRect();

        const relX = canvasBounds.left - wrapperBounds.left + wrapper.scrollLeft;
        const relY = canvasBounds.top - wrapperBounds.top + wrapper.scrollTop;

        try {
          // Render canvas contents onto composite (may throw if tainted)
          ctx.drawImage(canvas, relX, relY, canvasBounds.width, canvasBounds.height);
        } catch {
          // Tainted canvas — skip; the crop will be blank for that region
        }
      }

      // Crop to the selection rectangle
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(rect.w * scale);
      cropCanvas.height = Math.round(rect.h * scale);
      const cropCtx = cropCanvas.getContext("2d")!;

      cropCtx.drawImage(
        composite,
        rect.x * scale,
        rect.y * scale,
        rect.w * scale,
        rect.h * scale,
        0,
        0,
        rect.w * scale,
        rect.h * scale
      );

      cropCanvas.toBlob((newBlob) => {
        if (!newBlob) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(newBlob);
        setBlob(newBlob);
        setPreviewUrl(url);
      }, "image/png");
    } catch (err) {
      console.error("[snip] capture failed:", err);
    } finally {
      setLoading(false);
      setRect(null);
      setSnipMode(false);
    }
  }

  return {
    loading,
    blob,
    previewUrl,
    snipMode,
    setSnipMode,
    rect,
    setRect,
    pdfWrapperRef,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
}
