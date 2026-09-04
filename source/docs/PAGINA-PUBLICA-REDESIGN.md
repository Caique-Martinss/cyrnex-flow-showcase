# Página Pública — direção visual oficial aprovada

Estado: implementação visual pré-staging. Não marcar como v0.12.0 final.

## Referência principal

A referência estética oficial é o mockup preto/dourado aprovado em 27/08/2026.
A implementação deve buscar fidelidade de composição, hierarquia, paleta e sensação premium,
sem sacrificar responsividade, acessibilidade, performance ou funcionamento real.

## Regra de fidelidade

- Base quase preta, carvão e dourado quente como cor de ação/destaque.
- Bordas douradas discretas, brilho controlado e profundidade sem excesso.
- Tipografia forte, limpa e com hierarquia editorial.
- Cards compactos e sofisticados; evitar blocos brancos genéricos.
- Desktop e mobile são adaptações do mesmo sistema visual, não layouts independentes.
- O browser zoom deve provocar reflow real, nunca miniaturização do desktop.

## Hero

- Hero escuro, headline à esquerda e composição visual à direita.
- Três mídias públicas em camadas/flutuação.
- Cada mídia possui rotação/profundidade sutil.
- Hover/foco traz a mídia para frente; as outras recuam visualmente.
- Em touch, a composição vira grid responsivo e não depende de hover.
- Conteúdo real vem das mídias públicas escolhidas pelo estabelecimento.

## Navegação contextual

- Serviços, Equipe, Trabalhos e Sobre possuem painel contextual desktop.
- O painel é compacto, escuro e integrado à linguagem visual.
- Serviço dentro do painel é clicável.
- Clique em serviço rola suavemente até o card correspondente e aplica destaque temporário.
- O CTA do card prepara o booking com o serviço selecionado e leva ao agendamento.
- Mobile usa menu por toque; nenhuma função essencial depende de hover.

## Serviços

- Cards visuais escuros com imagem/mídia quando houver suporte de dados.
- Nome, duração, descrição, valor público e CTA claros.
- Card focado recebe borda/brilho dourado temporário.
- O botão deve ser explícito: “Agendar este serviço”.

## Equipe

- Cards compactos e premium, com foto quando o modelo de dados suportar mídia individual.
- Enquanto não houver foto individual vinculada com segurança, usar fallback visual controlado.
- Mostrar nome, função, especialidades compatíveis e ação de ver horários.
- “Qualquer profissional disponível” permanece como opção real e destacada.

## Experiência / diferenciais

- Quatro cards na composição desktop aprovada.
- Número/ícone, título, microcopy e detalhe visual coerente com o benefício.
- Hover discreto, sem animações chamativas.

## Informações

- Horários, localização e contato no mesmo sistema de cards.
- Localização usa mini mapa real/lazy quando o endereço completo é público.
- Ação “Ver rota no mapa” abre Maps.
- Contato público respeita o que o estabelecimento configurou.

## CTA final

- Manter o bloco escuro/dourado aprovado.
- Reforçar disponibilidade e revalidação antes de confirmar.
- O booking real continua sendo a fonte de verdade; o visual não pode prometer vaga falsa.

## Responsividade obrigatória

Testar no mínimo:

- desktop amplo;
- notebook;
- tablet;
- celular estreito e largo;
- zoom 100%, 125%, 150%, 175% e 200%;
- teclado/foco;
- prefers-reduced-motion.

## Verdade de produto

O preview standalone usa conteúdo fictício e deve continuar identificado como demonstração.
O React não inventa disponibilidade. O sistema real usa backend e revalidação.

## Ainda pendente antes do staging completo

A Página Pública ainda precisa concluir a ponte segura para Supabase/PostgreSQL:
resolução por slug, catálogo público, disponibilidade anônima segura e criação transacional
de appointment público. Não considerar booking público de produção concluído antes de E2E HTTPS
e testes de isolamento multiempresa.

## Revisão V4 — fidelidade visual e densidade

A partir desta revisão, o mockup aprovado é tratado como blueprint visual, não apenas inspiração.

- Equipe, Trabalhos e Sobre seguem a mesma regra contextual de Serviços: itens do painel levam ao
  conteúdo correspondente e aplicam destaque temporário quando existe um card alvo.
- Cards principais usam moldura em degradê dourado que se intensifica no hover/foco, com glow
  discreto e profundidade controlada.
- Ângulos, sobreposição e proporções dos três cards do hero devem acompanhar o mockup aprovado.
- A altura total da página foi reduzida: menos espaço morto entre seções, headings mais próximos do
  conteúdo e cards mais compactos, preservando respiro interno.
- O bloco final usa composição com ferramentas de barbearia no lado direito, painel de
  disponibilidade ao centro e CTA/copy à esquerda, seguindo a referência aprovada.
- A densidade deve buscar o meio-termo: rápida de percorrer, sem aparência amontoada.
