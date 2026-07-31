import "server-only";

import { AssinaturasService, type AssinaturasGateway, type AssinaturasStorage } from "@/lib/assinaturas-service";
import {
  buscarAssinaturaCliente,
  buscarAssinaturaTecnico,
  registrarPendenciaStorage,
  salvarAssinaturaCliente,
  salvarAssinaturaTecnico,
} from "@/lib/assinaturas-repository";
import { criarUrlTemporaria, enviarAssinatura, removerAssinatura } from "@/lib/assinaturas-storage";

const gateway: AssinaturasGateway = {
  buscarCliente: buscarAssinaturaCliente,
  salvarCliente: salvarAssinaturaCliente,
  buscarTecnico: buscarAssinaturaTecnico,
  salvarTecnico: salvarAssinaturaTecnico,
  registrarPendenciaStorage,
};

const storage: AssinaturasStorage = {
  enviar: enviarAssinatura,
  remover: removerAssinatura,
  urlTemporaria: criarUrlTemporaria,
};

export const assinaturasService = new AssinaturasService(gateway, storage);
