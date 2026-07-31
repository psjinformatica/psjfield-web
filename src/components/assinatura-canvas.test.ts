import { describe, expect, it } from "vitest";

import { canvasParaPng } from "@/components/assinatura-canvas";

describe("canvasParaPng", () => {
  it("aguarda o callback assíncrono de toBlob antes de resolver", async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
    const canvas = {
      width: 900,
      height: 570,
      getContext: () => ({}) as CanvasRenderingContext2D,
      toBlob: (callback: BlobCallback) => queueMicrotask(() => callback(png)),
    };

    await expect(canvasParaPng(canvas)).resolves.toBe(png);
  });

  it("retorna null somente quando canvas, dimensões ou contexto são inválidos", async () => {
    await expect(canvasParaPng(null)).resolves.toBeNull();
    await expect(canvasParaPng({
      width: 0,
      height: 570,
      getContext: () => ({}) as CanvasRenderingContext2D,
      toBlob: () => undefined,
    })).resolves.toBeNull();
  });
});
