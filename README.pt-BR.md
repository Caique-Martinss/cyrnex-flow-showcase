<div align="center">

# CYRNEX FLOW

### Plataforma SaaS Full Stack para Negócios Baseados em Agendamentos

**React • TypeScript • Node.js • PostgreSQL • Supabase • Render**

**V11.7.2 RC1 • Pré-Staging**

[English](README.md) • [Português](README.pt-BR.md)

</div>

---

## Sobre o CYRNEX FLOW

O **CYRNEX FLOW** é uma plataforma SaaS full stack desenvolvida para centralizar e profissionalizar a operação de negócios que dependem de agendamentos.

O produto foi inicialmente pensado para **barbearias**, reunindo operação, gestão e experiência do cliente em um único ecossistema.

Em vez de focar apenas na interface, o projeto foi estruturado com uma visão de produto real, envolvendo decisões relacionadas a:

- arquitetura de software
- modelagem de dados
- regras de negócio
- autenticação e autorização
- isolamento de dados multiempresa
- segurança da aplicação
- observabilidade
- experiência do usuário
- estabilidade
- preparação para deploy e produção

> **Este repositório é a vitrine técnica pública do projeto.**
>
> Este repositório inclui um snapshot sanitizado do código-fonte da V11.7.2 RC1 para avaliação técnica. Credenciais, segredos de produção, materiais operacionais privados e o histórico canônico de desenvolvimento permanecem privados.

---

## Visão Geral do Produto

O CYRNEX FLOW foi criado para substituir processos operacionais fragmentados por uma plataforma centralizada.

### Operação

**Agenda • Clientes • Serviços • Profissionais • Disponibilidade • Histórico**

### Gestão

**Financeiro • Faturamento • Despesas • Indicadores • Configurações**

### Experiência do Cliente

**Página Pública • Agendamento Online • Reagendamento • Cancelamento**

### Plataforma

**Autenticação • Multiempresa • Permissões • Auditoria • Observabilidade**

---

# Telas Reais do Produto

As imagens abaixo são **capturas reais do CYRNEX FLOW V11.7.2 RC1**, utilizando dados de demonstração.

## Visão Geral

![Visão Geral do CYRNEX FLOW](screenshots%20Cyrnex%20Flow/01-visao-geral.png)

A tela de Visão Geral apresenta o contexto operacional do estabelecimento e permite acesso rápido às principais ações do negócio.

---

## Agenda

![Agenda do CYRNEX FLOW](screenshots%20Cyrnex%20Flow/02-agenda.png)

A Agenda é um dos principais módulos da plataforma.

Ela centraliza os agendamentos e foi desenvolvida para trabalhar com diferentes visualizações de calendário, regras de disponibilidade, profissionais e estados do ciclo de atendimento.

---

## Clientes

![Clientes do CYRNEX FLOW](screenshots%20Cyrnex%20Flow/03-clientes.png)

O módulo de Clientes centraliza informações importantes e permanece conectado aos fluxos operacionais da plataforma.

---

## Financeiro — Faturamento

![Financeiro - Faturamento](screenshots%20Cyrnex%20Flow/04-financeiro-faturamento.png)

A área de faturamento oferece visibilidade sobre entradas financeiras e pagamentos recebidos, organizados por período e conectados à atividade operacional.

---

## Financeiro — Despesas

![Financeiro - Despesas](screenshots%20Cyrnex%20Flow/05-financeiro-despesas.png)

O módulo de Despesas complementa a visão financeira, auxiliando na organização e acompanhamento dos custos operacionais do negócio.

---

## Página Pública

![Página Pública do CYRNEX FLOW](screenshots%20Cyrnex%20Flow/06-pagina-publica.png)

A Página Pública representa a experiência do cliente final dentro da plataforma.

Ela apresenta o estabelecimento, seus serviços e funciona como ponto de entrada para o fluxo de agendamento online.

---

# Principais Funcionalidades

| Área | Recursos |
|---|---|
| **Agenda** | Visualizações por dia, semana e mês, disponibilidade, bloqueios e ciclo do atendimento |
| **Clientes** | Cadastro, edição, histórico e integração com agendamentos |
| **Serviços** | Gestão de serviços, duração e regras operacionais |
| **Profissionais** | Organização da equipe e disponibilidade |
| **Financeiro** | Faturamento, pagamentos, despesas e visão financeira operacional |
| **Página Pública** | Apresentação do estabelecimento e experiência de agendamento online |
| **Autenticação** | Login, sessões e recuperação de senha |
| **Multiempresa** | Isolamento de contexto e dados entre diferentes empresas |
| **Administração da Plataforma** | Gestão de empresas, assinaturas, auditoria e observabilidade |

---

# Tecnologias Utilizadas

## Frontend

**React**  
**TypeScript**

## Backend

**Node.js**  
**TypeScript**  
**REST API**

## Banco de Dados & Serviços

**PostgreSQL**  
**Supabase**  
**Supabase Auth**  
**Row Level Security — RLS**

## Infraestrutura & Deploy

**Render**  
**Supabase**

## Versionamento

**Git**  
**GitHub**

---

# Arquitetura em Alto Nível

```text
┌──────────────────────────────┐
│          CLIENTE             │
│      Navegador / Mobile      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      React + TypeScript      │
│          Frontend            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     Node.js + TypeScript     │
│           REST API           │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ PostgreSQL / Supabase        │
│                              │
│ • Dados Operacionais         │
│ • Autenticação               │
│ • Row Level Security         │
│ • Storage                    │
└──────────────────────────────┘
```

A aplicação separa responsabilidades entre as camadas de **frontend, backend e banco de dados**.

Operações sensíveis são validadas no servidor, enquanto o banco de dados fornece mecanismos adicionais de segurança e isolamento de informações.

---

# Arquitetura Multiempresa

Um dos principais objetivos arquiteturais do CYRNEX FLOW é permitir que **múltiplas empresas utilizem a mesma plataforma sem misturar seus dados**.

Cada estabelecimento opera dentro de seu próprio contexto.

A arquitetura considera:

- identificação da empresa nas operações
- separação lógica dos dados
- validações relacionais
- autorização no backend
- políticas de segurança no PostgreSQL
- Row Level Security
- prevenção de acesso cruzado entre empresas

O objetivo é permitir que a plataforma cresça mantendo uma separação rígida entre os ambientes dos clientes.

---

# Segurança

A segurança é tratada como parte da arquitetura do sistema, e não como uma etapa adicionada posteriormente.

Alguns dos conceitos aplicados ao projeto incluem:

### Autenticação

Supabase Auth e gerenciamento de sessões.

### Autorização

Validação de permissões no backend antes da execução de operações sensíveis.

### Row Level Security

Políticas RLS no PostgreSQL fornecem uma camada adicional de proteção aos dados.

### Validação Server-Side

Regras de negócio críticas não dependem exclusivamente do frontend.

### Auditoria

Ações administrativas relevantes podem ser registradas para garantir rastreabilidade.

### Segredos de Ambiente

Credenciais privadas e chaves sensíveis não são armazenadas neste repositório público.

---

# Observabilidade & Operação da Plataforma

Além da aplicação utilizada pelos estabelecimentos, o projeto inclui uma camada administrativa separada para operação do próprio SaaS.

O **CYRNEX Admin** foi desenvolvido para apoiar operações da plataforma, como:

- gestão de empresas
- gestão de assinaturas
- monitoramento da saúde do sistema
- logs
- auditoria
- diagnósticos operacionais
- ações administrativas controladas

A camada administrativa da plataforma está incluída no snapshot sanitizado do código-fonte público. Credenciais de produção, dados operacionais sensíveis e materiais privados de deploy permanecem excluídos.

---

# Qualidade & Estabilidade

O fluxo de desenvolvimento inclui diferentes processos de validação criados para reduzir regressões conforme o produto evolui.

As áreas validadas incluem:

- estrutura do código
- TypeScript
- integridade do banco de dados
- autenticação
- segurança
- agenda
- fluxos financeiros
- agendamento público
- comportamento responsivo
- operação diária
- preparação para lançamento

O projeto possui diferentes **gates automatizados de validação e build** executados antes da preparação de uma nova versão.

Essas verificações ajudam a validar áreas críticas da aplicação antes de uma release avançar para a próxima etapa.

---

# Desafios Técnicos

Alguns dos principais desafios técnicos trabalhados durante o desenvolvimento do CYRNEX FLOW incluem:

### Multiempresa

Permitir que diferentes empresas utilizem a mesma aplicação mantendo seus dados isolados.

### Agenda & Disponibilidade

Manter consistência entre horários, profissionais, serviços, regras de disponibilidade e estados dos agendamentos.

### Integração Entre Módulos

Conectar Agenda, Clientes e Financeiro evitando duplicação de regras de negócio.

### Segurança

Separar corretamente autenticação, autorização, validação server-side e isolamento entre empresas.

### Operação da Plataforma

Criar ferramentas internas para operação e monitoramento do SaaS por meio de logs, auditoria, saúde do sistema e observabilidade.

### Preparação para Produção

Estruturar configuração de ambiente, infraestrutura de deploy, health checks, validações de release e documentação operacional.

---

# Áreas de Engenharia Aplicadas

O CYRNEX FLOW proporcionou experiência prática em diferentes camadas da engenharia de software.

### Engenharia de Frontend

- arquitetura baseada em componentes
- interfaces responsivas
- gerenciamento de estado
- fluxos operacionais
- experiências voltadas ao cliente final

### Engenharia de Backend

- REST APIs
- regras de domínio
- autorização
- validações server-side
- tratamento de erros
- serviços operacionais

### Engenharia de Banco de Dados

- modelagem relacional
- PostgreSQL
- estruturas de dados multiempresa
- Row Level Security
- regras de integridade e consistência

### Segurança de Aplicações

- autenticação
- autorização
- isolamento entre empresas
- operações administrativas protegidas
- configuração segura de ambiente

### Engenharia de Plataforma

- observabilidade
- auditoria
- monitoramento de saúde
- preparação para deploy
- validação de releases

---

# Status Atual

### `CYRNEX FLOW V11.7.2 RC1`

O projeto encontra-se atualmente na fase de **pré-staging**.

O núcleo principal da aplicação já passou pelas validações locais, e a próxima etapa será validar os fluxos completos em um ambiente online por meio de **testes end-to-end**.

O objetivo dessa fase é verificar o comportamento da aplicação em condições mais próximas do uso real antes dos primeiros pilotos.

---

# Direção do Projeto

O CYRNEX FLOW está sendo desenvolvido como mais do que uma aplicação de demonstração.

O projeto é estruturado com a proposta de construir um produto SaaS sustentável e preparado para evoluir por meio de novos módulos, integrações, automações e capacidades operacionais.

A fase atual do desenvolvimento está concentrada na consolidação do núcleo da plataforma antes da expansão para novos recursos.

---

# Objetivo Deste Repositório

Este repositório foi criado como uma **vitrine técnica e profissional** do CYRNEX FLOW.

Seu objetivo é demonstrar experiência prática com:

- desenvolvimento full stack
- arquitetura de software
- bancos de dados relacionais
- documentação técnica
- segurança de aplicações
- modelagem de regras de negócio
- sistemas multiempresa
- arquitetura SaaS
- desenvolvimento de produto
- qualidade e escalabilidade

Este repositório inclui um **snapshot sanitizado do código-fonte da V11.7.2 RC1** para avaliação técnica.

O snapshot público inclui frontend, backend, migrations e políticas de banco de dados, workflows de CI, exemplos de configuração de deploy, scripts e documentação técnica.

Permanecem intencionalmente excluídos:

- credenciais e segredos
- documentos operacionais privados
- configurações sensíveis exclusivas de produção
- dados pessoais ou de clientes
- o histórico canônico privado de desenvolvimento

---

# Estrutura do Repositório

```text
cyrnex-flow-showcase/
|
+-- README.md
+-- README.pt-BR.md
+-- screenshots Cyrnex Flow/
|   +-- 01-visao-geral.png
|   +-- 02-agenda.png
|   +-- 03-clientes.png
|   +-- 04-financeiro-faturamento.png
|   +-- 05-financeiro-despesas.png
|   +-- 06-pagina-publica.png
|
+-- source/
    +-- web/
    +-- server/
    +-- supabase/
    +-- scripts/
    +-- docs/
    +-- .github/
    +-- package.json
    +-- render.yaml
    +-- .env.example
```

O diretório `source/` contém o snapshot técnico sanitizado da V11.7.2 RC1, enquanto credenciais, segredos de produção, materiais operacionais privados e o histórico canônico de desenvolvimento permanecem excluídos.

---

<div align="center">

# CYRNEX FLOW

### Feito para gestores. Construído para escalar.

**Desenvolvido por Caique Martins**

[GitHub](https://github.com/Caique-Martinss)

</div>
