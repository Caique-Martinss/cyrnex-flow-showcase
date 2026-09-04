import type {
  BusinessModuleKey,
  BusinessRuleKey,
  PaymentMethod,
  ProfessionalRole,
  PublicSectionKey
} from '../../domain/types';

export const onboardingSteps = [
  { id: 'business', label: 'Barbearia' },
  { id: 'about', label: 'Sobre' },
  { id: 'operation', label: 'Operação' },
  { id: 'hours', label: 'Horários' },
  { id: 'services', label: 'Serviços' },
  { id: 'booking', label: 'Agendamento' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'modules', label: 'Recursos' },
  { id: 'public', label: 'Página pública' },
  { id: 'review', label: 'Revisão' }
] as const;

export const weekdayLabels = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export const specialtyOptions = [
  'Degradê',
  'Corte clássico',
  'Barba',
  'Corte infantil',
  'Desenhos',
  'Afro',
  'Platinado',
  'Prótese capilar'
];

export const differentialOptions = [
  'Atendimento com hora marcada',
  'Ambiente climatizado',
  'Wi-Fi',
  'Bebidas',
  'Estacionamento',
  'Atendimento infantil',
  'Acessibilidade',
  'Atendimento domiciliar',
  'Sinuca'
];

export const roleLabels: Record<ProfessionalRole, string> = {
  owner: 'Dono',
  barber: 'Barbeiro',
  manager: 'Gerente',
  receptionist: 'Recepção',
  assistant: 'Auxiliar',
  other: 'Outro'
};

export const publicSectionLabels: Record<PublicSectionKey, string> = {
  hero: 'Capa',
  services: 'Serviços',
  portfolio: 'Trabalhos',
  team: 'Equipe',
  space: 'Nosso espaço',
  about: 'Sobre',
  hours: 'Horários',
  location: 'Localização',
  differentials: 'Diferenciais'
};

export const moduleLabels: Record<
  BusinessModuleKey,
  { title: string; description: string; recommended?: boolean }
> = {
  finance: {
    title: 'Financeiro',
    description: 'Controle entradas, despesas, taxas e veja quanto realmente sobrou.',
    recommended: true
  },
  whatsapp: {
    title: 'WhatsApp',
    description: 'Confirmações, lembretes, retornos e abertura rápida de conversas.',
    recommended: true
  },
  waitlist: {
    title: 'Lista de espera',
    description: 'Encontre clientes que estavam esperando quando uma vaga abrir.',
    recommended: true
  },
  receivables: {
    title: 'Contas a receber',
    description: 'Registre valores que serão pagos depois, sempre com autorização da barbearia.'
  },
  products: {
    title: 'Loja e produtos',
    description: 'Cadastre produtos próprios, estoque, vendas, pedidos e retiradas.'
  },
  partnerships: {
    title: 'Parcerias',
    description: 'Mostre marcas parceiras, produtos indicados, cupons e links.'
  },
  prosthesis: {
    title: 'Prótese capilar',
    description: 'Avaliações, aplicação, manutenção, fotos e retornos.'
  },
  loyalty: {
    title: 'Fidelidade',
    description: 'Crie benefícios e recompensas para clientes frequentes.'
  },
  customer_returns: {
    title: 'Clientes para retornar',
    description: 'Identifique quem está há muito tempo sem voltar e facilite o contato.',
    recommended: true
  },
  commissions: {
    title: 'Comissões',
    description: 'Calcule automaticamente quanto cada profissional tem para receber.'
  },
  reports: {
    title: 'Relatórios',
    description: 'Acompanhe serviços, horários, resultados e desempenho por período.'
  }
};


export const launchReadyModuleKeys = new Set<BusinessModuleKey>(['finance']);

export function isLaunchReadyModule(key: BusinessModuleKey): boolean {
  return launchReadyModuleKeys.has(key);
}

export const ruleLabels: Record<
  BusinessRuleKey,
  { title: string; description: string }
> = {
  groom_courtesy: {
    title: 'Cortesia para noivo',
    description: 'Registra o atendimento com 100% de desconto sem perder o valor original.'
  },
  repeat_no_show_deposit: {
    title: 'Sinal reforçado após faltas',
    description: 'Permite exigir sinal de clientes com histórico repetido de faltas.'
  }
};

export const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  debit: 'Cartão de débito',
  credit: 'Cartão de crédito',
  other: 'Outro'
};
