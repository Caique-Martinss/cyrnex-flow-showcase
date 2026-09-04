<div align="center">

# CYRNEX FLOW

### Full-Stack SaaS Platform for Appointment-Based Businesses

**React • TypeScript • Node.js • PostgreSQL • Supabase • Render**

**V11.7.2 RC1 • Pre-Staging**

[English](README.md) • [Português](README.pt-BR.md) • [Explore Source Code](source/)

</div>

---

## About CYRNEX FLOW

**CYRNEX FLOW** is a full-stack SaaS platform designed to centralize and professionalize the operations of businesses that rely on appointments.

The product was initially designed for **barbershops**, bringing together operations, management, and customer experience in a single ecosystem.

Rather than focusing only on the user interface, the project was structured with a real-product mindset, involving decisions related to:

- software architecture
- data modeling
- business rules
- authentication and authorization
- multi-tenant data isolation
- application security
- observability
- user experience
- stability
- deployment and production readiness

> **This repository is the public technical showcase of the project.**
>
> This repository includes a sanitized V11.7.2 RC1 source snapshot for technical evaluation. Credentials, production secrets, private operational material, and the canonical development history remain private.

---

## Product Overview

CYRNEX FLOW was designed to replace fragmented operational processes with a centralized platform.

### Operations

**Scheduling • Customers • Services • Professionals • Availability • History**

### Management

**Finance • Revenue • Expenses • Indicators • Settings**

### Customer Experience

**Public Page • Online Booking • Rescheduling • Cancellation**

### Platform

**Authentication • Multi-Tenancy • Permissions • Auditing • Observability**

---

# Real Product Screenshots

The screenshots below are **real captures of CYRNEX FLOW V11.7.2 RC1**, using demonstration data.

## Overview

![CYRNEX FLOW Overview](screenshots%20Cyrnex%20Flow/01-visao-geral.png)

The Overview screen provides operational context and quick access to the most important actions of the business.

---

## Scheduling

![CYRNEX FLOW Scheduling](screenshots%20Cyrnex%20Flow/02-agenda.png)

Scheduling is one of the core modules of the platform.

It centralizes appointments and was designed to work with different calendar views, availability rules, professionals, and appointment lifecycle states.

---

## Customers

![CYRNEX FLOW Customers](screenshots%20Cyrnex%20Flow/03-clientes.png)

The Customers module centralizes important customer information and remains connected to the operational workflows of the platform.

---

## Finance — Revenue

![CYRNEX FLOW Finance Revenue](screenshots%20Cyrnex%20Flow/04-financeiro-faturamento.png)

The revenue area provides visibility into financial inflows and received payments, organized by period and connected to operational activity.

---

## Finance — Expenses

![CYRNEX FLOW Finance Expenses](screenshots%20Cyrnex%20Flow/05-financeiro-despesas.png)

The Expenses module complements the financial view by helping organize and monitor the operational costs of the business.

---

## Public Page

![CYRNEX FLOW Public Page](screenshots%20Cyrnex%20Flow/06-pagina-publica.png)

The Public Page represents the customer-facing experience of the platform.

It introduces the business, presents its services, and acts as the entry point for the online booking flow.

---

# Main Features

| Area | Features |
|---|---|
| **Scheduling** | Day, week and month views, availability, blocks and appointment lifecycle |
| **Customers** | Registration, editing, history and integration with appointments |
| **Services** | Service management, duration and operational rules |
| **Professionals** | Team organization and availability |
| **Finance** | Revenue, payments, expenses and operational financial visibility |
| **Public Page** | Business presentation and online booking experience |
| **Authentication** | Login, sessions and password recovery |
| **Multi-Tenancy** | Context and data isolation between different businesses |
| **Platform Administration** | Business management, subscriptions, auditing and observability |

---

# Technology Stack

## Frontend

**React**  
**TypeScript**

## Backend

**Node.js**  
**TypeScript**  
**REST API**

## Database & Services

**PostgreSQL**  
**Supabase**  
**Supabase Auth**  
**Row Level Security — RLS**

## Infrastructure & Deployment

**Render**  
**Supabase**

## Version Control

**Git**  
**GitHub**

---

# High-Level Architecture

```text
┌──────────────────────────────┐
│          CLIENT              │
│      Browser / Mobile        │
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
│ • Operational Data           │
│ • Authentication             │
│ • Row Level Security         │
│ • Storage                    │
└──────────────────────────────┘
```

The application separates responsibilities across the **frontend, backend, and database layers**.

Sensitive operations are validated on the server, while the database provides additional mechanisms for security and data isolation.

---

# Multi-Tenant Architecture

One of the main architectural goals of CYRNEX FLOW is to support **multiple businesses using the same platform without mixing their data**.

Each business operates within its own context.

The architecture considers:

- business identification for operational requests
- logical data separation
- relational validation
- backend authorization
- PostgreSQL security policies
- Row Level Security
- prevention of cross-tenant data access

The goal is to allow the platform to scale while maintaining strict separation between customer environments.

---

# Security

Security is treated as part of the architecture rather than as an afterthought.

Some of the concepts applied to the project include:

### Authentication

Supabase Auth and session management.

### Authorization

Backend access validation before sensitive operations.

### Row Level Security

PostgreSQL RLS policies provide an additional data protection layer.

### Server-Side Validation

Critical business rules are not dependent exclusively on the frontend.

### Auditing

Relevant administrative actions can be recorded for traceability.

### Environment Secrets

Private credentials and keys are never stored in this public repository.

---

# Observability & Platform Operations

In addition to the business-facing application, the project includes a separate administrative layer for operating the SaaS itself.

**CYRNEX Admin** was designed to support platform-level operations such as:

- business management
- subscription management
- system health monitoring
- logs
- auditing
- operational diagnostics
- controlled administrative actions

The platform administration layer is included in the sanitized public source snapshot. Production credentials, sensitive operational data, and private deployment material remain excluded.

---

# Quality & Stability

The development workflow includes multiple validation processes designed to reduce regressions as the product evolves.

Validation areas include:

- code structure
- TypeScript
- database integrity
- authentication
- security
- scheduling
- financial workflows
- public booking
- responsive behavior
- daily operations
- launch readiness

The project includes several **automated validation and build gates** that are executed before preparing a new release.

These checks help verify critical areas of the application before a version moves forward in the release process.

---

# Technical Challenges

Some of the main technical challenges addressed during the development of CYRNEX FLOW include:

### Multi-Tenancy

Allowing different businesses to use the same application while keeping their data isolated.

### Scheduling & Availability

Maintaining consistency between schedules, professionals, services, availability rules, and appointment states.

### Module Integration

Connecting Scheduling, Customers, and Finance while avoiding duplicated business logic.

### Security

Separating authentication, authorization, server-side validation, and tenant isolation correctly.

### Platform Operations

Building internal tools for operating and monitoring the SaaS through logs, auditing, system health, and observability.

### Production Readiness

Preparing environment configuration, deployment infrastructure, health checks, release validation, and operational documentation.

---

# Engineering Areas Applied

CYRNEX FLOW has provided practical experience across several layers of software engineering.

### Frontend Engineering

- component-based architecture
- responsive interfaces
- state management
- operational user flows
- customer-facing experiences

### Backend Engineering

- REST APIs
- domain rules
- authorization
- server-side validation
- error handling
- operational services

### Database Engineering

- relational modeling
- PostgreSQL
- multi-tenant data structures
- Row Level Security
- integrity and consistency rules

### Application Security

- authentication
- authorization
- tenant isolation
- protected administrative operations
- secure environment configuration

### Platform Engineering

- observability
- auditing
- health monitoring
- deployment preparation
- release validation

---

# Current Status

### `CYRNEX FLOW V11.7.2 RC1`

The project is currently in the **pre-staging** phase.

The main application core has passed local validation, and the next stage is to validate complete workflows in an online environment through **end-to-end testing**.

The goal of this phase is to verify the application under conditions closer to real-world usage before the first pilot deployments.

---

# Project Direction

CYRNEX FLOW is being developed as more than a demonstration application.

The project is structured around the idea of building a maintainable SaaS product capable of evolving through new modules, integrations, automation, and operational capabilities.

The current development phase focuses on consolidating the platform's core before expanding into additional features.

---

# Purpose of This Repository

This repository was created as a **technical and professional showcase** of CYRNEX FLOW.

Its purpose is to demonstrate practical experience with:

- full-stack development
- software architecture
- relational databases
- technical documentation
- application security
- business rule modeling
- multi-tenant systems
- SaaS architecture
- product development
- quality and scalability

This repository includes a **sanitized V11.7.2 RC1 source snapshot** for technical evaluation.

The public snapshot includes frontend, backend, database migrations and policies, CI workflows, deployment configuration examples, scripts, and technical documentation.

The following remain intentionally excluded:

- credentials and secrets
- private operational documents
- production-only sensitive configuration
- personal or customer data
- the canonical private development history

---

# Repository Structure

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

The `source/` directory contains the sanitized V11.7.2 RC1 technical snapshot, while credentials, production secrets, private operational material, and the canonical development history remain excluded.

---

<div align="center">

# CYRNEX FLOW

### Built for managers. Designed to scale.

**Developed by Caique Martins**

[GitHub](https://github.com/Caique-Martinss)

</div>
