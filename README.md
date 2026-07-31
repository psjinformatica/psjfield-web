# PSJField Web

Nova aplicação oficial do PSJField, construída com Next.js, TypeScript,
Tailwind CSS e PostgreSQL/Supabase para publicação futura na Vercel.

## Funcionalidades

- dashboard mobile-first com chamados reais;
- pesquisa e filtro por status;
- detalhes do chamado e equipamento;
- edição dos dados de atendimento;
- importação funcional de `.eml` com prévia, revisão e confirmação;
- parser Grupo Easy portado para TypeScript;
- deduplicação por SHA-256;
- exclusão transacional do chamado e do hash vinculado;
- tratamento de erros e skeletons;
- manifest e service worker para instalação como PWA.

## Configuração

Copie o exemplo local:

```bash
cp .env.example .env.local
```

Preencha `DATABASE_URL` com a connection string do PostgreSQL/Supabase. A
variável é lida exclusivamente no servidor. Não use prefixo `NEXT_PUBLIC_` e
não exponha `service_role` no navegador.

A aplicação utiliza as tabelas existentes `chamados` e `emails_importados`.
Ela não executa migrações nem cria, altera ou remove estruturas do banco.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Validação

```bash
pnpm lint
pnpm test
pnpm build
```

## Publicação futura

1. importe o projeto na Vercel;
2. selecione a pasta `psjfield-web` como Root Directory;
3. configure `DATABASE_URL` somente em Environment Variables;
4. execute o primeiro deploy;
5. valide leitura, atualização, importação e exclusão em produção.

Nenhum deploy é realizado automaticamente por este projeto.
