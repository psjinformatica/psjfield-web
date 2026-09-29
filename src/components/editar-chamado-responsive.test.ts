import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("responsividade da edição de chamado", () => {
  it("empilha campos e ações no celular sem truncar textos longos", async () => {
    const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
    const mobile = css.slice(css.indexOf("@media (max-width: 640px)"));
    expect(mobile).toContain(".edit-call-grid { grid-template-columns: 1fr; }");
    expect(mobile).toContain(".edit-call-actions { align-items: stretch; flex-direction: column-reverse;");
    expect(css).toContain(".edit-call-grid textarea { overflow-wrap: anywhere;");
    expect(css).toContain(".edit-history summary { cursor: pointer;");
  });
});
