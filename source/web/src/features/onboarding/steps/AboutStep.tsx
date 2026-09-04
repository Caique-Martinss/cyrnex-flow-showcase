import { useState } from 'react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { BusinessMediaItem, OnboardingState } from '../../../domain/types';
import { differentialOptions, specialtyOptions } from '../onboarding.constants';
import { createMediaItem } from '../onboarding.helpers';
interface StepProps {
    draft: OnboardingState;
    setDraft: Dispatch<SetStateAction<OnboardingState>>;
    onSkip?: () => void;
}
export function AboutStep({ draft, setDraft, onSkip }: StepProps) {
    const profile = draft.settings.profile;
    function updateProfile<K extends keyof typeof profile>(field: K, value: typeof profile[K]) {
        setDraft(current => ({
            ...current,
            settings: {
                ...current.settings,
                profile: { ...current.settings.profile, [field]: value }
            }
        }));
    }
    function toggleList(field: 'specialties' | 'differentials', value: string) {
        const list = profile[field];
        updateProfile(field, list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
    }
    return (<section className="onboarding-step">
      <header className="onboarding-heading-with-action">
        <div>
          <span className="eyebrow">Etapa 2</span>
          <h1>Conte sobre sua barbearia</h1>
          <p>Essas respostas ajudam a montar sua página pública. Você pode completar tudo depois.</p>
        </div>
        {onSkip
          ? <button className="secondary-button" type="button" onClick={onSkip}>Pular por enquanto</button>
          : null}
      </header>

      <div className="section-card">
        <div className="section-card-header">
<div>
<span className="eyebrow">Identidade</span>
<h2>Logo ou foto principal</h2>
</div>
</div>
        <div className="media-upload-row">
          {profile.logoDataUrl
            ? <img className="onboarding-logo-preview" src={profile.logoDataUrl} alt="Logo da barbearia"/>
            : <div className="onboarding-logo-placeholder">CRX</div>}
          <label className="upload-button">
            {profile.logoDataUrl ? 'Trocar imagem' : '+ Adicionar logo ou foto'}
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={event => void readSingleFile(event, dataUrl => updateProfile('logoDataUrl', dataUrl))}
            />
          </label>
          {profile.logoDataUrl
            ? <button
                className="danger-link"
                type="button"
                onClick={() => updateProfile('logoDataUrl', null)}
              >Remover item</button>
            : null}
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
<div>
<span className="eyebrow">Sua história</span>
<h2>Responda do seu jeito</h2>
<p>O sistema organiza essas informações para a página pública.</p>
</div>
</div>
        <div className="onboarding-form-grid two-columns">
          <label>Como a barbearia começou?<textarea
            value={profile.originStory}
            onChange={event => updateProfile('originStory', event.target.value)}
            placeholder="Ex.: Comecei atendendo amigos e fui crescendo..."
          />
</label>
          <label>Há quanto tempo você trabalha na área?<textarea
            value={profile.experienceText}
            onChange={event => updateProfile('experienceText', event.target.value)}
            placeholder="Ex.: Trabalho como barbeiro há 8 anos."
          />
</label>
          <label>Como você define o estilo da barbearia?<textarea
            value={profile.styleDescription}
            onChange={event => updateProfile('styleDescription', event.target.value)}
            placeholder="Ex.: Ambiente moderno, descontraído e atendimento próximo."
          />
</label>
          <label>O que diferencia seu atendimento?<textarea
            value={profile.differentiatorText}
            onChange={event => updateProfile('differentiatorText', event.target.value)}
            placeholder="Ex.: Atenção aos detalhes e horário reservado sem pressa."
          />
</label>
        </div>
        <div className="onboarding-form-grid two-columns">
          <label>Desde quando você atua?<input
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={profile.foundedYear ?? ''}
            onChange={event => updateProfile('foundedYear', event.target.value ? Number(event.target.value) : null)}
            placeholder="2019"
          />
<small>A página poderá mostrar automaticamente “Mais de X anos de experiência”.</small>
</label>
          <label>Frase de destaque da página<input
            maxLength={160}
            value={profile.headline}
            onChange={event => updateProfile('headline', event.target.value)}
            placeholder="Cuidado, estilo e atendimento com hora marcada."
          />
</label>
        </div>
      </div>

      <ChoiceList
        title="No que sua barbearia é especializada?"
        description="Selecione quantas quiser. Em “Outra especialidade”, você pode escrever a sua."
        options={specialtyOptions}
        selected={profile.specialties}
        onToggle={value => toggleList('specialties', value)}
        onAdd={value => updateProfile('specialties', [...new Set([...profile.specialties, value])])}
        addLabel="+ Outra especialidade"
      />

      <MediaCollection
        title="Mostre seu espaço"
        description="Identifique o que aparece em cada foto para a página ficar organizada."
        items={profile.spaceMedia}
        categories={[
          'Fachada / entrada',
          'Área interna',
          'Cadeiras / atendimento',
          'Recepção',
          'Área de espera',
          'Outro'
        ]}
        onChange={items => updateProfile('spaceMedia', items)}
      />

      <ChoiceList
        title="O que você oferece?"
        description="Esses diferenciais podem aparecer automaticamente na sua página."
        options={differentialOptions}
        selected={profile.differentials}
        onToggle={value => toggleList('differentials', value)}
        onAdd={value => updateProfile('differentials', [...new Set([...profile.differentials, value])])}
        addLabel="+ Adicionar outro diferencial"
      />

      <PortfolioCollection draft={draft} setDraft={setDraft}/>
    </section>);
}
function ChoiceList(props: {
    title: string;
    description: string;
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
    onAdd: (value: string) => void;
    addLabel: string;
}) {
    const [addingCustom, setAddingCustom] = useState(false);
    const [customValue, setCustomValue] = useState('');
    function addCustom() {
        const value = customValue.trim();
        if (!value)
            return;
        props.onAdd(value);
        setCustomValue('');
        setAddingCustom(false);
    }
    const custom = props.selected.filter(item => !props.options.includes(item));
    return (<div className="section-card">
      <div className="section-card-header">
<div>
<h2>{props.title}</h2>
<p>{props.description}</p>
</div>
</div>
      <div className="selectable-chip-list">
        {[...props.options, ...custom].map(option => <button
          key={option}
          type="button"
          className={props.selected.includes(option) ? 'selectable-chip active' : 'selectable-chip'}
          onClick={() => props.onToggle(option)}
        >{props.selected.includes(option) ? '✓ ' : ''}{option}</button>)}
        {!addingCustom ? (
          <button
            type="button"
            className="selectable-chip add-chip"
            onClick={() => setAddingCustom(true)}
          >{props.addLabel}</button>
        ) : null}
      </div>
      {addingCustom ? (
        <div className="custom-choice-add">
          <input
            value={customValue}
            onChange={event => setCustomValue(event.target.value)}
            placeholder="Digite aqui"
            autoFocus
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCustom();
              }
              if (event.key === 'Escape') {
                setAddingCustom(false);
                setCustomValue('');
              }
            }}
          />
          <button type="button" onClick={addCustom} disabled={!customValue.trim()}>Adicionar</button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => { setAddingCustom(false); setCustomValue(''); }}
          >Cancelar</button>
        </div>
      ) : null}
    </div>);
}
function MediaCollection(props: {
    title: string;
    description: string;
    items: BusinessMediaItem[];
    categories: string[];
    onChange: (items: BusinessMediaItem[]) => void;
}) {
    function addItem() { props.onChange([...props.items, createMediaItem(props.categories[0])]); }
    function update(
      id: string,
      patch: Partial<BusinessMediaItem>
    ){ props.onChange(props.items.map(item => item.id === id ? { ...item, ...patch } : item)); }
    return (<div className="section-card">
      <div className="section-card-header">
<div>
<h2>{props.title}</h2>
<p>{props.description}</p>
</div>
<button type="button" className="secondary-button" onClick={addItem}>+ Adicionar foto</button>
</div>
      {props.items.length === 0
        ? <div className="empty-inline">Nenhuma foto adicionada. Isso é opcional.</div>
        : null}
      <div className="media-editor-list">
        {props.items.map(item => (<article className="media-editor-card" key={item.id}>
            {item.dataUrl
              ? <div className="media-preview-with-actions">
                  <img src={item.dataUrl} alt={item.title || 'Prévia'}/>
                  <label className="media-replace-button">
                    Trocar foto
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={event => void readSingleFile(event, dataUrl => update(item.id, { dataUrl }))}
                    />
                  </label>
                </div>
              : <label className="media-empty-preview">
                  + Escolher foto
                  <input
              hidden
              type="file"
              accept="image/*"
              onChange={event => void readSingleFile(event, dataUrl => update(item.id, { dataUrl }))}
            />
</label>}
            <div className="media-fields">
              <label>
                O que essa foto mostra?
                <select
                  value={item.category}
                  onChange={event => update(item.id, { category: event.target.value })}
                >
                  {props.categories.map(category => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>Título da foto<input
                value={item.title}
                onChange={event => update(item.id, { title: event.target.value })}
                placeholder="Ex.: Área principal da barbearia"
              />
</label>
              <label>Descrição (opcional)<input
                value={item.description}
                onChange={event => update(item.id, { description: event.target.value })}
              />
</label>
              <label className="inline-check">
<input
                type="checkbox"
                checked={item.publicVisible}
                onChange={event => update(item.id, { publicVisible: event.target.checked })}
              /> Mostrar na página pública</label>
              <button
                className="danger-link"
                type="button"
                onClick={() => props.onChange(props.items.filter(media => media.id !== item.id))}
              >Remover item</button>
            </div>
          </article>))}
      </div>
    </div>);
}
function PortfolioCollection({ draft, setDraft }: StepProps) {
    const items = draft.settings.profile.portfolioMedia;
    function change(itemsNext: BusinessMediaItem[]) {
        setDraft(current => ({
          ...current,
          settings: { ...current.settings, profile: { ...current.settings.profile, portfolioMedia: itemsNext } }
        }));
    }
    function update(
      id: string,
      patch: Partial<BusinessMediaItem>
    ){ change(items.map(item => item.id === id ? { ...item, ...patch } : item)); }
    return (<div className="section-card">
      <div className="section-card-header">
<div>
<h2>Quer mostrar alguns trabalhos?</h2>
<p>Adicione fotos ou vídeos que representem o seu trabalho. O serviço pode ser relacionado agora ou depois.</p>
</div>
<button
        type="button"
        className="secondary-button"
        onClick={() => change([...items, createMediaItem('Trabalho')])}
      >+ Adicionar foto ou vídeo</button>
</div>
      {items.length === 0 ? <div className="empty-inline">Você pode montar o portfólio depois.</div> : null}
      <div className="media-editor-list">
        {items.map(item => (<article className="media-editor-card" key={item.id}>
            {item.dataUrl ? (
              <div className="media-preview-with-actions">
                {item.mediaType === 'video'
                  ? <video src={item.dataUrl} controls/>
                  : <img src={item.dataUrl} alt={item.title || 'Trabalho'}/>}
                <label className="media-replace-button">
                  Trocar mídia
                  <input
                    hidden
                    type="file"
                    accept="image/*,video/*"
                    onChange={event => void readSingleFile(event, (dataUrl, file) => update(
                      item.id,
                      { dataUrl, mediaType: file.type.startsWith('video/') ? 'video' : 'image' }
                    ))}
                  />
                </label>
              </div>
            )
              : <label className="media-empty-preview">
                  + Escolher mídia
                  <input
              hidden
              type="file"
              accept="image/*,video/*"
              onChange={event => void readSingleFile(event, (dataUrl, file) => update(
                item.id,
                { dataUrl, mediaType: file.type.startsWith('video/') ? 'video' : 'image' }
              ))}
            />
</label>}
            <div className="media-fields">
              <label>Título<input
                value={item.title}
                onChange={event => update(item.id, { title: event.target.value })}
                placeholder="Ex.: Degradê navalhado"
              />
</label>
              <label>Serviço relacionado<select
                value={item.serviceId ?? ''}
                onChange={event => update(item.id, { serviceId: event.target.value || null })}
              >
<option value="">Relacionar depois</option>{draft.services.filter(service => service.active).map(
  service => <option value={service.id} key={service.id}>{service.name || 'Serviço sem nome'}</option>
)}</select>
</label>
              <label>Descrição (opcional)<input
                value={item.description}
                onChange={event => update(item.id, { description: event.target.value })}
              />
</label>
              <label className="inline-check">
<input
                type="checkbox"
                checked={item.publicVisible}
                onChange={event => update(item.id, { publicVisible: event.target.checked })}
              /> Mostrar na página pública</label>
              <button
                className="danger-link"
                type="button"
                onClick={() => change(items.filter(media => media.id !== item.id))}
              >Remover</button>
            </div>
          </article>))}
      </div>
    </div>);
}
async function readSingleFile(
  event: ChangeEvent<HTMLInputElement>,
  onRead: (dataUrl: string, file: File) => void
) {
    const file = event.target.files?.[0];
    if (!file)
        return;
    const maximumBytes = 4 * 1024 * 1024;
    if (file.size > maximumBytes) {
        event.target.setCustomValidity(
          'Esse arquivo passa de 4 MB. Escolha uma imagem ou vídeo menor para manter o onboarding rápido.'
        );
        event.target.reportValidity();
        window.setTimeout(() => event.target.setCustomValidity(''), 1200);
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      event.target.setCustomValidity('Não foi possível ler esse arquivo. Tente outro.');
      event.target.reportValidity();
      window.setTimeout(() => event.target.setCustomValidity(''), 1200);
    };
    reader.onload = () => {
      if (typeof reader.result === 'string')
        onRead(reader.result, file);
    };
    reader.readAsDataURL(file);
}
