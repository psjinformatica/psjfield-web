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

## Histórico de migrations em produção

- `20260915190000_rats_modelos.sql` foi aplicada manualmente no Supabase de
  produção em 15/09/2026.
- O banco de produção não possui a relação
  `supabase_migrations.schema_migrations`; por isso, essa aplicação não tem um
  registro no histórico do Supabase CLI.
- Não deve ser criada uma tabela de histórico artificial para compensar essa
  ausência. O arquivo da migration permanece no repositório como documentação
  do schema vigente.

## Publicação futura

1. importe o projeto na Vercel;
2. selecione a pasta `psjfield-web` como Root Directory;
3. configure `DATABASE_URL` somente em Environment Variables;
4. execute o primeiro deploy;
5. valide leitura, atualização, importação e exclusão em produção.

Nenhum deploy é realizado automaticamente por este projeto.
