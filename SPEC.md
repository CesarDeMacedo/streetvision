# SPEC — StreetVision AI

## 1. Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres + Auth + Storage).
Geração de imagem: Supabase Edge Function → Gemini 2.5 Flash Image ("Nano Banana") via `generateContent`.

## 2. Modelo de dados (migração única, mesmo padrão do Site Log)

```sql
-- projects: um projeto = um local/intersecção sendo visualizado
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- visualizations: cada geração de imagem dentro de um projeto
create table visualizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) not null,
  original_photo_path text not null,      -- caminho no Supabase Storage
  prompt text not null,
  generated_image_path text,              -- caminho no Supabase Storage (null até a geração terminar)
  cost_usd numeric(6,4) default 0.039,
  status text default 'pending',          -- pending | done | failed
  created_at timestamptz default now()
);

-- generation_limits: controle simples de cota diária por usuário
create table generation_limits (
  user_id uuid references auth.users(id) primary key,
  date date not null default current_date,
  count int not null default 0
);
```

Storage: bucket `street-photos` (fotos originais) e `generated-images` (resultados), ambos privados, acesso via signed URL.

## 3. Rotas

- `/login` — reaproveita o `Auth.tsx` já validado no provador digital
- `/projects` — lista de projetos do usuário
- `/projects/new` — criar projeto (nome, endereço, foto inicial)
- `/projects/[id]` — tela principal: gerar visualização + split view + histórico

## 4. Lógica de negócio

**Rate limit (crítico, implementar antes de qualquer outra feature):**
Antes de chamar a Edge Function, verificar `generation_limits` do usuário para o dia atual. Se `count >= limite_diário` (ex: 5), bloquear no front-end com mensagem clara e não chamar a function. Incrementar `count` só depois de uma geração `done` com sucesso.

**Prompt template (Edge Function):**
Adaptar a function `generate-image` já existente no provador digital. Estrutura sugerida do prompt enviado ao Gemini:

```
Modify this street photo according to the following changes: {descrição do usuário}.
Preserve exactly: building facades, camera angle, perspective, lighting, and time of day.
Only modify: road surface, lane markings, sidewalks, and roadside elements as described.
Output a photorealistic result suitable for a professional public consultation document.
```

Esse template é o ponto mais incerto do projeto — testar antes de investir na UI completa (ver seção 6 do PRD).

**Split View:**
Reaproveitar exatamente o componente HTML/CSS/JS já construído em `streetvision-mockup.html` (slider arrastável com clip-path), convertendo pra componente React controlado por estado (`useState` pra posição do slider).

## 5. Ordem de construção sugerida (para sessões de Claude Code / Fable)

1. Scaffold Next.js + Tailwind + Supabase, reaproveitando a configuração de `.env` do projeto do provador digital.
2. Implementar autenticação (`Auth.tsx` reaproveitado), gate no app inteiro.
3. Migração SQL única com as 3 tabelas acima + criação dos 2 buckets de Storage.
4. Adaptar a Edge Function `generate-image` existente: novo prompt template, novos parâmetros de entrada (foto do local + descrição, em vez de foto da pessoa + roupa).
5. **Validar o prompt manualmente primeiro** — antes de construir qualquer tela, rodar a function adaptada com 1-2 fotos reais de rua e conferir se a geometria/prédios se mantêm fiéis. Não seguir para o passo 6 sem essa validação.
6. Construir `/projects` (listar/criar) com upload de foto pro Storage.
7. Construir a tela de geração dentro de `/projects/[id]`: prompt + chips rápidos + botão gerar, com o rate limit da seção 4 aplicado.
8. Converter o Split View do mockup em componente React, integrado ao resultado real da geração.
9. Adicionar histórico de visualizações do projeto (lista simples, reaproveitando padrão de tabela do Site Log).
10. Adicionar botão de download da imagem gerada.

## 6. `CLAUDE.md` sugerido para a raiz do repo

```markdown
# Project context for Claude Code / Fable

This is StreetVision AI, a tool that generates before/after photorealistic visualizations
of street/infrastructure interventions (bike lanes, sidewalks, trees) for public engagement
materials, using Gemini 2.5 Flash Image ("Nano Banana") via a Supabase Edge Function.

Read PRD.md for product scope and SPEC.md for data model, routes, and business logic
before making changes.

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + Storage).

Reuse patterns already validated in the sibling project (digital fitting room app):
- Supabase Edge Function calling Gemini directly, API key only as a server secret
- Auth gate validating the real user token via supabase.auth.getUser(), never trusting the anon key alone

Visual identity: dark theme, blue accent (#3b82f6), sidebar + split-view + impact panel layout —
see streetvision-mockup.html in this repo for the validated reference layout.

IMPORTANT: the prompt sent to Gemini must explicitly instruct preservation of building facades,
camera angle, and lighting — this is the highest-risk part of the project and must be validated
manually (step 5 of SPEC.md) before building further UI.

Do not add features outside PRD.md's MVP scope without asking first.
Daily generation rate limit must be implemented and tested before any other feature ships.
```
