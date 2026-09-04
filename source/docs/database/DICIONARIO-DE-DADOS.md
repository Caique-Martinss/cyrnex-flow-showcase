# Dicionário de dados

As tabelas estão agrupadas por responsabilidade. O schema executável fica nas migrations.

## core

### `businesses`

Cadastro raiz de cada barbearia/empresa e estado do onboarding.

### `business_members`

Liga usuários autenticados à empresa e define papel (dono, gerente, profissional ou recepção).

### `business_settings`

Regras gerais de agendamento, sinal, cancelamento e antecedência.

### `business_modules`

Módulos ligados/desligados por empresa e configuração específica de cada módulo.

### `business_rules`

Regras comerciais configuráveis, como cortesia de casamento ou sinal após faltas.

### `business_hours`

Faixas de funcionamento por dia da semana; permite mais de uma faixa no mesmo dia.

### `business_payment_methods`

Formas de pagamento aceitas e regra padrão de taxa.

### `professionals`

Profissionais/barbeiros; pode ser ligado a um usuário do sistema.

## clients

### `file_assets`

Metadados dos arquivos guardados no Supabase Storage.

### `clients`

Cadastro principal do cliente, incluindo telefone normalizado e origem.

### `client_preferences`

Preferências do cliente, como detalhes do corte, sem criar colunas infinitas.

### `client_media`

Fotos de referência/antes/depois com controle explícito de autorização pública.

## services

### `services`

Serviços, preço, duração, intervalo, sinal, retorno recomendado e disponibilidade online.

### `service_addons`

Complementos reutilizáveis, como sobrancelha ou lavagem.

### `service_addon_links`

Define quais adicionais podem ser escolhidos em cada serviço.

### `professional_services`

Define quais serviços cada profissional atende e possíveis preço/duração personalizados.

## scheduling

### `recurrence_series`

Regra de agendamento recorrente do cliente.

### `recurrence_pattern_items`

Sequência de serviços da recorrência, inclusive alternância corte/pezinho.

### `appointments`

Atendimento/agendamento com snapshots financeiros e de nomes.

### `appointment_addons`

Adicionais efetivamente escolhidos em um atendimento.

### `appointment_adjustments`

Descontos, cortesias e acréscimos; inclui motivo e autorização.

### `schedule_blocks`

Bloqueios de agenda como almoço, folga, compromisso ou manutenção.

### `waiting_list_entries`

Pedido do cliente para entrar em lista de espera.

### `waiting_list_offers`

Oferta de uma vaga liberada, com prazo e resposta.

## commerce

### `products`

Catálogo próprio da barbearia, preço, custo e configuração de estoque/venda online.

### `orders`

Compra de produtos e forma de retirada.

### `order_items`

Itens e snapshots de preço/custo de cada pedido.

### `inventory_movements`

Livro-razão de estoque; entradas e saídas são eventos, não um número editado sem histórico.

### `partnerships`

Marcas e empresas parceiras mostradas na página pública.

### `partnership_products`

Produtos externos de parceiros com link de destino.

## finance

### `receivables`

Dívidas autorizadas pelo barbeiro/dono para pagamento posterior.

### `payments`

Pagamentos de atendimento, pedido ou pendência, com taxa e líquido calculado.

### `receivable_entries`

Baixas, perdão ou ajustes sobre uma pendência.

### `expense_categories`

Categorias configuráveis de despesas.

### `expenses`

Despesas reais da empresa.

## specialized

### `quotes`

Orçamentos, úteis principalmente para prótese e serviços variáveis.

### `quote_items`

Itens de serviço, produto ou item personalizado de um orçamento.

### `prosthesis_cases`

Ficha de acompanhamento de prótese capilar não cirúrgica.

### `prosthesis_maintenance`

Histórico de manutenções da prótese.

## publicPage

### `business_public_profiles`

Conteúdo institucional e contatos públicos da página da barbearia.

### `public_highlights`

Destaques, conquistas, estatísticas e clientes notáveis com consentimento.

### `media_mentions`

Participações em TV, redes, canais, podcasts e matérias.

## messaging

### `message_templates`

Modelos de mensagens usados nas automações.

### `notifications`

Fila/histórico de lembretes, mensagens e ofertas de lista de espera.

## security

### `audit_logs`

Trilha de auditoria de ações importantes.

## Extensões operacionais

### `professional_hours`

Horários específicos de cada profissional. Se não houver configuração, o profissional herda o horário da empresa.

### `commission_rules`

Regras de comissão por profissional e opcionalmente por serviço, com percentual ou valor fixo.

### `appointment_events`

Histórico append-only de criação, reagendamento, cancelamento, falta, conclusão e outras mudanças do atendimento.

### `booking_access_tokens`

Tokens com hash para o cliente consultar/reagendar/cancelar o próprio agendamento sem expor dados de terceiros. Acesso somente pelo backend.

### `inventory_reservations`

Reserva temporária de estoque durante compra online para evitar que duas pessoas comprem a mesma última unidade.
