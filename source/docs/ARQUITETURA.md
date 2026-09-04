# Arquitetura do CYRNEX FLOW

Este documento explica a estrutura do projeto de forma simples. A regra principal é: cada parte do sistema deve ter um lugar previsível.

## Visão geral

```text
CYRNEX-FLOW-Barbearia/
├── web/                 Interface React que o usuário vê
├── server/              API, regras de negócio e persistência
├── docs/                Documentação do projeto
├── scripts/             Scripts de desenvolvimento e validação
├── README.md            Entrada rápida para qualquer pessoa
└── package.json         Comandos gerais do projeto
```

O fluxo normal é:

```text
Tela React → serviço da API → rota do servidor → regra de negócio → banco
```

## Frontend (`web/src`)

```text
web/src/
├── app/                 Montagem geral da aplicação e estado global atual
├── components/          Componentes reutilizáveis
│   ├── layout/          Sidebar, Topbar e estrutura visual
│   └── ui/              Modal, cards, estados vazios etc.
├── domain/              Tipos e modelos usados pelo frontend
├── features/            Funcionalidades separadas por assunto
│   ├── agenda/
│   ├── booking/
│   ├── clients/
│   ├── finance/
│   ├── overview/
│   ├── onboarding/
│   ├── settings/
│   └── whatsapp/
├── hooks/               Lógica React reutilizável
├── services/            Comunicação com a API
├── styles/              CSS dividido por responsabilidade
└── utils/               Formatação de datas, dinheiro e utilidades puras
```

### Regra de navegação do frontend

Se a mudança é de uma funcionalidade específica, comece em `features/`.

Exemplos:

- agenda → `features/agenda/`;
- agendamento do cliente → `features/booking/`;
- clientes → `features/clients/`;
- financeiro → `features/finance/`;
- onboarding → `features/onboarding/`;
- configuração posterior → `features/settings/`.

Se é um componente usado em várias telas, ele fica em `components/`.

Se é uma chamada HTTP, ela fica em `services/`.

## Backend (`server/src`)

```text
server/src/
├── app.ts               Cria o Express e conecta os módulos
├── index.ts             Inicia o servidor
├── database/            Acesso e dados padrão do banco local
├── domain/              Tipos centrais do domínio
├── middleware/          Tratamento comum de requisições e erros
├── modules/             Funcionalidades da API separadas por domínio
│   ├── appointments/
│   ├── clients/
│   ├── dashboard/
│   ├── expenses/
│   ├── messages/
│   ├── professionals/
│   ├── public-booking/
│   ├── onboarding/
│   ├── services/
│   └── settings/
└── utils/               Funções pequenas e reutilizáveis
```

### Regra de navegação do backend

Toda regra relacionada a um assunto deve ficar no módulo daquele assunto.

Por exemplo, para entender um agendamento:

```text
modules/appointments/
├── appointment.routes.ts    Endpoints HTTP
├── appointment.service.ts   Regras e validações
└── appointment.factory.ts   Criação/padronização de dados
```

`app.ts` não deve virar um arquivo gigante. Ele só conecta os módulos.

## Banco de dados

O schema definitivo está versionado em:

```text
supabase/migrations/
```

A aplicação acessa persistência por uma fronteira única:

```text
server/src/database/index.ts
```

Enquanto o projeto ainda não está ligado a uma instância Supabase real, o MVP continua podendo usar:

```text
server/data/db.json
server/src/database/adapters/fileDatabase.ts
```

Esse JSON é apenas um adapter legado/local. A arquitetura de produção foi preparada para PostgreSQL/Supabase sem espalhar detalhes de persistência pelos módulos do servidor.

## CSS

O CSS foi separado por responsabilidade:

```text
styles/
├── tokens.css       Variáveis visuais
├── base.css         Reset e elementos básicos
├── layout.css       Estrutura principal e navegação
├── management.css   Painel administrativo
├── onboarding.css   Configuração inicial e configurações
├── booking.css      Agendamento público
├── feedback.css     Modal, toast, estados e mensagens
├── responsive.css   Regras para telas menores
└── index.css        Importa todos os arquivos
```

## Regra para crescimento

Ao criar uma funcionalidade nova:

1. crie ou use uma pasta em `features/` no frontend;
2. crie ou use um módulo em `modules/` no backend;
3. coloque chamadas HTTP em `services/`;
4. coloque tipos compartilhados pelo lado correspondente em `domain/`;
5. documente regras importantes em `docs/`;
6. rode `npm run check:structure` antes de considerar a alteração pronta.

O objetivo é conseguir responder rapidamente: "onde está o código dessa função?" sem procurar pelo projeto inteiro.


## Banco relacional definitivo

A arquitetura de produção é PostgreSQL/Supabase e está versionada em `supabase/`.

```text
Frontend React
    ↓
API Express
    ↓
Database boundary
    ↓
Repositories PostgreSQL
    ↓
PostgreSQL / Supabase
```

O adapter JSON permanece apenas como compatibilidade temporária do piloto. Features não devem importar o adapter concreto; o acesso passa por `server/src/database/index.ts` e, na migração, evoluirá para repositories por domínio.

O banco é multiempresa. `business_id`, FKs compostas e RLS atuam juntos para impedir mistura entre estabelecimentos.


## Fluxo de configuração da empresa

A aplicação só libera o painel depois que `settings.onboarding.status` estiver como `completed`.

```text
Primeira entrada
    ↓
web/src/features/onboarding/
    ↓
/api/onboarding
    ↓
server/src/modules/onboarding/
    ↓
server/src/database/index.ts
    ↓
adapter atual / repositories PostgreSQL no runtime de produção
```

O mesmo editor é reaberto pela aba Configurações. Isso evita duplicar telas e regras para configuração inicial e manutenção posterior.

O mapeamento dos dados para o PostgreSQL está em `docs/database/MAPEAMENTO-ONBOARDING.md`.
