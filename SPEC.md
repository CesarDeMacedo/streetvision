# SPEC — StreetVision AI

> Atualizado em 2026-07-07 para refletir o que foi realmente construído.
> Divergências em relação ao plano original estão marcadas com **[mudança]** e o motivo.

## 1. Stack

Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres + Auth + Storage + Edge Functions).

Geração de imagem: Supabase Edge Function → **`gemini-3-pro-image`** ("Nano Banana Pro") via `generateContent`.

**[mudança]** O plano original usava `gemini-2.5-flash-image` (~US$0,04/imagem). Na validação manual
(etapa 5 abaixo) ele corrompia texto da cena de forma inconsistente — o nome de rua pintado no asfalto
("Parnell Rd") saía como "Burnell"/"Bnell" mesmo com instrução explícita de preservação caractere a
caractere no prompt. Como o produto alveja documentos de consulta pública, fidelidade de texto é
inegociável; `gemini-3-pro-image` (~US$0,13/imagem) resolveu de forma consistente com mudança de uma
linha. Não voltar ao Flash sem revalidar fidelidade de texto.

## 2. Modelo de dados (estado atual — migrações `20260707000000_init` + `20260707200000_cascade_deletes`)

```sql
-- projects: um projeto = um local/intersecção sendo visualizado
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text,
  photo_path text,                        -- [mudança] foto inicial do local (bucket street-photos);
                                          -- a rota /projects/new exige foto e o modelo original
                                          -- não tinha onde guardá-la
  created_at timestamptz default now()
);

-- visualizations: cada geração de imagem dentro de um projeto
create table visualizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  original_photo_path text not null,
  prompt text not null,
  generated_image_path text,              -- null até a geração terminar
  cost_usd numeric(6,4) default 0.134,    -- custo do gemini-3-pro-image
  status text default 'pending',          -- pending | done | failed
  created_at timestamptz default now()
);

-- generation_limits: cota diária por usuário (escrita só pela Edge Function via service role)
create table generation_limits (
  user_id uuid references auth.users(id) on delete cascade primary key,
  date date not null default current_date,
  count int not null default 0
);
```

**[mudança]** Todas as FKs têm `on delete cascade` (migração 2): sem isso, deletar um usuário de teste
no painel falhava com "Database error deleting user". Arquivos no Storage **não** entram no cascade —
ficam órfãos nos buckets (limpeza manual, se necessário).

**RLS** em todas as tabelas: `projects`/`visualizations` com leitura/escrita restritas ao dono
(via `auth.uid()`); `generation_limits` é somente leitura para o próprio usuário — quem escreve é a
Edge Function com service role.

Storage: buckets `street-photos` e `generated-images`, ambos privados, acesso via signed URL,
objetos organizados por pasta `{user_id}/{project_id}/...` com policies por prefixo de pasta.

## 3. Rotas

- `/login` — login/cadastro (fluxo do `Auth.tsx` do provador digital, re-estilizado pro tema escuro)
- `/projects` — lista de projetos do usuário
- `/projects/new` — criar projeto (nome, endereço, foto) com **drag-and-drop + preview imediato** no dropzone
- `/projects/[id]` — tela principal: gerar visualização + split view + métricas simuladas + histórico + download

Todas atrás de `AuthGate` (client-side); a autorização real é revalidada no servidor (RLS + `getUser()` na function).

## 4. Lógica de negócio

**Rate limit (5 gerações/dia por usuário):**
**[mudança]** Enforçado **dentro da Edge Function**, não no front-end como no plano original — checagem
client-side seria burlável chamando a function direto. A function consulta `generation_limits` antes de
chamar o Gemini (retorna HTTP 429 no limite) e incrementa **só após** geração bem-sucedida, via service
role. O front-end apenas exibe o contador ("X / 5" na topbar) e desabilita o botão.

**Prompt template final (Edge Function `generate-image`):**

```
Modify this street photo according to the following changes: {descrição do usuário}.
Preserve exactly: building facades, camera angle, perspective, lighting, time of day,
and any text, street signs, pavement markings, or lettering — character by character,
in the same position and orientation as the original.
Only modify: road surface, lane markings, sidewalks, and roadside elements as described.
Do not alter, regenerate, or reinterpret any existing text in the image.
Output a photorealistic result suitable for a professional public consultation document.
```

**[mudança]** As linhas de preservação de texto foram adicionadas após a primeira rodada de validação
(o template original não mencionava texto). A cláusula "Preserve exactly" é a parte de maior risco do
produto — não reescrever sem repetir a validação manual com fotos reais.

**Fluxo de geração (client → function):** insere linha `pending` em `visualizations` → baixa a foto do
projeto do Storage → chama a function (multipart: `photo` + `description`, Bearer token do usuário) →
sobe o resultado em `generated-images` → marca `done` (ou `failed`, exibindo o erro).

**Split View:** componente React (`components/SplitView.tsx`) portado do mockup, slider controlado por
`useState` + pointer events. O container adota o `aspect-ratio` real da foto carregada e as imagens usam
`object-fit: contain` — a foto original nunca é cortada, em qualquer largura de tela.

## 5. i18n

`lib/i18n.tsx`: dicionário EN/FR/PT (~90 chaves, todas as telas) + React Context (`LanguageProvider` /
`useI18n`), com seletor EN|FR|PT na sidebar e no login, persistência em `localStorage` e datas por locale.
**Inglês é o padrão** (público-alvo do portfólio). Decisão de escopo: sem biblioteca de i18n
(next-intl etc.), sem rotas por idioma, sem SEO multilíngue — só troca de texto na interface.
Mensagens de erro vindas do servidor (Edge Function) permanecem em inglês.

## 6. Tema claro/escuro

`lib/theme.tsx`: mesmo padrão do i18n — Context (`ThemeProvider` / `useTheme`) + `localStorage`
(chave `sv-theme`), **escuro como padrão**, aplicado via atributo `data-theme` no `<html>`. As
paletas vivem em `globals.css`: `:root` define o tema escuro e `:root[data-theme='light']`
sobrescreve. O azul `#3b82f6` é identidade visual e permanece igual nos dois temas. Toggle
sol/lua ao lado do seletor de idioma (sidebar e login).

Além das variáveis de cor originais do mockup, existem **variáveis semânticas** criadas para os
pontos onde os temas precisam de valores próprios: `--hover-bg`, `--nav-active-fg`,
`--green-text`, `--red-text`, `--amber-text` (usadas em hover de navegação, badges de status,
stat cards e no badge "SIMULATED DATA"). Cores novas na UI devem seguir essa regra (ver CLAUDE.md).

**Exceção deliberada — overlays sobre foto:** as tags do Split View ("BEFORE/AFTER"), o overlay
de estado vazio e o handle ficam sobre a imagem, não sobre superfícies do tema. Usam base escura
translúcida fixa + texto claro + text-shadow, legíveis sobre céu claro em qualquer tema — não
convertê-los para variáveis de tema.

## 7. Métricas de impacto (simuladas)

`lib/mockImpact.ts`: stat cards (Faixas de Carro, Área Verde, Capacidade Ciclistas, Impacto no Tráfego)
e lista "Elementos da Proposta", com os valores fixos do mockup validado. Ambas as seções levam o badge
**"⚠ SIMULATED DATA"** na UI — o objetivo é comunicar a visão do produto sem passar por dado real.
Contrato para o futuro: substituir as constantes por uma função (ex: `computeImpact(project, viz)`)
mantendo o mesmo shape — a UI não muda. Nenhum cálculo real é feito no MVP.

## 8. Histórico de construção (etapas concluídas)

1. ✅ Edge Function `generate-image` adaptada do provador digital e deployada **antes de qualquer tela**
2. ✅ Validação manual do prompt com fotos reais (2 rodadas de ajuste: preservação de texto no prompt → troca de modelo)
3. ✅ Migração única (3 tabelas + RLS + buckets) via `supabase db push`
4. ✅ Rate limit server-side na function
5. ✅ Telas: `/login`, `/projects`, `/projects/new`, `/projects/[id]` (split view, histórico, download)
6. ✅ Correção de responsividade do Split View (aspect-ratio; testado em 1920px e 1366px)
7. ✅ Métricas simuladas + i18n (EN/FR/PT) + drag-and-drop com preview
8. ✅ Cascade deletes (migração 2)
9. ✅ Deploy no Vercel (env vars: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
   Site URL do Auth no Supabase apontando para o domínio de produção)
10. ✅ Tema claro/escuro com toggle, persistência e ajuste de contraste dos overlays sobre foto
