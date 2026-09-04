/* V11.6.3 — Mobile First / responsividade de lançamento
   Camada final, carregada depois de todos os estilos legados. */

.mobile-panel-header,
.mobile-bottom-nav,
.mobile-more-layer {
  display: none;
}

.onboarding-mobile-current {
  display: none;
}

@media (max-width: 850px) {
  html,
  body,
  #root {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  body {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    overscroll-behavior-x: none;
  }

  input,
  select,
  textarea {
    max-width: 100%;
    font-size: 16px !important;
  }

  input:not([type='checkbox']):not([type='radio']),
  select,
  textarea {
    min-height: 46px;
  }

  textarea {
    line-height: 1.5;
  }

  button,
  a,
  summary,
  label[role='button'] {
    touch-action: manipulation;
  }

  .icon-button,
  .text-button,
  .nav-button,
  .theme-switch button,
  .date-option,
  .time-slot,
  .selectable-chip,
  .weekday-button,
  .management-filter-button,
  .finance-period-button {
    min-height: 44px !important;
  }

  .icon-button {
    min-width: 44px;
    width: 44px;
    height: 44px;
  }

  .desktop-sidebar {
    display: none !important;
  }

  .mobile-panel-header {
    position: sticky;
    top: 0;
    z-index: 55;
    min-height: 64px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--text) 5%, transparent);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .mobile-panel-brand {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mobile-panel-brand .brand-mark {
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    border-radius: 13px;
  }

  .mobile-panel-brand > div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .mobile-panel-brand strong,
  .mobile-panel-brand small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-panel-brand strong {
    font-size: .91rem;
  }

  .mobile-panel-brand small {
    color: var(--muted);
    font-size: .69rem;
    font-weight: 680;
  }

  .mobile-panel-role {
    flex: 0 0 auto;
    padding: 6px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface-soft);
    color: var(--muted);
    font-size: .64rem;
    font-weight: 800;
  }

  .mobile-bottom-nav {
    position: fixed;
    z-index: 70;
    left: 8px;
    right: 8px;
    bottom: 8px;
    min-height: 66px;
    padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 2px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    box-shadow: 0 18px 48px color-mix(in srgb, #000 22%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .mobile-bottom-nav > button {
    position: relative;
    min-width: 0;
    min-height: 52px !important;
    padding: 5px 2px !important;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    border: 0 !important;
    border-radius: 14px !important;
    background: transparent !important;
    color: var(--muted) !important;
    box-shadow: none !important;
    transform: none !important;
    font-size: .61rem;
    font-weight: 760;
  }

  .mobile-bottom-nav > button.active {
    background: var(--primary-soft) !important;
    color: var(--primary-strong) !important;
  }

  .mobile-bottom-nav > button em {
    position: absolute;
    top: 3px;
    right: max(5px, calc(50% - 21px));
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: .53rem;
    font-style: normal;
    font-weight: 900;
  }

  .mobile-nav-icon {
    min-height: 19px;
    display: grid;
    place-items: center;
    color: currentColor;
    font-size: 1.02rem;
    font-weight: 900;
    line-height: 1;
  }

  .mobile-more-layer {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: block;
  }

  .mobile-more-backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: color-mix(in srgb, #000 52%, transparent) !important;
    box-shadow: none !important;
    backdrop-filter: blur(4px);
  }

  .mobile-more-sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: min(82dvh, 720px);
    padding: 9px 16px calc(92px + env(safe-area-inset-bottom));
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: 26px 26px 0 0;
    background: var(--surface);
    box-shadow: 0 -24px 60px rgba(0, 0, 0, .2);
    animation: mobileSheetEnter .18s ease-out;
  }

  @keyframes mobileSheetEnter {
    from { transform: translateY(28px); opacity: .8; }
    to { transform: none; opacity: 1; }
  }

  .mobile-more-handle {
    width: 44px;
    height: 4px;
    margin: 1px auto 12px;
    border-radius: 999px;
    background: var(--border);
  }

  .mobile-more-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .mobile-more-heading > div {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .mobile-more-heading strong {
    font-size: 1.05rem;
  }

  .mobile-more-close {
    width: 44px;
    height: 44px;
    min-height: 44px !important;
    padding: 0 !important;
    border: 1px solid var(--border) !important;
    border-radius: 13px !important;
    background: var(--surface-soft) !important;
    color: var(--text) !important;
    box-shadow: none !important;
    font-size: 1.45rem;
  }

  .mobile-more-actions {
    display: grid;
    gap: 8px;
  }

  .mobile-more-actions > button {
    min-height: 64px !important;
    padding: 12px 14px !important;
    display: grid !important;
    gap: 3px;
    justify-items: start;
    border: 1px solid var(--border) !important;
    background: var(--surface-soft) !important;
    color: var(--text) !important;
    box-shadow: none !important;
    text-align: left;
  }

  .mobile-more-actions > button small {
    color: var(--muted);
    font-size: .69rem;
    font-weight: 560;
  }

  .mobile-development-list,
  .mobile-account-card {
    margin-top: 14px;
    padding-top: 14px;
    display: grid;
    gap: 8px;
    border-top: 1px solid var(--border);
  }

  .mobile-sheet-section-title {
    color: var(--muted);
    font-size: .68rem;
    font-weight: 820;
    letter-spacing: .05em;
    text-transform: uppercase;
  }

  .mobile-development-list > div {
    min-height: 48px;
    padding: 9px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-radius: 12px;
    background: var(--surface-soft);
    color: var(--muted);
  }

  .mobile-development-list small {
    max-width: 110px;
    font-size: .62rem;
    text-align: right;
  }

  .mobile-account-card > div {
    display: grid;
    gap: 2px;
  }

  .mobile-account-card small,
  .mobile-account-card label > span {
    color: var(--muted);
    font-size: .68rem;
  }

  .mobile-account-card label {
    display: grid;
    gap: 6px;
  }

  .mobile-account-card select {
    width: 100%;
  }

  .mobile-logout {
    width: 100%;
    border: 1px solid var(--border) !important;
    background: transparent !important;
    color: var(--muted) !important;
    box-shadow: none !important;
  }

  .main-content {
    width: 100%;
    margin-left: 0 !important;
    padding: 16px 14px calc(98px + env(safe-area-inset-bottom)) !important;
  }

  .topbar {
    margin-bottom: 14px;
  }

  .topbar-copy {
    display: none;
  }

  .top-actions {
    width: 100%;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px;
    align-items: stretch;
  }

  .top-actions .theme-switch {
    width: max-content;
  }

  .top-actions .secondary-button {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .top-actions > button:last-child {
    grid-column: 1 / -1;
    width: 100%;
    min-height: 48px;
  }

  .management-workspace,
  .page-section,
  .panel,
  .management-premium-panel,
  .agenda-page,
  .finance-v116-page {
    min-width: 0;
    max-width: 100%;
  }

  .panel,
  .management-premium-panel {
    border-radius: 17px;
  }

  .management-hero,
  .overview-hero,
  .agenda-page-title {
    border-radius: 18px;
  }

  .management-hero,
  .overview-hero,
  .panel,
  .management-premium-panel {
    padding: 16px;
  }

  .metric-grid,
  .overview-metrics,
  .client-insight-grid,
  .finance-v116-metrics,
  .finance-v116-expense-metrics {
    gap: 10px;
  }

  .metric-card,
  .client-insight-card,
  .finance-v116-metric,
  .finance-v116-expense-metric {
    min-height: 0;
    padding: 16px;
  }

  .metric-card strong,
  .client-insight-card > strong {
    margin-top: 10px;
  }

  .empty-state {
    min-height: 180px;
    padding: 22px 16px;
  }

  /* Clientes */
  .clients-toolbar {
    gap: 10px;
    padding: 10px;
  }

  .management-filter-group {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .management-filter-button {
    min-width: 0;
    padding-inline: 7px !important;
    font-size: .71rem;
  }

  .premium-client-list {
    gap: 9px;
  }

  .premium-client-row {
    gap: 12px;
    padding: 14px;
  }

  .premium-client-row:hover {
    transform: none;
  }

  .client-row-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }

  .client-edit-action,
  .client-contact-action {
    min-height: 44px;
    padding: 0 10px;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: var(--surface);
    text-align: center;
    text-decoration: none;
  }

  .client-contact-action {
    width: auto !important;
  }

  /* Financeiro */
  .finance-v116-period-panel,
  .finance-v116-section,
  .finance-v116-panel {
    border-radius: 17px;
  }

  .finance-v116-period-tabs {
    gap: 5px;
  }

  .finance-v116-entry > summary {
    min-height: 54px;
  }

  .finance-v116-filter-popover {
    z-index: 82;
    bottom: calc(88px + env(safe-area-inset-bottom));
    max-height: min(62dvh, 520px);
    overflow-y: auto;
    border-radius: 18px;
    box-shadow: var(--shadow-lg);
  }

  .finance-v116-deposits > summary {
    min-height: 52px;
  }

  /* Agenda: celular prioriza leitura rápida, sem tabelas horizontais. */
  .agenda-primary-actions {
    gap: 7px;
  }

  .agenda-toolbar {
    border-radius: 16px;
  }

  .agenda-date-navigation button,
  .agenda-view-switch button {
    min-height: 44px !important;
  }

  .agenda-filter-row label,
  .next-availability-form label {
    min-width: 0;
  }

  .agenda-day-columns,
  .agenda-professional-column,
  .agenda-event-card,
  .agenda-free-card,
  .agenda-block-card {
    min-width: 0;
  }

  .appointment-inspector {
    border-radius: 18px;
  }

  .inspector-info-list > div {
    align-items: flex-start;
  }

  .inspector-info-list strong {
    max-width: 62%;
    overflow-wrap: anywhere;
  }

  .operational-actions,
  .inspector-actions {
    gap: 7px;
  }

  /* Modais */
  .modal-backdrop {
    padding: 0 !important;
  }

  .modal,
  .modal.appointment-form-modal {
    max-height: 100dvh !important;
    min-height: 100dvh;
    padding: 16px !important;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .modal-header {
    position: sticky;
    top: -16px;
    z-index: 12;
    margin: -16px -16px 16px;
    padding: calc(12px + env(safe-area-inset-top)) 16px 12px;
    align-items: flex-start;
    background: color-mix(in srgb, var(--surface) 97%, transparent);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(16px);
  }

  .modal-header .eyebrow {
    display: none;
  }

  .modal-header h2 {
    font-size: 1.25rem;
  }

  .modal .modal-actions {
    position: sticky;
    z-index: 11;
    bottom: -16px;
    margin: 16px -16px -16px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: color-mix(in srgb, var(--surface) 97%, transparent);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(16px);
  }

  .toast {
    left: 12px;
    right: 12px;
    bottom: calc(88px + env(safe-area-inset-bottom));
    max-width: none;
  }

  /* Onboarding: informação do passo sempre visível, conteúdo confortável. */
  .premium-onboarding-shell .onboarding-sidebar {
    position: sticky !important;
    top: 0;
    z-index: 60;
    padding: 9px 12px 8px !important;
    gap: 7px;
    border-right: 0;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 97%, transparent);
    backdrop-filter: blur(18px);
  }

  .premium-onboarding-shell .onboarding-brand,
  .premium-onboarding-shell .onboarding-sidebar-note {
    display: none !important;
  }

  .premium-onboarding-shell .onboarding-progress-card {
    display: grid !important;
    gap: 6px;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
  }

  .premium-onboarding-shell .onboarding-progress-copy {
    padding: 0;
    border: 0;
  }

  .premium-onboarding-shell .onboarding-progress-copy span {
    font-size: .64rem;
  }

  .premium-onboarding-shell .onboarding-progress-copy strong {
    font-size: .72rem;
  }

  .onboarding-mobile-current {
    display: block;
    font-size: .83rem;
  }

  .premium-onboarding-shell .onboarding-progress-track {
    height: 5px;
  }

  .premium-onboarding-shell .onboarding-progress-card > small {
    display: none;
  }

  .premium-onboarding-shell .onboarding-sidebar nav {
    margin: 0 -2px;
    padding: 0 0 1px;
    gap: 4px;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
  }

  .premium-onboarding-shell .onboarding-sidebar nav::-webkit-scrollbar {
    display: none;
  }

  .premium-onboarding-shell .onboarding-sidebar nav button {
    min-width: 42px !important;
    min-height: 38px !important;
    padding: 0 !important;
    scroll-snap-align: center;
  }

  .premium-onboarding-shell .onboarding-sidebar nav button > span {
    width: 27px;
    height: 27px;
  }

  .premium-onboarding-shell .onboarding-main {
    padding: 12px 12px calc(90px + env(safe-area-inset-bottom)) !important;
  }

  .onboarding-topbar {
    position: static;
    min-height: 48px;
    padding: 6px 2px 10px;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .onboarding-topbar-copy {
    display: none;
  }

  .premium-onboarding-shell .section-card,
  .premium-onboarding-shell .professional-editor,
  .premium-onboarding-shell .module-choice-card,
  .premium-onboarding-shell .review-card {
    border-radius: 16px;
  }

  .premium-onboarding-shell .onboarding-actions {
    bottom: calc(8px + env(safe-area-inset-bottom));
    z-index: 45;
    margin-top: 16px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 17px;
    background: color-mix(in srgb, var(--surface) 97%, transparent);
    box-shadow: 0 12px 38px rgba(0, 0, 0, .12);
    backdrop-filter: blur(16px);
  }

  .weekday-button,
  .payment-choice,
  .module-toggle,
  .selectable-chip,
  .upload-button {
    min-height: 44px;
  }

  .media-upload-row {
    align-items: flex-start;
  }

  .preview-toolbar {
    position: static;
  }

  /* Auth */
  .auth-panel {
    min-width: 0;
  }

  .auth-form,
  .recovery-shell {
    max-width: 100%;
  }

  /* Public page / booking / Meu Agendamento */
  .pp-nav-inner,
  .pp-mobile-menu a,
  .pp-mobile-menu button,
  .pp-primary,
  .pp-secondary,
  .pp-service-card,
  .pp-pro-card,
  .pp-any-pro,
  .pp-booking-shell button,
  .appointment-management-page button {
    touch-action: manipulation;
  }

  .pp-mobile-toggle {
    min-width: 44px;
    width: 44px;
    min-height: 44px;
    height: 44px;
  }

  .pp-mobile-menu a,
  .pp-mobile-menu button {
    min-height: 48px;
    display: flex;
    align-items: center;
  }

  .pp-primary,
  .pp-secondary,
  .booking-actions button,
  .appointment-management-actions button,
  .management-utility-actions button,
  .payment-proof-upload button {
    min-height: 48px !important;
  }

  .pp-media-grid,
  .date-strip {
    scrollbar-width: none;
  }

  .pp-media-grid::-webkit-scrollbar,
  .date-strip::-webkit-scrollbar {
    display: none;
  }

  .payment-proof-upload input[type='file'] {
    font-size: .84rem !important;
  }
}

@media (max-width: 620px) {
  .main-content {
    padding-inline: 10px !important;
  }

  .mobile-panel-header {
    min-height: 60px;
    padding-inline: 10px;
  }

  .mobile-panel-role {
    display: none;
  }

  .top-actions {
    grid-template-columns: 1fr 1fr;
  }

  .top-actions .theme-switch {
    width: 100%;
  }

  .top-actions .theme-switch button {
    flex: 1;
  }

  .management-hero,
  .overview-hero,
  .panel,
  .management-premium-panel {
    padding: 14px;
  }

  .management-hero-copy h2,
  .agenda-page-title h1,
  .page-title-row h2 {
    font-size: 1.55rem;
  }

  .client-insight-grid,
  .overview-metrics,
  .metric-grid,
  .finance-v116-metrics,
  .finance-v116-expense-metrics {
    grid-template-columns: 1fr !important;
  }

  .premium-client-row {
    grid-template-columns: 1fr !important;
  }

  .client-detail-block,
  .client-value-block,
  .client-row-actions {
    grid-column: 1 !important;
  }

  .client-row-actions {
    grid-template-columns: 1fr 1fr;
  }

  /* Agenda semana: lista vertical legível em vez de 7 colunas para arrastar. */
  .agenda-week-grid {
    grid-template-columns: 1fr !important;
    gap: 8px;
    overflow: visible !important;
  }

  .agenda-week-day {
    min-width: 0 !important;
    min-height: 104px !important;
    padding: 13px !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 14px;
    text-align: left;
  }

  .agenda-week-day-head {
    grid-column: 1 / -1;
  }

  .week-occupancy-track {
    grid-column: 1 / -1;
  }

  .week-count {
    align-self: end;
    font-size: 1.35rem !important;
  }

  .agenda-week-day > small {
    align-self: end;
    justify-self: end;
  }

  .week-preview-list {
    grid-column: 1 / -1;
  }

  /* Agenda mês: calendário inteiro cabe no telefone. */
  .agenda-month-wrap {
    overflow: visible !important;
  }

  .agenda-month-weekdays,
  .agenda-month-grid {
    width: 100% !important;
    grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
    gap: 3px !important;
  }

  .agenda-month-weekdays span {
    min-width: 0;
    padding: 5px 0;
    font-size: .58rem;
    text-align: center;
  }

  .agenda-month-day {
    position: relative;
    min-width: 0 !important;
    min-height: 50px !important;
    padding: 6px 2px !important;
    place-items: center !important;
    align-content: center !important;
    border-radius: 10px !important;
  }

  .agenda-month-day .month-day-number {
    margin: 0 !important;
    font-size: .78rem;
  }

  .agenda-month-day .month-day-content,
  .agenda-month-day .month-day-title,
  .agenda-month-day .month-day-hint,
  .agenda-month-day small,
  .agenda-month-day em {
    display: none !important;
  }

  .agenda-month-day.has-appointments::after {
    content: '';
    position: absolute;
    bottom: 6px;
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--primary);
  }

  .agenda-month-day.closed {
    opacity: .46;
  }

  .agenda-month-day.today {
    box-shadow: inset 0 0 0 2px var(--primary) !important;
  }

  .agenda-month-title {
    margin-bottom: 9px;
  }

  .agenda-event-card,
  .agenda-block-card,
  .agenda-free-card {
    grid-template-columns: 54px minmax(0, 1fr) !important;
    padding: 11px !important;
  }

  .agenda-event-time,
  .agenda-block-time {
    font-size: .7rem;
  }

  .agenda-date-navigation {
    grid-template-columns: 44px minmax(0, 1fr) 44px !important;
    gap: 6px;
  }

  .agenda-date-navigation > .secondary-button:first-child {
    grid-column: 1 / -1;
    width: 100%;
    min-height: 42px !important;
  }

  .agenda-date-navigation strong,
  .agenda-date-navigation > div {
    font-size: .75rem;
  }

  .agenda-view-switch {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .agenda-view-switch button {
    padding-inline: 5px !important;
    font-size: .7rem;
  }

  .day-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .operational-actions,
  .inspector-actions {
    grid-template-columns: 1fr !important;
  }

  .inspector-info-list > div {
    display: grid;
    gap: 3px;
  }

  .inspector-info-list strong {
    max-width: 100%;
    text-align: left;
  }

  /* Onboarding */
  .premium-onboarding-shell .onboarding-step > header {
    min-height: 0 !important;
    padding: 17px 15px !important;
  }

  .premium-onboarding-shell .onboarding-step > header h1 {
    font-size: 1.65rem;
  }

  .weekday-selector,
  .payment-choice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .period-row,
  .pause-row,
  .addon-row,
  .addon-field-card {
    grid-template-columns: 1fr !important;
  }

  .period-row > strong,
  .period-row > button,
  .pause-row > strong,
  .pause-row > button,
  .addon-row button,
  .addon-field-card button {
    grid-column: 1 !important;
  }

  .service-summary-header,
  .service-summary-main {
    align-items: stretch !important;
    flex-direction: column !important;
  }

  .service-summary-data {
    justify-content: flex-start;
  }

  .service-summary-actions {
    width: 100%;
  }

  .service-summary-actions button {
    flex: 1;
  }

  .public-builder-layout {
    gap: 14px;
  }

  /* Financeiro */
  .finance-v116-custom-range {
    grid-template-columns: 1fr !important;
  }

  .finance-v116-entry > summary {
    grid-template-columns: 52px minmax(0, 1fr) auto 16px !important;
    gap: 7px;
  }

  .finance-v116-entry-value {
    font-size: .82rem;
  }

  .finance-v116-deposit-row {
    display: grid;
    gap: 4px;
  }

  /* Página pública */
  .pp-shell {
    width: min(calc(100% - 20px), var(--pp-shell)) !important;
  }

  .pp-section {
    padding-block: 28px !important;
  }

  .pp-hero-collage {
    height: 340px !important;
  }

  .pp-service-image {
    height: 190px !important;
  }

  .pp-pro-card {
    grid-template-columns: 92px minmax(0, 1fr) !important;
  }

  .pp-staff-toolbar-actions {
    grid-template-columns: 1fr !important;
  }

  .pp-staff-toolbar-actions .is-primary {
    grid-column: auto !important;
    grid-row: auto !important;
  }

  .appointment-management-shell.pp-booking-shell {
    padding: 16px 12px !important;
  }

  .manual-pix-card {
    padding: 16px;
  }
}

@media (max-width: 430px) {
  .mobile-bottom-nav {
    left: 5px;
    right: 5px;
    bottom: 5px;
    border-radius: 18px;
  }

  .mobile-bottom-nav > button {
    font-size: .56rem;
  }

  .mobile-nav-icon {
    font-size: .94rem;
  }

  .top-actions {
    grid-template-columns: 1fr;
  }

  .top-actions .theme-switch,
  .top-actions .secondary-button {
    width: 100%;
  }

  .top-actions > button:last-child {
    grid-column: auto;
  }

  .management-filter-group,
  .client-row-actions,
  .finance-v116-period-tabs {
    grid-template-columns: 1fr !important;
  }

  .management-filter-button {
    width: 100%;
  }

  .agenda-toolbar {
    padding: 11px !important;
  }

  .agenda-month-weekdays,
  .agenda-month-grid {
    gap: 2px !important;
  }

  .agenda-month-day {
    min-height: 44px !important;
    border-radius: 8px !important;
  }

  .premium-onboarding-shell .onboarding-main {
    padding-inline: 9px !important;
  }

  .premium-onboarding-shell .section-card,
  .premium-onboarding-shell .professional-editor,
  .premium-onboarding-shell .module-choice-card,
  .premium-onboarding-shell .review-card {
    padding: 14px !important;
  }

  .pp-hero h1 {
    font-size: clamp(42px, 14vw, 58px) !important;
  }

  .pp-hero-collage {
    height: 305px !important;
  }

  .pp-float-1 {
    height: 210px !important;
  }

  .pp-float-2,
  .pp-float-3 {
    height: 125px !important;
  }

  .pp-pro-card {
    grid-template-columns: 1fr !important;
  }

  .pp-pro-card img,
  .pp-pro-photo {
    width: 100% !important;
    max-height: 220px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-more-sheet,
  .page-section,
  .onboarding-step {
    animation: none !important;
  }
}

/* Ajustes finais de ergonomia para acesso e configurações no telefone. */
@media (max-width: 620px) {
  .auth-screen {
    display: block !important;
    min-height: 100dvh;
  }

  .auth-showcase {
    min-height: 0 !important;
    padding: calc(12px + env(safe-area-inset-top)) 16px 12px !important;
    gap: 0 !important;
    border-right: 0;
    border-bottom: 1px solid var(--accent-line);
  }

  .auth-showcase::before,
  .auth-showcase::after,
  .auth-showcase-copy,
  .auth-showcase-visual,
  .auth-feature-list {
    display: none !important;
  }

  .auth-brand {
    min-height: 44px;
  }

  .auth-brand .brand-mark {
    width: 40px;
    height: 40px;
    border-radius: 13px;
  }

  .auth-panel {
    min-height: calc(100dvh - 69px) !important;
    padding: 12px 10px calc(20px + env(safe-area-inset-bottom)) !important;
    align-content: start;
  }

  .auth-panel-toolbar {
    min-height: 48px;
    padding-inline: 4px;
  }

  .auth-form {
    width: 100%;
    padding: 20px 16px !important;
    border-radius: 18px !important;
  }

  .auth-form header h1,
  .auth-form header h2 {
    font-size: 1.65rem;
  }

  .password-toggle {
    min-height: 36px !important;
  }

  .recovery-code-input {
    font-size: 22px !important;
    letter-spacing: .18em;
  }

  .page-title-row > button,
  .settings-account-heading > button,
  .new-business-form > button,
  .business-switch-card button {
    width: 100%;
  }

  .settings-overview-card dl > div {
    display: grid;
    gap: 3px;
  }

  .settings-overview-card dd {
    overflow-wrap: anywhere;
  }

  .business-switch-grid {
    grid-template-columns: 1fr;
  }

  .new-business-form {
    padding: 14px;
  }
}
