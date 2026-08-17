import "server-only";

import postgres from "postgres";
import {
  configureDatabaseObservability,
  createDatabaseInstanceId,
  observeDatabaseClientCreated,
  observeDatabaseConnectionClosed,
} from "@/lib/db-observability";

const globalDatabase = globalThis as typeof globalThis & {
  psjfieldSql?: ReturnType<typeof postgres>;
  psjfieldInstanceId?: string;
};

globalDatabase.psjfieldInstanceId ||= createDatabaseInstanceId();
configureDatabaseObservability(globalDatabase.psjfieldInstanceId);

function databaseUrl() {
  const valor = process.env.DATABASE_URL?.trim();
  if (!valor) throw new Error("DATABASE_URL não configurada.");
  return valor.includes("://") || valor.includes("=") ? valor : `postgresql://${valor}`;
}

export function getSql() {
  if (!globalDatabase.psjfieldSql) {
    globalDatabase.psjfieldSql = postgres(databaseUrl(), {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: "require",
      onclose: observeDatabaseConnectionClosed,
      // Não habilitar `debug`: no postgres.js 3.4.9 ele torna SQL e parâmetros
      // enumeráveis em erros, o que pode expor dados nos logs automáticos.
    });
    observeDatabaseClientCreated();
  }
  return globalDatabase.psjfieldSql;
}
