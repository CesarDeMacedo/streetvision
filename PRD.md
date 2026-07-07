# PRD — StreetVision AI

## 1. Problema

Firmas de engenharia/planejamento urbano precisam produzir visualizações "antes e depois" de intervenções em ruas (ciclovias, calçadas, arborização) para materiais de consulta pública e relatórios de Avaliação Ambiental (EA). Hoje isso é:
- Caro e lento quando feito por render manual (V-Ray/Twinmotion, dias e centenas de dólares por imagem), ou
- Gratuito mas não-profissional quando feito com ferramentas ativistas existentes (Better Streets AI, Dutch Cycling Lifestyle) — estética fixa, sem controle de projeto real, sem fluxo de trabalho corporativo.

Não existe hoje uma ferramenta que combine: foto real do local + geração por IA de variações específicas de projeto + fluxo pronto pra relatório profissional.

## 2. Usuário-alvo (MVP / portfólio)

Um engenheiro/planejador (o próprio usuário simulando esse papel) que:
1. Sobe uma foto de um local real
2. Descreve a intervenção proposta (texto livre + atalhos rápidos)
3. Gera uma visualização fotorrealista do "depois"
4. Compara antes/depois num slider interativo
5. Exporta pra usar em material de consulta pública

## 3. Escopo do MVP

- Autenticação obrigatória (reaproveitando o padrão do app "provador digital" — gated atrás de login, evita gasto indevido de cota paga)
- Criar "projeto" (nome do local, endereço, foto do local) — upload com drag-and-drop e preview imediato
- Tela de geração: upload de foto + prompt descritivo + atalhos rápidos (chips: ciclovia protegida, arborização, calçada alargada, mobiliário urbano)
- Botão "Gerar Visualização" → chama Edge Function → Gemini 3 Pro Image (Nano Banana Pro; ver nota de modelo no SPEC.md §1) → salva resultado
- Split View antes/depois com slider arrastável (reaproveitar o layout já validado no mockup `streetvision-mockup.html`)
- Métricas de impacto **simuladas** com preview visual (stat cards + "Elementos da Proposta"), claramente marcadas com badge "SIMULATED DATA" — comunicam a visão do produto sem passar por dado real
- Interface em 3 idiomas (inglês padrão, francês, português) com seletor em runtime
- Histórico de visualizações por projeto (lista simples)
- Exportar/baixar a imagem gerada

## 4. Fora de escopo no MVP (fazer depois, se fizer sentido)

- Geração de múltiplas variações em paralelo (custo — decidir depois de validar geração única)
- Busca automática de foto via Street View/endereço (MVP é upload manual)
- **Cálculo real** de métricas de impacto (capacidade de pessoas/hora, área verde etc.) — o MVP exibe apenas valores simulados com badge; a estrutura para trocar por cálculo real está pronta (`lib/mockImpact.ts`), mas nenhum cálculo é feito
- Múltiplos usuários/permissões, cobrança, papéis de acesso
- Exportação em PDF formatado — no MVP é só download da imagem

## 5. Requisitos não-funcionais

- **Controle de custo é prioridade** — cada geração custa ~US$0,04 (Gemini) e não tem cap embutido. Implementar limite diário por usuário (ex: 5 gerações/dia) desde o início, não depois.
- Responsivo até tablet no mínimo.
- Reaproveitar a identidade visual já validada no mockup (`streetvision-mockup.html`): tema escuro, azul (#3b82f6), estrutura de sidebar + split view + painel de impacto.
- Reaproveitar a Edge Function e o padrão de autenticação já validados no app do provador digital (Supabase Edge Function chamando Gemini diretamente, chave só no servidor, validação de token real).

## 6. Perguntas em aberto

- O prompt precisa preservar fielmente prédios/geometria/ângulo de câmera ao redor da rua modificada — isso não foi testado ainda e é o maior risco técnico do projeto. Validar com 1-2 fotos reais antes de construir a UI completa.
- Manter o nome "StreetVision AI" ou reaproveitar a marca "Climate Resilience Design Intelligence" que você já tem pronta? (Sugestão: decidir depois de validar o prompt, não travar nisso agora.)
- Limite diário de gerações gratuitas: começar com 3-5/dia é suficiente pra portfólio; ajustar se necessário.
