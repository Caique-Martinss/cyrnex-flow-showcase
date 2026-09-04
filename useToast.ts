.public-customer-page {
  --pp-accent: #d6a34b;
  --pp-accent-soft: #b78235;
  --pp-bg: #090b0a;
  --pp-bg-soft: #0f1210;
  --pp-card: #121512;
  --pp-card-2: #171815;
  --pp-text: #f5f3ed;
  --pp-muted: #a9aaa4;
  --pp-line: rgba(214, 163, 75, 0.24);
  --pp-line-soft: rgba(255, 255, 255, 0.08);
  --pp-radius: 18px;
  --pp-shell: 1240px;
  background: var(--pp-bg);
  color: var(--pp-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  min-height: 100vh;
}

.public-customer-page *,
.public-customer-page *::before,
.public-customer-page *::after {
  box-sizing: border-box;
}

.public-customer-page button,
.public-customer-page input,
.public-customer-page textarea,
.public-customer-page select {
  font: inherit;
}

.public-customer-page button,
.public-customer-page a {
  -webkit-tap-highlight-color: transparent;
}

.public-customer-page button {
  cursor: pointer;
}

.pp-page {
  overflow: clip;
}

.pp-shell {
  width: min(calc(100% - 40px), var(--pp-shell));
  margin-inline: auto;
}

.pp-kicker,
.pp-menu-kicker {
  color: var(--pp-accent);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.pp-primary,
.pp-secondary,
.pp-nav-cta {
  align-items: center;
  border-radius: 10px;
  display: inline-flex;
  font-weight: 850;
  gap: 14px;
  justify-content: center;
  min-height: 44px;
  padding: 0 22px;
  text-decoration: none;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.pp-primary,
.pp-nav-cta {
  background: linear-gradient(135deg, #e0ad54, #c68d37);
  border: 1px solid rgba(255, 216, 141, 0.4);
  box-shadow: 0 10px 24px rgba(194, 132, 43, 0.18);
  color: #11120f;
}

.pp-primary:hover,
.pp-nav-cta:hover {
  box-shadow: 0 14px 32px rgba(214, 163, 75, 0.28);
  transform: translateY(-2px);
}

.pp-secondary {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--pp-text);
}

.pp-secondary:hover {
  border-color: rgba(214, 163, 75, 0.48);
  transform: translateY(-2px);
}

.pp-glow {
  position: relative;
  isolation: isolate;
}

.pp-glow::before {
  background: linear-gradient(135deg, rgba(255, 207, 114, 0.9), rgba(214, 163, 75, 0.08) 36%, rgba(255, 228, 171, 0.52));
  border-radius: inherit;
  content: "";
  inset: -1px;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  transition: opacity 220ms ease;
  z-index: -2;
}

.pp-glow::after {
  background: radial-gradient(circle at 12% 4%, rgba(255, 197, 91, 0.2), transparent 28%);
  border-radius: inherit;
  box-shadow: 0 0 0 1px rgba(214, 163, 75, 0), 0 0 0 rgba(214, 163, 75, 0);
  content: "";
  inset: 0;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  transition: opacity 220ms ease, box-shadow 220ms ease;
  z-index: -1;
}

.pp-glow:hover::before,
.pp-glow:has(:focus-visible)::before,
.pp-glow.is-focused::before {
  opacity: 1;
}

.pp-glow:hover::after,
.pp-glow:has(:focus-visible)::after,
.pp-glow.is-focused::after {
  box-shadow: 0 0 0 1px rgba(240, 181, 75, 0.65), 0 0 32px rgba(214, 163, 75, 0.19);
  opacity: 1;
}


/* STAFF VIEW — somente membros autenticados da própria empresa */
.pp-staff-toolbar {
  background: #0c0f0d;
  border-bottom: 1px solid rgba(214, 163, 75, 0.2);
  color: var(--pp-text);
  position: relative;
  z-index: 90;
}

.pp-staff-toolbar-inner {
  align-items: center;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  min-height: 58px;
  padding-block: 9px;
}

.pp-staff-toolbar-copy,
.pp-staff-toolbar-actions {
  align-items: center;
  display: flex;
}

.pp-staff-toolbar-copy {
  gap: 10px;
  min-width: 0;
}

.pp-staff-toolbar-copy > div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.pp-staff-toolbar-copy strong {
  font-size: 12px;
  letter-spacing: -0.01em;
}

.pp-staff-toolbar-copy small {
  color: var(--pp-muted);
  font-size: 10px;
}

.pp-staff-dot {
  background: var(--pp-accent);
  border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(214, 163, 75, 0.1);
  flex: 0 0 auto;
  height: 7px;
  width: 7px;
}

.pp-staff-toolbar-actions {
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.pp-staff-toolbar-actions button {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #e9e8e3;
  font-size: 10px;
  font-weight: 850;
  min-height: 34px;
  padding: 0 13px;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.pp-staff-toolbar-actions button:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(214, 163, 75, 0.38);
  transform: translateY(-1px);
}

.pp-staff-toolbar-actions button:disabled {
  cursor: wait;
  opacity: 0.58;
  transform: none;
}

.pp-staff-toolbar-actions .is-primary {
  background: linear-gradient(135deg, #dca94f, #bd8130);
  border-color: rgba(255, 218, 153, 0.26);
  color: #11120f;
}

/* NAV */
.pp-nav {
  background: rgba(8, 10, 9, 0.92);
  border-bottom: 1px solid rgba(214, 163, 75, 0.12);
  backdrop-filter: blur(18px);
  position: sticky;
  top: 0;
  z-index: 70;
}

.pp-nav-inner {
  align-items: center;
  display: flex;
  height: 72px;
  justify-content: space-between;
}

.pp-brand {
  align-items: center;
  color: var(--pp-text);
  display: flex;
  gap: 10px;
  text-decoration: none;
}

.pp-brand-mark {
  background: linear-gradient(145deg, #dfac54, #b7792d);
  border: 1px solid rgba(255, 218, 153, 0.3);
  border-radius: 13px;
  color: #11130f;
  display: grid;
  font-size: 16px;
  font-weight: 950;
  height: 42px;
  place-items: center;
  width: 42px;
}

.pp-brand > span:last-child {
  display: grid;
}

.pp-brand strong {
  font-size: 15px;
  letter-spacing: -0.02em;
}

.pp-brand small {
  color: #b9bab5;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pp-nav-links {
  align-items: center;
  display: flex;
  gap: 30px;
}

.pp-nav-links > .pp-context > a,
.pp-nav-links > a {
  color: #d8d8d4;
  font-size: 13px;
  font-weight: 750;
  padding-block: 27px;
  text-decoration: none;
}

.pp-context {
  position: relative;
}

.pp-context > a {
  position: relative;
}

.pp-context > a::after {
  background: var(--pp-accent);
  bottom: 20px;
  content: "";
  height: 2px;
  left: 0;
  position: absolute;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 180ms ease;
  width: 100%;
}

.pp-context:hover > a::after,
.pp-context:focus-within > a::after {
  transform: scaleX(1);
}

.pp-context-panel {
  background: rgba(13, 16, 14, 0.98);
  border: 1px solid rgba(214, 163, 75, 0.22);
  border-radius: 14px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48), 0 0 30px rgba(214, 163, 75, 0.06);
  display: grid;
  gap: 4px;
  left: 50%;
  min-width: 310px;
  opacity: 0;
  padding: 12px;
  pointer-events: none;
  position: absolute;
  top: calc(100% - 4px);
  transform: translate(-50%, 10px);
  transition: opacity 180ms ease, transform 180ms ease;
}

.pp-context:hover .pp-context-panel,
.pp-context:focus-within .pp-context-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, 0);
}

.pp-context-panel button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 10px;
  color: var(--pp-text);
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 10px;
  text-align: left;
  width: 100%;
}

.pp-context-panel button:hover {
  background: linear-gradient(90deg, rgba(214, 163, 75, 0.12), rgba(214, 163, 75, 0.02));
}

.pp-context-panel button > span {
  display: grid;
  gap: 2px;
}

.pp-context-panel button strong {
  font-size: 12px;
}

.pp-context-panel button small {
  color: #8e918c;
  font-size: 10px;
  font-weight: 500;
}

.pp-context-panel button > b {
  background: rgba(214, 163, 75, 0.14);
  border: 1px solid rgba(214, 163, 75, 0.22);
  border-radius: 8px;
  color: var(--pp-accent);
  display: grid;
  font-size: 9px;
  font-style: normal;
  height: 28px;
  place-items: center;
  width: 28px;
}

.pp-context-panel button > i {
  color: var(--pp-accent);
  font-style: normal;
}

.pp-menu-all {
  align-items: center;
  border-top: 1px solid var(--pp-line-soft);
  color: var(--pp-accent);
  display: flex;
  font-size: 11px;
  font-weight: 800;
  justify-content: space-between;
  margin-top: 5px;
  padding: 12px 10px 4px;
  text-decoration: none;
}

.pp-menu-empty {
  color: #92948f;
  font-size: 11px;
  margin: 8px 10px;
}

.pp-mobile-toggle,
.pp-mobile-menu {
  display: none;
}

.pp-nav-cta {
  border-radius: 9px;
  min-height: 40px;
  padding-inline: 20px;
}

/* HERO */
.pp-hero {
  background:
    radial-gradient(circle at 86% 28%, rgba(132, 88, 35, 0.22), transparent 34%),
    linear-gradient(135deg, #070908, #0c100d 58%, #15110c);
  border-bottom: 1px solid rgba(214, 163, 75, 0.15);
  min-height: 540px;
  overflow: hidden;
  position: relative;
}

.pp-hero::after {
  background: radial-gradient(circle, rgba(214, 163, 75, 0.14), transparent 64%);
  border-radius: 50%;
  content: "";
  height: 540px;
  position: absolute;
  right: -120px;
  top: -72px;
  width: 540px;
}

.pp-hero-grid {
  align-items: center;
  display: grid;
  gap: 54px;
  grid-template-columns: minmax(0, 0.82fr) minmax(520px, 1.18fr);
  min-height: 540px;
  padding-block: 48px;
  position: relative;
  z-index: 2;
}

.pp-hero-copy {
  max-width: 520px;
}

.pp-open {
  align-items: center;
  color: var(--pp-accent);
  display: inline-flex;
  font-size: 10px;
  font-weight: 900;
  gap: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pp-open i {
  background: #45b875;
  border-radius: 50%;
  box-shadow: 0 0 0 5px rgba(69, 184, 117, 0.12);
  height: 7px;
  width: 7px;
}

.pp-hero h1 {
  font-size: clamp(54px, 5.6vw, 78px);
  letter-spacing: -0.065em;
  line-height: 0.92;
  margin: 18px 0 18px;
}

.pp-hero-lead {
  color: #f0efe9;
  font-size: 18px;
  line-height: 1.4;
  margin: 0 0 8px;
}

.pp-hero-about {
  color: #a9aaa6;
  font-size: 14px;
  line-height: 1.55;
  margin: 0;
  max-width: 440px;
}

.pp-actions {
  display: flex;
  gap: 12px;
  margin-top: 25px;
}

.pp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 26px;
}

.pp-meta span {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #a8aaa5;
  font-size: 9px;
  padding: 7px 10px;
}

.pp-hero-collage {
  height: 410px;
  perspective: 1100px;
  position: relative;
}

.pp-float-card {
  background: #151714;
  border: 1px solid rgba(214, 163, 75, 0.33);
  border-radius: 17px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.4);
  margin: 0;
  overflow: hidden;
  position: absolute;
  transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 280ms ease, filter 280ms ease;
}

.pp-float-card::after {
  background: linear-gradient(180deg, transparent 50%, rgba(0, 0, 0, 0.78));
  content: "";
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.pp-float-card img,
.pp-float-card video,
.pp-art {
  height: 100%;
  inset: 0;
  object-fit: cover;
  position: absolute;
  width: 100%;
}

.pp-float-1 {
  height: 330px;
  right: 0;
  top: 18px;
  transform: rotateY(-4deg) rotateZ(0.7deg);
  width: 55%;
  z-index: 1;
}

.pp-float-2 {
  height: 190px;
  left: 3%;
  top: 35px;
  transform: rotateZ(-3deg);
  width: 38%;
  z-index: 3;
}

.pp-float-3 {
  bottom: 8px;
  height: 190px;
  left: 8%;
  transform: rotateZ(2.3deg);
  width: 43%;
  z-index: 4;
}

.pp-float-card:hover,
.pp-float-card:focus {
  box-shadow: 0 34px 90px rgba(0, 0, 0, 0.5), 0 0 34px rgba(214, 163, 75, 0.24);
  filter: saturate(1.08) brightness(1.05);
  outline: none;
  transform: translate3d(0, -10px, 44px) rotateZ(0deg) scale(1.035);
  z-index: 10;
}

.pp-float-card figcaption {
  bottom: 15px;
  display: grid;
  gap: 3px;
  left: 16px;
  position: absolute;
  right: 16px;
  z-index: 3;
}

.pp-float-card figcaption strong {
  font-size: 12px;
}

.pp-float-card figcaption small {
  color: #b0b1ad;
  font-size: 9px;
}

.pp-play {
  background: #e3b158;
  border-radius: 50%;
  color: #161511;
  display: grid;
  height: 38px;
  left: 50%;
  place-items: center;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 38px;
  z-index: 4;
}

.pp-art-1 {
  background: linear-gradient(135deg, #171613 0 32%, #a9783f 33% 46%, #171816 47% 100%);
}

.pp-art-2 {
  background: repeating-linear-gradient(90deg, #28221c 0 17%, #121512 17% 34%);
}

.pp-art-3 {
  background: linear-gradient(155deg, #0b2118 0 42%, #715c3e 43% 67%, #15130f 68%);
}

/* SECTION BASICS */
.pp-section {
  border-bottom: 1px solid rgba(214, 163, 75, 0.13);
  padding: 42px 0;
  scroll-margin-top: 82px;
}

.pp-section-head {
  align-items: end;
  display: flex;
  justify-content: space-between;
  margin-bottom: 22px;
}

.pp-section-head h2,
.pp-team-heading h2,
.pp-differential-layout header h2,
.pp-info-layout header h2,
.pp-about h2 {
  font-size: clamp(26px, 3.2vw, 38px);
  letter-spacing: -0.045em;
  line-height: 1.03;
  margin: 6px 0 0;
}

.pp-section-head > p,
.pp-team-heading > div > p,
.pp-differential-layout header p,
.pp-info-layout header p {
  color: var(--pp-muted);
  font-size: 12px;
  line-height: 1.55;
  margin: 6px 0 0;
  max-width: 460px;
}

/* SERVICES */
.pp-services {
  background: #0b0d0c;
}

.pp-service-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pp-service-card {
  background: #111310;
  border: 1px solid rgba(214, 163, 75, 0.24);
  border-radius: 16px;
  min-height: 330px;
  overflow: hidden;
  position: relative;
  transition: transform 200ms ease;
}

.pp-service-card:hover,
.pp-service-card.is-focused {
  transform: translateY(-4px);
}

.pp-service-image {
  height: 155px;
  object-fit: cover;
  width: 100%;
}

.pp-service-art.art-1 {
  background: radial-gradient(circle at 65% 46%, #c39260 0 7%, transparent 8%), linear-gradient(145deg, #171412, #3a291d 42%, #0e100f 43%);
}

.pp-service-art.art-2 {
  background: radial-gradient(circle at 50% 44%, #9b6a49 0 9%, transparent 10%), linear-gradient(160deg, #221d18, #0f1110 55%, #3d2b1e);
}

.pp-service-art.art-3 {
  background: radial-gradient(circle at 40% 48%, #c08b5a 0 8%, transparent 9%), linear-gradient(125deg, #10120f, #463022 54%, #0d0e0d);
}

.pp-service-content {
  display: grid;
  gap: 5px;
  padding: 15px;
}

.pp-card-badge {
  color: var(--pp-accent);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pp-service-content h3 {
  font-size: 18px;
  letter-spacing: -0.025em;
  margin: 3px 0 0;
}

.pp-service-content small,
.pp-service-content p {
  color: #aaa;
  font-size: 10px;
}

.pp-service-content p {
  line-height: 1.5;
  margin: 0;
  min-height: 30px;
}

.pp-service-content > strong {
  color: #f0dfc0;
  font-size: 14px;
  margin-top: 4px;
}

.pp-service-content button {
  background: linear-gradient(135deg, #dfaa50, #bf8432);
  border: 0;
  border-radius: 8px;
  color: #11130f;
  display: flex;
  font-size: 11px;
  font-weight: 850;
  justify-content: space-between;
  margin-top: 6px;
  padding: 11px 13px;
}

/* TEAM */
.pp-team {
  background: #0e100e;
}

.pp-team-heading {
  align-items: end;
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
}

.pp-any-pro {
  align-items: center;
  background: #151713;
  border: 1px solid rgba(214, 163, 75, 0.28);
  border-radius: 12px;
  color: var(--pp-text);
  display: flex;
  gap: 12px;
  min-width: 330px;
  padding: 11px 14px;
  text-align: left;
}

.pp-any-pro > i {
  color: var(--pp-accent);
  font-size: 22px;
  font-style: normal;
}

.pp-any-pro > span {
  display: grid;
  flex: 1;
}

.pp-any-pro strong {
  color: var(--pp-accent);
  font-size: 11px;
}

.pp-any-pro small {
  color: #8d8f8a;
  font-size: 9px;
}

.pp-any-pro b {
  font-size: 18px;
}

.pp-team-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pp-pro-card {
  align-items: stretch;
  background: #141613;
  border: 1px solid rgba(214, 163, 75, 0.2);
  border-radius: 14px;
  display: grid;
  grid-template-columns: 116px 1fr;
  min-height: 150px;
  overflow: hidden;
  transition: transform 200ms ease;
}

.pp-pro-card:hover,
.pp-pro-card.is-focused {
  transform: translateY(-3px);
}

.pp-pro-photo {
  align-items: end;
  display: flex;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.pp-pro-photo::before {
  border-radius: 50% 50% 38% 38%;
  bottom: -18px;
  content: "";
  height: 125px;
  position: absolute;
  width: 88px;
}

.pp-pro-photo.photo-1 {
  background: radial-gradient(circle at 58% 18%, #765031, transparent 35%), linear-gradient(150deg, #1c1c18, #35291f);
}

.pp-pro-photo.photo-2 {
  background: radial-gradient(circle at 48% 18%, #70503b, transparent 35%), linear-gradient(145deg, #1b1d19, #2e241c);
}

.pp-pro-photo.photo-3 {
  background: radial-gradient(circle at 52% 18%, #6c4b36, transparent 35%), linear-gradient(145deg, #171915, #33271e);
}

.pp-pro-photo::before {
  background: linear-gradient(180deg, #181817, #050605);
}

.pp-pro-photo span {
  color: #d2a158;
  font-size: 18px;
  font-weight: 900;
  position: relative;
  z-index: 2;
}

.pp-pro-copy {
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.pp-pro-copy h3 {
  font-size: 16px;
  margin: 0;
}

.pp-pro-copy p {
  color: #9d9f9a;
  font-size: 10px;
  margin: 2px 0 0;
}

.pp-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}

.pp-chip-row span {
  background: #1d1f1c;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  color: #c5c6c1;
  font-size: 8px;
  padding: 4px 7px;
}

.pp-pro-copy button {
  background: transparent;
  border: 0;
  border-top: 1px solid rgba(214, 163, 75, 0.15);
  color: #c9a564;
  display: flex;
  font-size: 9px;
  font-weight: 800;
  justify-content: space-between;
  margin-top: auto;
  padding: 8px 0 0;
}

/* DIFFERENTIALS */
.pp-differentials {
  background: #0c0e0c;
}

.pp-differential-layout,
.pp-info-layout {
  align-items: start;
  display: grid;
  gap: 28px;
  grid-template-columns: 230px 1fr;
}

.pp-differential-layout header h2,
.pp-info-layout header h2 {
  font-size: 31px;
}

.pp-differential-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.pp-diff-card {
  background: #131512;
  border: 1px solid rgba(214, 163, 75, 0.24);
  border-radius: 13px;
  min-height: 174px;
  padding: 14px;
}

.pp-diff-card > div {
  align-items: center;
  display: flex;
  gap: 9px;
}

.pp-diff-card > div i {
  border: 1px solid rgba(214, 163, 75, 0.5);
  border-radius: 50%;
  color: var(--pp-accent);
  display: grid;
  font-style: normal;
  height: 35px;
  place-items: center;
  width: 35px;
}

.pp-diff-card > div span {
  color: #898b86;
  font-size: 8px;
}

.pp-diff-card h3 {
  color: var(--pp-accent);
  font-size: 13px;
  line-height: 1.15;
  margin: 12px 0 5px;
}

.pp-diff-card p {
  color: #a1a29e;
  font-size: 9px;
  line-height: 1.45;
  margin: 0;
  min-height: 52px;
}

.pp-diff-card footer {
  align-items: end;
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.pp-diff-card footer small {
  color: #747672;
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
}

.pp-diff-card footer strong {
  color: var(--pp-accent);
  font-size: 13px;
}

/* INFORMATION */
.pp-information {
  background: #10120f;
}

.pp-info-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 0.92fr 1.25fr 0.92fr;
}

.pp-info-card {
  background: #141613;
  border: 1px solid rgba(214, 163, 75, 0.22);
  border-radius: 13px;
  min-height: 205px;
  padding: 14px;
}

.pp-info-card > i {
  color: var(--pp-accent);
  font-size: 18px;
  font-style: normal;
}

.pp-info-card h3 {
  font-size: 13px;
  margin: 5px 0 4px;
}

.pp-info-card > p {
  color: #9b9d98;
  font-size: 9px;
  line-height: 1.45;
  margin: 0 0 9px;
}

.pp-hours {
  display: grid;
  gap: 3px;
}

.pp-hours > div {
  display: flex;
  font-size: 8px;
  justify-content: space-between;
}

.pp-hours span {
  color: #a1a39e;
}

.pp-map-card iframe,
.pp-map-fallback {
  border: 0;
  border-radius: 8px;
  height: 105px;
  overflow: hidden;
  width: 100%;
}

.pp-map-fallback {
  background: linear-gradient(145deg, #1b211d, #26221a);
  color: var(--pp-accent);
  display: grid;
  place-items: center;
}

.pp-map-card > a,
.pp-contact > a {
  align-items: center;
  background: rgba(214, 163, 75, 0.09);
  border: 1px solid rgba(214, 163, 75, 0.23);
  border-radius: 7px;
  color: var(--pp-accent);
  display: flex;
  font-size: 9px;
  font-weight: 800;
  justify-content: space-between;
  margin-top: 8px;
  padding: 8px 10px;
  text-decoration: none;
}

.pp-contact {
  display: grid;
  gap: 7px;
  margin-top: 20px;
}

.pp-contact > a {
  background: linear-gradient(135deg, #d9a54c, #bc8130);
  color: #11130f;
  justify-content: center;
}

.pp-contact span {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  color: #aaa;
  font-size: 8px;
  padding: 7px;
  text-align: center;
}

/* PORTFOLIO + ABOUT */
.pp-portfolio,
.pp-about {
  background: #0b0d0b;
}

.pp-media-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1.5fr 1fr 1fr;
  grid-template-rows: 160px 120px;
}

.pp-media-card {
  background: #131512;
  border: 1px solid rgba(214, 163, 75, 0.2);
  border-radius: 13px;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.pp-media-card:first-child {
  grid-row: 1 / span 2;
}

.pp-media-card img,
.pp-media-card video {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.pp-media-card::after {
  background: linear-gradient(180deg, transparent 45%, rgba(0, 0, 0, 0.82));
  content: "";
  inset: 0;
  position: absolute;
}

.pp-media-card > span {
  bottom: 11px;
  display: grid;
  left: 12px;
  position: absolute;
  z-index: 2;
}

.pp-media-card strong {
  color: #fff;
  font-size: 11px;
}

.pp-media-card small {
  color: #aaa;
  font-size: 8px;
}

.pp-about-grid {
  align-items: start;
  display: grid;
  gap: 30px;
  grid-template-columns: 0.7fr 1.3fr;
}

.pp-about article {
  background: #141613;
  border: 1px solid rgba(214, 163, 75, 0.2);
  border-radius: 14px;
  padding: 20px;
}

.pp-about article p {
  color: #acada8;
  line-height: 1.6;
}

.pp-about article button {
  background: transparent;
  border: 1px solid rgba(214, 163, 75, 0.35);
  border-radius: 8px;
  color: var(--pp-accent);
  font-weight: 800;
  padding: 10px 14px;
}

/* CTA */
.pp-cta {
  background: #0a0c0a;
  padding: 38px 0 46px;
}

.pp-cta-grid {
  background: linear-gradient(105deg, #131512 0%, #2e2113 56%, #16110c 100%);
  border: 1px solid rgba(214, 163, 75, 0.45);
  border-radius: 18px;
  display: grid;
  grid-template-columns: 1.05fr 0.9fr 210px;
  min-height: 205px;
  overflow: hidden;
  position: relative;
}

.pp-cta-grid::before {
  background: radial-gradient(circle at 66% 50%, rgba(214, 163, 75, 0.18), transparent 42%);
  content: "";
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.pp-cta-copy {
  align-self: center;
  padding: 24px 28px;
  position: relative;
  z-index: 2;
}

.pp-cta-copy h2 {
  font-size: clamp(26px, 3vw, 38px);
  letter-spacing: -0.045em;
  line-height: 1.02;
  margin: 6px 0 8px;
}

.pp-cta-copy p {
  color: #b1b2ad;
  font-size: 10px;
  line-height: 1.5;
  margin: 0 0 14px;
  max-width: 430px;
}

.pp-cta-copy .pp-primary {
  min-height: 38px;
  padding-inline: 16px;
}

.pp-live-card {
  align-self: center;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(214, 163, 75, 0.2);
  border-radius: 12px;
  display: grid;
  gap: 7px;
  margin: 18px 0;
  padding: 14px;
  position: relative;
  z-index: 2;
}

.pp-live-card > strong {
  font-size: 10px;
}

.pp-live-card > strong i {
  background: #4cb875;
  border-radius: 50%;
  display: inline-block;
  height: 7px;
  margin-right: 5px;
  width: 7px;
}

.pp-live-card > small {
  color: #8f918c;
  font-size: 8px;
}

.pp-slot-row {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, 1fr);
}

.pp-slot-row span {
  border: 1px solid rgba(214, 163, 75, 0.28);
  border-radius: 7px;
  display: grid;
  font-size: 10px;
  font-weight: 800;
  padding: 7px;
  text-align: center;
}

.pp-slot-row b {
  color: #55b779;
  font-size: 6px;
  font-weight: 700;
}

.pp-live-card button {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(214, 163, 75, 0.16);
  border-radius: 7px;
  color: #d8c49e;
  display: flex;
  font-size: 8px;
  justify-content: space-between;
  padding: 8px 10px;
}

.pp-tools-visual {
  background-image: linear-gradient(90deg, rgba(14, 11, 8, 0.2), transparent 35%), url('/public-page-assets/cta-tools.jpg');
  background-position: center;
  background-size: cover;
  min-height: 100%;
}

/* BOOKING PANEL */
.pp-booking-panel {
  align-items: center;
  background: rgba(2, 4, 3, 0.82);
  display: none;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 180;
  backdrop-filter: blur(14px);
}

.pp-booking-panel.is-open {
  display: flex;
}

.pp-booking-backdrop {
  background: transparent;
  border: 0;
  inset: 0;
  position: absolute;
  width: 100%;
}

.pp-booking-shell {
  --surface: #121512;
  --surface-soft: #0d100e;
  --text: #f7f4ed;
  --muted: #9d9f99;
  --border: rgba(214, 163, 75, 0.2);
  --primary: #d8a44b;
  --primary-strong: #f0bd65;
  --primary-soft: rgba(214, 163, 75, 0.12);
  --success: #55b779;
  background:
    radial-gradient(circle at 82% 10%, rgba(214, 163, 75, 0.12), transparent 28%),
    linear-gradient(145deg, #0a0d0b, #11140f 58%, #0a0c0a);
  border: 1px solid rgba(214, 163, 75, 0.28);
  border-radius: 22px;
  box-shadow: 0 34px 110px rgba(0, 0, 0, 0.72), 0 0 52px rgba(214, 163, 75, 0.08);
  color: var(--text);
  max-height: calc(100dvh - 36px);
  max-width: 1120px;
  overflow: auto;
  position: relative;
  width: min(1120px, calc(100vw - 36px));
  z-index: 1;
}

.pp-booking-header {
  align-items: center;
  backdrop-filter: blur(18px);
  background: rgba(8, 11, 9, 0.92);
  border-bottom: 1px solid rgba(214, 163, 75, 0.16);
  display: flex;
  justify-content: space-between;
  padding: 16px 20px;
  position: sticky;
  top: 0;
  z-index: 5;
}

.pp-booking-brand {
  align-items: center;
  display: flex;
  gap: 11px;
}

.pp-booking-brand > div {
  display: grid;
  gap: 1px;
}

.pp-booking-brand small {
  color: #8f928c;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pp-booking-brand strong {
  color: #f2f1ec;
  font-size: 13px;
}

.pp-booking-close {
  align-items: center;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(214, 163, 75, 0.18);
  border-radius: 50%;
  color: #d9dad5;
  display: flex;
  height: 36px;
  justify-content: center;
  transition: 0.2s ease;
  width: 36px;
}

.pp-booking-close:hover {
  background: rgba(214, 163, 75, 0.1);
  border-color: rgba(232, 178, 83, 0.58);
  color: #f4c776;
  transform: rotate(4deg);
}

.public-booking-card {
  background: transparent;
  padding: 20px;
}

@media (max-width: 720px) {
  .pp-booking-panel {
    align-items: stretch;
    padding: 0;
  }

  .pp-booking-shell {
    border: 0;
    border-radius: 0;
    max-height: 100dvh;
    min-height: 100dvh;
    width: 100%;
  }

  .pp-booking-header {
    padding: 13px 14px;
  }

  .public-booking-card {
    padding: 15px 13px 22px;
  }
}

/* MODAL */
.pp-modal {
  inset: 0;
  position: fixed;
  z-index: 100;
}

.pp-modal-backdrop {
  background: rgba(0, 0, 0, 0.78);
  border: 0;
  inset: 0;
  position: absolute;
  width: 100%;
}

.pp-modal > div {
  background: #111;
  border: 1px solid rgba(214, 163, 75, 0.35);
  border-radius: 15px;
  left: 50%;
  max-height: 82vh;
  max-width: min(860px, 90vw);
  overflow: hidden;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.pp-modal img,
.pp-modal video {
  display: block;
  max-height: 82vh;
  max-width: 100%;
}

.pp-modal > div > button {
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  color: white;
  height: 38px;
  position: absolute;
  right: 12px;
  top: 12px;
  width: 38px;
}

/* TABLET */
@media (max-width: 1040px) {
  .pp-nav-links {
    gap: 20px;
  }

  .pp-hero-grid {
    gap: 28px;
    grid-template-columns: minmax(0, 0.88fr) minmax(430px, 1.12fr);
  }

  .pp-hero-collage {
    height: 370px;
  }

  .pp-differential-layout,
  .pp-info-layout {
    grid-template-columns: 1fr;
  }

  .pp-differential-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .pp-cta-grid {
    grid-template-columns: 1fr 0.9fr 170px;
  }
}

@media (max-width: 820px) {
  .pp-nav-links {
    display: none;
  }

  .pp-mobile-toggle {
    background: #151714;
    border: 1px solid rgba(214, 163, 75, 0.28);
    border-radius: 50%;
    display: grid;
    gap: 3px;
    height: 40px;
    padding: 10px;
    place-content: center;
    width: 40px;
  }

  .pp-mobile-toggle i {
    background: #d8d9d4;
    display: block;
    height: 1px;
    width: 16px;
  }

  .pp-mobile-menu {
    background: rgba(12, 14, 12, 0.98);
    border-top: 1px solid rgba(214, 163, 75, 0.16);
    display: grid;
    gap: 3px;
    padding: 10px 20px 16px;
  }

  .pp-mobile-menu a,
  .pp-mobile-menu button {
    background: transparent;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #e1e1dc;
    font-weight: 750;
    padding: 13px 5px;
    text-align: left;
    text-decoration: none;
  }

  .pp-mobile-menu button {
    color: var(--pp-accent);
  }

  .pp-hero-grid {
    gap: 22px;
    grid-template-columns: 1fr;
    padding-block: 34px 42px;
  }

  .pp-hero {
    min-height: auto;
  }

  .pp-hero-copy {
    max-width: 620px;
  }

  .pp-hero-collage {
    height: 430px;
  }

  .pp-service-grid,
  .pp-team-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .pp-team-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }

  .pp-any-pro {
    min-width: 0;
    width: 100%;
  }

  .pp-differential-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .pp-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .pp-info-grid > article:last-child {
    grid-column: 1 / -1;
  }

  .pp-cta-grid {
    grid-template-columns: 1fr 1fr;
  }

  .pp-tools-visual {
    grid-column: 1 / -1;
    height: 170px;
  }
}

/* MOBILE */
@media (max-width: 580px) {
  .pp-shell {
    width: min(calc(100% - 24px), var(--pp-shell));
  }

  .pp-nav-inner {
    height: 64px;
  }

  .pp-brand-mark {
    border-radius: 11px;
    height: 36px;
    width: 36px;
  }

  .pp-brand strong {
    font-size: 13px;
  }

  .pp-brand small {
    font-size: 7px;
  }

  .pp-hero-grid {
    padding-top: 28px;
  }

  .pp-hero h1 {
    font-size: clamp(48px, 16vw, 70px);
  }

  .pp-hero-lead {
    font-size: 15px;
  }

  .pp-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .pp-primary,
  .pp-secondary {
    width: 100%;
  }

  .pp-meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pp-meta span:last-child:nth-child(3) {
    grid-column: 1 / -1;
  }

  .pp-hero-collage {
    height: 390px;
  }

  .pp-float-1 {
    height: 250px;
    right: 0;
    top: 10px;
    width: 66%;
  }

  .pp-float-2 {
    height: 145px;
    left: 0;
    top: 52px;
    width: 46%;
  }

  .pp-float-3 {
    bottom: 0;
    height: 150px;
    left: 5%;
    width: 54%;
  }

  .pp-float-card:hover,
  .pp-float-card:focus {
    transform: translateY(-5px) scale(1.02);
  }

  .pp-section {
    padding: 32px 0;
  }

  .pp-section-head,
  .pp-team-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }

  .pp-service-grid,
  .pp-team-grid,
  .pp-info-grid,
  .pp-differential-grid {
    grid-template-columns: 1fr;
  }

  .pp-service-card {
    min-height: 0;
  }

  .pp-service-image {
    height: 210px;
  }

  .pp-pro-card {
    grid-template-columns: 108px 1fr;
  }

  .pp-info-grid > article:last-child {
    grid-column: auto;
  }

  .pp-media-grid {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 5px;
    scroll-snap-type: x mandatory;
  }

  .pp-media-card {
    flex: 0 0 82%;
    height: 230px;
    scroll-snap-align: start;
  }

  .pp-about-grid {
    grid-template-columns: 1fr;
  }

  .pp-cta {
    padding: 28px 0 34px;
  }

  .pp-cta-grid {
    grid-template-columns: 1fr;
  }

  .pp-cta-copy {
    padding: 22px 18px 10px;
  }

  .pp-live-card {
    margin: 10px 18px 18px;
  }

  .pp-tools-visual {
    grid-column: auto;
    height: 180px;
  }

  .pp-booking-shell {
    border-radius: 14px;
    padding: 14px;
  }
}


@media (max-width: 720px) {
  .pp-staff-toolbar-inner {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
    padding-block: 10px;
  }

  .pp-staff-toolbar-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  .pp-staff-toolbar-actions button {
    min-height: 38px;
  }

  .pp-staff-toolbar-actions .is-primary {
    grid-column: span 2;
    grid-row: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pp-float-card,
  .pp-glow::before,
  .pp-glow::after,
  .pp-primary,
  .pp-secondary,
  .pp-context-panel {
    transition: none;
  }

  .public-customer-page {
    scroll-behavior: auto;
  }
}
