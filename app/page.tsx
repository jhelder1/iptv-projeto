export default function HomePage() {
  return (
    <main>
      <section className="card">
        <h1 className="title">ClienteZero MVP</h1>
        <p className="muted">
          Fluxo ativo: <code>Mercado Pago</code> {"->"} <code>Next.js Webhook</code> {"->"} <code>Supabase</code> {"->"}{" "}
          <code>Evolution API</code>.
        </p>
      </section>

      <section className="grid" style={{ marginTop: "1rem" }}>
        <article className="card">
          <h2>Endpoints</h2>
          <p className="muted">Use os endpoints abaixo para testes e operacao.</p>
          <ul>
            <li>
              Health: <code>GET /api/health</code>
            </li>
            <li>
              Webhook MP: <code>POST /api/mp/webhook</code>
            </li>
            <li>
              Logs: <code>/admin/logs</code>
            </li>
          </ul>
        </article>

        <article className="card">
          <h2>Checklist rapido</h2>
          <ul>
            <li>Configurar variaveis em <code>.env.local</code>.</li>
            <li>Executar SQL inicial no Supabase.</li>
            <li>Registrar webhook Mercado Pago apontando para o endpoint.</li>
            <li>Validar mensagem WhatsApp em pagamento real.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
