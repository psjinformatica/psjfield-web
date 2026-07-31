const CHAVE = "psjfield:chamados-acessados";
const EVENTO = "psjfield:chamado-acessado";

export function snapshotAcessados() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CHAVE) || "";
}

export function snapshotServidor() {
  return "";
}

export function assinarAcessados(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENTO, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENTO, callback);
  };
}

export function idsAcessados(snapshot: string) {
  try {
    const ids = JSON.parse(snapshot);
    return new Set<number>(
      Array.isArray(ids) ? ids.filter((id) => Number.isSafeInteger(id)) : [],
    );
  } catch {
    return new Set<number>();
  }
}

export function marcarComoAcessado(id: number) {
  const acessados = idsAcessados(snapshotAcessados());
  if (acessados.has(id)) return;
  acessados.add(id);
  window.localStorage.setItem(CHAVE, JSON.stringify([...acessados]));
  window.dispatchEvent(new Event(EVENTO));
}
