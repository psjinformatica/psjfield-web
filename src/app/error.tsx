"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-shell error-page">
      <p className="eyebrow">Falha de conexão</p>
      <h1>Não foi possível carregar os dados</h1>
      <p>Verifique a conexão com o banco e tente novamente.</p>
      <button className="primary-button" onClick={reset}>Tentar novamente</button>
    </main>
  );
}
