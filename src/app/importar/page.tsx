import { ImportarForm } from "@/components/importar-form";

export default function ImportarPage() {
  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <div><p className="eyebrow">Entrada de chamados</p><h1>Importar e-mail</h1><p className="hero-copy">Analise o arquivo, revise os campos e confirme antes de salvar.</p></div>
      </section>
      <ImportarForm />
    </main>
  );
}
