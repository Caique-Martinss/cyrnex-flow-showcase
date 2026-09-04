import type { Dispatch, SetStateAction } from 'react';
import type { OnboardingState, PaymentMethod, PaymentPreferences } from '../../../domain/types';
import { paymentLabels } from '../onboarding.constants';
interface StepProps {
    draft: OnboardingState;
    setDraft: Dispatch<SetStateAction<OnboardingState>>;
}
export function PaymentsStep({ draft, setDraft }: StepProps) {
    const methods = draft.settings.paymentMethods;
    const prefs = draft.settings.paymentPreferences;
    const pixActive = methods.some(item => item.method === 'pix' && item.active);
    const activeCardMethods = methods.filter(item => (
      (item.method === 'debit' || item.method === 'credit') && item.active
    ));
    const cardActive = activeCardMethods.length > 0;
    function updateMethod(method: PaymentMethod, patch: Record<string, unknown>) {
        setDraft(current => ({
            ...current,
            settings: {
                ...current.settings,
                paymentMethods: current.settings.paymentMethods.map(item => (
                  item.method === method ? { ...item, ...patch } : item
                ))
            }
        }));
    }
    function updatePrefs<K extends keyof PaymentPreferences>(field: K, value: PaymentPreferences[K]) {
        setDraft(current => ({
          ...current,
          settings: {
            ...current.settings,
            paymentPreferences: {
              ...current.settings.paymentPreferences,
              [field]: value
            }
          }
        }));
    }
    return (<section className="onboarding-step">
      <header>
        <span className="eyebrow">Etapa 7</span>
        <h1>Como sua barbearia recebe?</h1>
        <p>
          Defina as formas aceitas e como o sinal será recebido. Dados sensíveis só aparecem
          quando realmente necessários.
        </p>
      </header>

      <div className="section-card">
        <div className="section-card-header">
<div>
<h2>Formas de pagamento</h2>
<p>Ative tudo que seus clientes podem usar.</p>
</div>
</div>
        <div className="payment-choice-grid">
          {methods.map(item => (<button
            key={item.method}
            type="button"
            className={item.active ? 'payment-choice active' : 'payment-choice'}
            onClick={() => updateMethod(item.method, { active: !item.active })}
          >
              <span>{item.active ? '✓' : '+'}</span>
<strong>{item.method === 'other' && item.label !== 'Outro' ? item.label : paymentLabels[item.method]}</strong>
            </button>))}
        </div>
        {methods.some(item => item.method === 'other' && item.active) ? (
          <label className="other-payment-label">
            Como essa outra forma de pagamento se chama?
            <input
              value={methods.find(item => item.method === 'other')?.label ?? 'Outro'}
              onChange={event => updateMethod('other', { label: event.target.value })}
              placeholder="Ex.: Vale-presente, PicPay"
            />
          </label>
        ) : null}
      </div>

      {pixActive ? (<div className="section-card">
          <div className="section-card-header">
<div>
<h2>Pix</h2>
<p>A chave fica protegida e só deve aparecer ao cliente na etapa de pagamento.</p>
</div>
</div>
          <div className="onboarding-form-grid three-columns">
            <label>Tipo de chave<select
              value={prefs.pixKeyType}
              onChange={event => updatePrefs('pixKeyType', event.target.value as PaymentPreferences['pixKeyType'])}
            >
<option value="">Selecionar</option>
<option value="cpf">CPF</option>
<option value="cnpj">CNPJ</option>
<option value="email">E-mail</option>
<option value="phone">Telefone</option>
<option value="random">Chave aleatória</option>
</select>
</label>
            <label>Chave Pix<input
              value={prefs.pixKey}
              onChange={event => updatePrefs('pixKey', event.target.value)}
              placeholder="Sua chave"
            />
</label>
            <label>Nome do recebedor<input
              value={prefs.pixReceiverName}
              onChange={event => updatePrefs('pixReceiverName', event.target.value)}
              placeholder="Nome que aparece no pagamento"
            />
</label>
          </div>
          <Toggle
            title="Usar Pix para receber sinais"
            description="O cliente recebe esta chave no link seguro do agendamento, paga e envia o comprovante."
            checked={prefs.usePixForDeposit}
            onChange={value => {
              updatePrefs('usePixForDeposit', value);
              updatePrefs('depositMethods', value ? ['pix'] : []);
            }}
          />
        </div>) : null}

      {cardActive ? (<div className="section-card">
          <div className="section-card-header">
<div>
<h2>Cartões</h2>
<p>Configure as taxas usadas como base para o cálculo do valor recebido.</p>
</div>
</div>
          <div className="onboarding-form-grid two-columns">
            <label>Qual maquininha você usa? <span className="optional-label">opcional</span>
<input
              value={prefs.cardMachineName}
              onChange={event => updatePrefs('cardMachineName', event.target.value)}
              placeholder="Ex.: Stone, Ton, PagBank, InfinitePay"
            />
<small>
  Se usa mais de uma, informe os nomes separados por vírgula. A taxa final ainda
  pode ser ajustada ao concluir cada atendimento.
</small>
</label>
            <div className="info-callout compact-callout">
              <strong>Taxas usadas no Financeiro</strong>
              <p>
                Informe as taxas atuais. Elas serão sugeridas ao concluir o atendimento
                e ainda poderão ser ajustadas naquele lançamento.
              </p>
            </div>
          </div>
          <div className="onboarding-form-grid two-columns">
              {methods
                .filter(item => (item.method === 'debit' || item.method === 'credit') && item.active)
                .map(item => (
                  <label key={item.method}>
                    {paymentLabels[item.method]} — taxa
                    <div className="number-suffix">
<input
                type="number"
                min="0"
                step="0.01"
                value={item.feeValue}
                onChange={event => updateMethod(item.method, {
                  feeType: 'percent',
                  feeValue: Number(event.target.value)
                })}
              />
<span>%</span>
</div>
                  </label>
                ))}
            </div>
          <div className="fee-example-card">
              <strong>Exemplo do valor líquido</strong>
              <p>Veja quanto realmente entra depois da taxa, usando uma venda de R$ 100,00 como exemplo.</p>
              <div className="fee-example-grid">
                {activeCardMethods.map(item => {
                  const rate = item.feeType === 'percent' ? Number(item.feeValue || 0) : 0;
                  const feeAmount = 100 * rate / 100;
                  const net = 100 - feeAmount;
                  return (
                    <div key={item.method}>
                      <span>{paymentLabels[item.method]}</span>
                      <small>Taxa descontada: R$ {feeAmount.toFixed(2).replace('.', ',')}</small>
                      <strong>Entra R$ {net.toFixed(2).replace('.', ',')}</strong>
                      <small>Taxa configurada: {rate.toFixed(2).replace('.', ',')}%</small>
                    </div>
                  );
                })}
              </div>
              <small>
                O valor pode ser ajustado na conclusão do atendimento caso a taxa real seja diferente.
              </small>
            </div>
        </div>) : null}

      <div className="section-card">
        <div className="section-card-header">
<div>
<h2>Regras de recebimento</h2>
</div>
</div>
        <div className="settings-toggle-list">
          <Toggle
            title="Permitir pagamento somente no atendimento"
            description="Serviços sem sinal podem ser pagos presencialmente normalmente."
            checked={prefs.allowPayAtService}
            onChange={value => updatePrefs('allowPayAtService', value)}
          />
          <Toggle
            title="Permitir “pagar depois” — Em desenvolvimento"
            description="O controle de contas a receber ainda não faz parte do lançamento inicial."
            checked={false}
            disabled
            onChange={() => undefined}
          />
          <Toggle
            title="Registrar gorjetas — Em desenvolvimento"
            description="A separação de gorjeta será liberada quando o fluxo de caixa específico estiver concluído."
            checked={false}
            disabled
            onChange={() => undefined}
          />
          <Toggle
            title="Enviar comprovante ao cliente — Em desenvolvimento"
            description="Será liberado quando o canal de envio estiver conectado."
            checked={false}
            disabled
            onChange={() => undefined}
          />
        </div>
      </div>

      <div className="info-callout">
<strong>Cartão online</strong>
<p>
  Quando um gateway de pagamento real estiver conectado, ele aparecerá como opção.
  Não vamos mostrar uma função falsa antes da integração existir.
</p>
</div>
    </section>);
}
function Toggle(props: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return <label className={`settings-toggle-row ${props.disabled ? 'disabled-setting' : ''}`}>
<span>
<strong>{props.title}</strong>
<small>{props.description}</small>
</span>
<input
  type="checkbox"
  checked={props.checked}
  disabled={props.disabled}
  onChange={event => props.onChange(event.target.checked)}
/>
</label>;
}
