
## Status do onboarding — v0.8.2

As 10 etapas do onboarding estão fechadas em escopo e UX. A partir desta versão, novas mudanças nessa área devem ser correções de bug ou ajustes pequenos, enquanto o desenvolvimento segue módulo por módulo no painel.

Regra de interface: apareceu = funciona; existe = tem propósito; clicou = responde; erro = explica.

# Onboarding definitivo da barbearia — v0.8.2

A v0.8.2 consolida o onboarding em um fluxo completo de configuração do negócio. A regra de produto é simples:

> **Onboarding monta. Configurações mantém. Painel usa. Página pública mostra.**

A pessoa configura a operação uma vez e todas as áreas do CYRNEX FLOW passam a usar os mesmos dados. Não existem cópias independentes de nome, horários, serviços ou módulos em cada tela.

## Princípios obrigatórios

- O progresso é salvo automaticamente e a maior etapa já alcançada é preservada.
- Fechar o navegador no meio do onboarding não apaga a configuração.
- Etapas já alcançadas podem ser revisitadas sem regredir o ponto de retomada.
- Ao editar algo pela revisão final, salvar leva a pessoa de volta para a revisão.
- Nenhuma mensagem importante deve ser apenas `Dados inválidos`.
- Todo conflito explica **o que aconteceu, por que aconteceu e como corrigir**.
- Campos opcionais não bloqueiam a conclusão.
- Pendências obrigatórias bloqueiam o botão final e apontam a etapa que precisa ser corrigida.
- O botão **Concluir configuração e entrar no painel** existe somente na etapa 10.
- Em uma conta nova, a barbearia começa sem clientes, agendamentos ou movimentações financeiras de demonstração.
- **Apareceu = funciona:** nenhum botão, select, checkbox ou ação visual pode existir sem comportamento real.

## Fluxo de 10 etapas

### 1. Barbearia

Mantém a entrada simples:

- nome da barbearia;
- link público gerado a partir do nome e editável;
- validação de unicidade do link.

Contato, endereço, história e redes sociais ficam nas etapas apropriadas para não sobrecarregar o primeiro passo.

### 2. Sobre

Constrói a identidade do negócio com perguntas guiadas, em vez de exigir um texto longo:

- como a barbearia começou;
- experiência na área;
- estilo da barbearia;
- o que diferencia o atendimento;
- ano desde o qual atua;
- especialidades por opções rápidas + especialidade personalizada;
- diferenciais por opções rápidas, incluindo sinuca, + diferencial personalizado;
- logo/foto principal;
- fotos do espaço com categoria, título, descrição e visibilidade pública;
- portfólio de trabalhos com foto/vídeo, título, descrição, serviço relacionado e visibilidade pública.

A etapa pode ser pulada e completada depois. No piloto local, mídias pequenas podem ser mantidas temporariamente como data URL. Em produção, arquivos devem ir para Storage e o banco deve guardar referências em `file_assets`/`business_public_media`.

### 3. Operação

Dois modos:

**Trabalho sozinho**

- usa o proprietário como profissional principal;
- permite nome profissional diferente do nome da conta;
- elimina controles de equipe que não fazem sentido.

**Tenho equipe**

- mostra o proprietário como membro protegido;
- permite cadastrar nome, nome profissional, função, telefone, e-mail opcional, se atende clientes, se recebe comissão e se pode aparecer publicamente;
- função profissional não concede automaticamente permissões administrativas;
- o proprietário não pode remover a si próprio durante o onboarding;
- login individual e permissões detalhadas podem ser configurados depois;
- associação entre profissionais e serviços é feita na etapa 5.

### 4. Horários

A configuração evita termos como “período 1/2/3” no fluxo principal.

- dias da semana são selecionáveis visualmente;
- cada dia mostra **Abre às** e **Fecha às**;
- pausa é configurada separadamente, com início e fim autoexplicativos;
- pausas adicionais continuam disponíveis para casos especiais;
- **Usar estes horários em outros dias** abre a seleção dos dias de destino antes de aplicar;
- depois da aplicação, o sistema confirma exatamente quais dias foram alterados;
- horário inválido ou pausa fora do expediente explica o problema e como corrigir.

O horário normal continua sendo apenas a rotina padrão. Hora extra e encaixes fora do expediente são exceções autorizadas pelo dono ou por alguém com permissão; o cliente não ignora o expediente sozinho.

### 5. Serviços

Serviços são cards dinâmicos e ilimitados. Cada card pode ser **recolhido/expandido**, evitando uma página enorme quando a barbearia possui muitos serviços.

Cada serviço pode definir:

- nome e categoria;
- preço fixo, `a partir de` ou `sob consulta`;
- visibilidade pública do preço;
- duração;
- tempo livre para limpeza/preparação depois do serviço;
- descrição;
- agendamento online;
- regra de sinal: geral, sem sinal ou percentual específico;
- cálculo visual do sinal e do restante quando a regra é específica;
- retorno recomendado;
- profissionais que realizam o serviço;
- adicionais/complementos.

Cada adicional mostra explicitamente **Nome do adicional**, **Preço adicional** e **Tempo adicional**. Nenhum campo numérico fica sem explicar o que representa.

Quando o serviço usa a regra geral de sinal, a tela informa que o percentual será definido na próxima etapa, em Agendamento.

### 6. Agendamento

A etapa usa linguagem não técnica e deixa configurações avançadas fora do primeiro acesso.

Configura:

- antecedência mínima;
- horizonte máximo para agendar;
- cancelamento e reagendamento pelo cliente;
- prazos de cancelamento/reagendamento;
- confirmação automática ou aprovação manual;
- lista de espera;
- regra geral de sinal;
- nome, telefone e/ou e-mail exigidos do cliente;
- observação do cliente;
- permissão para exceção manual de hora extra.

O intervalo técnico da grade fica com padrão seguro e pode ser alterado depois em configurações avançadas.

A disponibilidade nunca oferece um horário em que `duração + intervalo após o serviço` ultrapasse o expediente normal. Exceções fora do horário exigem autorização da barbearia.

### 7. Pagamentos

- formas aceitas por seleção visual;
- Pix com chave e recebedor;
- maquininha com exemplos como Stone, Ton, PagBank e InfinitePay;
- `Configurar agora` realmente abre as taxas dos cartões que estão ativos;
- exemplo mostra quanto entra líquido em uma venda de R$ 100,00;
- parcelamento detalhado fica para configurações avançadas para não pesar o onboarding;
- pagar no atendimento, contas a receber autorizadas, gorjetas e comprovantes permanecem configuráveis.

Se uma integração de pagamento online ainda não estiver conectada, ela não aparece como função pronta.

### 8. Recursos

Cada módulo aparece como card com uma explicação curta e humana. Pela regra `apareceu = funciona`, somente recursos que já possuem fluxo funcional podem ser ativados. Os demais continuam visíveis apenas como planejamento, com o status `Em preparação` e sem botão de ativação.

Recursos ativáveis nesta base: Financeiro e WhatsApp manual. Recursos já planejados para as próximas fases:

- Financeiro;
- WhatsApp;
- Lista de espera;
- Contas a receber;
- Loja/Produtos;
- Parcerias;
- Prótese capilar;
- Fidelidade;
- Clientes para retornar;
- Comissões, somente quando há equipe;
- Relatórios.

Recursos recomendados podem receber destaque, mas não são ativados escondidos. Dependências são explicadas. Integrações ainda não conectadas, como automação oficial de WhatsApp, mostram claramente a limitação atual. Quando um módulo ganhar tela e fluxo completos, ele deixa de ser `Em preparação` e passa a poder ser ativado.

### 9. Página pública

É o ponto visual mais completo do onboarding e funciona como construtor guiado da presença pública.

- link público;
- contato e redes;
- endereço com visibilidade completa, somente região ou oculto;
- seleção das seções públicas;
- ordem das seções;
- ação principal: agendar, WhatsApp ou serviços;
- aparência clara/escura ou seguindo o aparelho do cliente;
- publicar ao concluir ou manter privada;
- prévia ao vivo em celular e computador;
- modo `Ver como cliente` em ambiente de teste;
- indicador de completude da página;
- status `Aberto agora`/`Fechado agora` calculado a partir dos horários;
- diferenciais, equipe, portfólio, espaço, serviços e história reutilizam o que já foi cadastrado nas etapas anteriores.

O modo de teste da página nunca cria atendimento real. Link definitivo, QR Code de produção e domínio dependem da infraestrutura pública conectada; o onboarding não inventa um QR para uma URL inexistente.

### 10. Revisão

Funciona como check-up antes da liberação.

- resumo das etapas 1 a 9;
- pendências obrigatórias separadas de recomendações;
- conflitos cruzados entre horários, serviços, equipe, pagamentos e página;
- botão `Corrigir agora` para a etapa responsável;
- resumo da experiência que o cliente terá;
- resumo de privacidade da página;
- modo `Ver como cliente` sem gravar agendamento;
- explicação do que será aplicado ao concluir;
- botão final bloqueado enquanto houver pendência obrigatória.

Após uma conclusão válida, o primeiro onboarding mostra uma tela de sucesso antes de entrar no painel. Edições posteriores salvam a configuração e retornam ao produto sem recriar a empresa.

## Explicação de erros

O padrão obrigatório é:

```text
O que aconteceu
Por que isso impede ou altera o comportamento
Como corrigir
```

Exemplo:

```text
Esse horário não pode ser oferecido.
O serviço Corte + Barba dura 60 minutos e terminaria depois do expediente.
Como corrigir: escolha um horário anterior, altere a duração/intervalo ou autorize uma exceção de hora extra no dia.
```

## Persistência e banco

O piloto local ainda passa pelo boundary `server/src/database/index.ts` e mantém compatibilidade com dados JSON das versões anteriores. O sanitizador introduzido na v0.8.0 converte estruturas antigas para os novos formatos quando necessário.

O modelo PostgreSQL/Supabase correspondente fica em `supabase/migrations`. A migration criada na v0.8.0 adiciona preferências de agendamento/pagamento, identidade pública detalhada, dados de profissionais, tipos de preço e `business_public_media`.

As migrations são a fonte de verdade do schema, mas ainda precisam ser executadas e validadas em uma instância PostgreSQL/Supabase real antes da produção.

Veja também `docs/database/MAPEAMENTO-ONBOARDING.md`.

## Organização do código

```text
web/src/features/onboarding/
├── CustomerPagePreview.tsx
├── OnboardingPage.tsx
├── OnboardingShell.tsx
├── OnboardingSuccess.tsx
├── useOnboardingEditor.ts
├── onboarding.constants.ts
├── onboarding.helpers.ts
└── steps/
```

```text
server/src/modules/onboarding/
├── onboarding.payload.ts
├── onboarding.routes.ts
├── onboarding.service.ts
├── onboarding.types.ts
└── onboarding.validation.ts
```

## Quality gate

Execute no Windows, na raiz do projeto:

```powershell
npm.cmd run check:onboarding
```

O `npm.cmd run check` completo também inclui estrutura, banco, autenticação, recuperação de senha, múltiplas barbearias, preview, interações e typecheck quando as dependências estiverem instaladas.
