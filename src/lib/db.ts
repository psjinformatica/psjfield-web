import "server-only";

import postgres from "postgres";

const globalDatabase = globalThis as typeof globalThis & {
  psjfieldSql?: ReturnType<typeof postgres>;
};

function databaseUrl() {
  const valor = process.env.DATABASE_URL?.trim();
  if (!valor) throw new Error("DATABASE_URL não configurada.");
  return valor.includes("://") || valor.includes("=") ? valor : `postgresql://${valor}`;
}

export function getSql() {
  if (!globalDatabase.psjfieldSql) {
    globalDatabase.psjfieldSql = postgres(databaseUrl(), {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: "require",
    });
  }
  return globalDatabase.psjfieldSql;
}
