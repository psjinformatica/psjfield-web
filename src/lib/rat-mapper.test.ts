import { describe, expect, it } from "vitest";

import { mapearChamadoParaRat } from "@/lib/rat-mapper";
import type { Chamado } from "@/lib/types";

const chamado = {
  id: 1, numero_chamado: "MI-100", status: "Concluído", data_agendada: "2026-07-31", hora_agendada: "09:00",
  hora_inicio: "09:15", hora_termino: "10:30", cliente: "Claro", projeto: "", cidade: "Curitiba", estado: "PR",
  atividade: "Troca", valor_base: null, empresa_parceira: "", assunto_email: "", remetente: "", destinatario: "",
  data_email: "", usuario_responsavel: "login", contato: "Ana", telefone: "41999990000", endereco: "Rua A",
  descricao: "", equipamento: "Notebook", fabricante: "Dell", modelo: "5400", patrimonio_ae: "AE1", numero_serie: "S1",
  horas_incluidas: null, valor_hora_adicional: null, observacoes: "", hora_chegada: "09:00", descricao_servico: "Atendimento",
  observacoes_atendimento: "",
} satisfies Chamado;

describe("mapearChamadoParaRat", () => {
  it("preenche somente dados existentes e preserva campos específicos vazios", () => {
    const rat = mapearChamadoParaRat(chamado, null);
    expect(rat).toEqual({
      chamado: "MI-100", data_inicio: "2026-07-31", hora_inicio: "09:15", data_fim: "2026-07-31", hora_fim: "10:30",
      login: "login", colaborador: "Ana", telefone: "41999990000", email: "", localidade: "Rua A - Curitiba/PR",
      tipos_ocorrencia: [], tipo_equipamento: "Notebook", outro_equipamento: "", dominio: "",
      atual_serial: "S1", atual_ae: "AE1", atual_fabricante: "Dell", atual_modelo: "5400",
      atual_processador: "", atual_hd: "", atual_hostname: "", atual_memoria: "",
      novo_serial: "", novo_ae: "", novo_fabricante: "", novo_modelo: "", novo_processador: "", novo_hd: "", novo_hostname: "", novo_memoria: "",
      pasta_perfil_pst: "", software: "", itens_afetados: [], memoria_frequencia: "", item_outros: "", part_number: "", centro_custo: "",
      diagnosticos: [], diagnostico_outros: "", descricao: "", status_equipamento: [], condicao_equipamento: "", qualificacao: "", validacoes_finais: [],
      recebido_laboratorio: false, recebido_estoque: false, analista_logistica: "", data_hora_logistica: "",
    });
    expect(chamado.atividade).toBe("Troca");
    expect(chamado.descricao_servico).toBe("Atendimento");
  });
});
