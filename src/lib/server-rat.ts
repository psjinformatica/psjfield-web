import "server-only";

import { buscarAssinaturaCliente, buscarAssinaturaTecnico } from "@/lib/assinaturas-repository";
import { buscarChamado } from "@/lib/repository";
import { buscarRat, listarRats, registrarRat } from "@/lib/rat-repository";
import { RatService } from "@/lib/rat-service";
import { baixarArquivo, baixarRat, enviarRat, removerRat } from "@/lib/rat-storage";

export const ratService = new RatService(
  { buscarChamado, buscarCliente: buscarAssinaturaCliente, buscarTecnico: buscarAssinaturaTecnico, listar: listarRats, buscarRat, registrar: registrarRat },
  { baixar: baixarArquivo, enviar: enviarRat, remover: removerRat, baixarPdf: baixarRat },
);
