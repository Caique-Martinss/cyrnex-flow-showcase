# Página Pública — Booking V6

## Direção oficial

O fluxo público de agendamento deve parecer parte da Página Pública aprovada, e não um formulário administrativo separado.

Direção visual obrigatória:

- fundo preto/carvão;
- acentos dourados;
- bordas e glow discretos no hover/foco/seleção;
- progressão em 6 etapas;
- resumo vivo da reserva no desktop;
- experiência mobile em tela cheia;
- responsividade e reflow sem depender de largura fixa;
- ações claras, estados desabilitados e foco por teclado;
- confirmação somente após revalidação real do servidor.

## Etapas

1. Serviço
2. Profissional
3. Data
4. Horário
5. Dados do cliente
6. Revisão

## Regra de segurança/UX

Se outra pessoa ocupar o slot antes da confirmação, a página deve explicar o conflito e oferecer nova escolha. Nunca exibir confirmação falsa.

## Separação de responsabilidades

Esta revisão altera a camada visual/interativa do booking. Não substitui o motor de disponibilidade, as regras de Agenda, RLS, isolamento multiempresa ou a futura ponte pública segura com Supabase/PostgreSQL.
