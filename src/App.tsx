import { useMemo, useState } from 'react';
import { DemoTag, EmptyState, Field, Landing, NotFound, Notice, PageHead, Shell, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
import { contrastRatio, evaluate, formatRatio, parseColor, suggestForeground, summary, toHex } from './lib/contrast';

export interface SavedPair {
  id: string;
  name: string;
  fg: string;
  bg: string;
  demo?: boolean;
}

const DEMO_PAIRS: SavedPair[] = [
  { id: 'demo-1', name: 'Demo: muted caption', fg: '#8a8f98', bg: '#ffffff', demo: true },
  { id: 'demo-2', name: 'Demo: brand button', fg: '#ffffff', bg: '#5034d9', demo: true },
  { id: 'demo-3', name: 'Demo: warning banner', fg: '#7a4b00', bg: '#fff4d6', demo: true },
  { id: 'demo-4', name: 'Demo: dark-mode body text on a very long card title that wraps', fg: '#d6d0c4', bg: '#1a1814', demo: true },
  { id: 'demo-5', name: 'Demo: placeholder text', fg: '#b8b8b8', bg: '#ffffff', demo: true },
  { id: 'demo-6', name: 'Demo: identical colours (1:1)', fg: '#336699', bg: '#336699', demo: true },
];

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/check', label: 'Checker' },
  { to: '/saved', label: 'Saved pairs' },
];

export default function App() {
  const [route] = useRoute();
  const [pairs, setPairs] = usePersistentState<SavedPair[]>('contrast-lab:pairs', DEMO_PAIRS);
  const [fg, setFg] = usePersistentState('contrast-lab:fg', '#8a8f98');
  const [bg, setBg] = usePersistentState('contrast-lab:bg', '#ffffff');

  let page;
  if (route === '/') page = <Home />;
  else if (route === '/check') page = <Checker fg={fg} bg={bg} setFg={setFg} setBg={setBg} pairs={pairs} setPairs={setPairs} />;
  else if (route === '/saved')
    page = (
      <Saved
        pairs={pairs}
        setPairs={setPairs}
        onOpen={(p) => {
          setFg(p.fg);
          setBg(p.bg);
          window.location.hash = '/check';
        }}
      />
    );
  else page = <NotFound />;

  return (
    <Shell name="Contrast Lab" wordmark={['Contrast', 'Lab']} nav={NAV} route={route} cta={{ to: '/check', label: 'Open checker' }}>
      {page}
    </Shell>
  );
}

function HeroChecker() {
  const [fg, setFg] = useState('#8a8f98');
  const [bg, setBg] = useState('#fffdf8');
  const f = parseColor(fg)!, b = parseColor(bg)!;
  const ratio = contrastRatio(f, b);
  const res = evaluate(ratio);
  const v = summary(ratio);
  const presets: [string, string, string][] = [
    ['Muted grey', '#8a8f98', '#fffdf8'],
    ['Ink on paper', '#17140f', '#f5f1e8'],
    ['White on violet', '#ffffff', '#5034d9'],
    ['Gold on black', '#c9a86a', '#0b0a09'],
  ];
  return (
    <div className="hero-checker">
      <div className="hc-sample" style={{ color: fg, background: bg }}>
        <span className="hc-big">Aa</span>
        <div>
          <strong>Readable headline</strong>
          <p>Body copy rendered in the exact pair you pick.</p>
        </div>
      </div>
      <div className="hc-result">
        <div>
          <span className="label-mono">Contrast ratio</span>
          <div className={`hc-ratio tone-${v.tone}`} data-testid="hero-ratio">{formatRatio(ratio)}</div>
        </div>
        <ul className="hc-badges" aria-label="WCAG results">
          {res.filter((r) => r.id !== 'aa-ui').map((r) => (
            <li key={r.id} className={r.pass ? 'pass' : 'fail'}>
              <span>{r.level}</span> {r.label.replace(' text', '')} {r.pass ? '✓' : '✕'}
            </li>
          ))}
        </ul>
      </div>
      <div className="hc-controls">
        <label>
          <span className="label-mono">Text</span>
          <input type="color" value={toHex(f)} onChange={(e) => setFg(e.target.value)} aria-label="Preview text colour" />
          <code>{toHex(f)}</code>
        </label>
        <label>
          <span className="label-mono">Background</span>
          <input type="color" value={toHex(b)} onChange={(e) => setBg(e.target.value)} aria-label="Preview background colour" />
          <code>{toHex(b)}</code>
        </label>
      </div>
      <div className="hc-presets" role="group" aria-label="Example pairs">
        {presets.map(([n, a, c]) => (
          <button key={n} type="button" onClick={() => { setFg(a); setBg(c); }} aria-pressed={fg === a && bg === c} style={{ color: a, background: c }}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Home() {
  return (
    <Landing
      compact
      eyebrow="Colour accessibility · WCAG 2.2"
      title={<>Is your text <em>actually</em> readable?</>}
      lead="Pick a text colour and a background. Contrast Lab computes the WCAG contrast ratio, tells you which levels it meets, and finds the nearest colour that passes when it does not."
      primary={{ href: '#/check', label: 'Open the checker' }}
      secondary={{ href: '#/saved', label: 'View saved pairs' }}
      previewLabel="Live checker — try it"
      preview={<HeroChecker />}
      steps={[
        { title: 'Choose two colours', body: 'Use the picker or type hex (#1f2937), short hex (#333) or rgb(31, 41, 55).' },
        { title: 'Read the verdict', body: 'The ratio is checked against AA and AAA for normal text, large text and UI parts.' },
        { title: 'Fix and save', body: 'Apply a suggested colour that passes, then save the pair to your palette.' },
      ]}
      stepsIntro="Everything updates as you type. Nothing leaves your browser."
      features={[
        { title: 'Live preview', body: 'Headings, body copy, a link and a button rendered in your exact colours.' },
        { title: 'Honest rounding', body: 'Ratios are truncated, never rounded up, so 4.49:1 is never shown as a pass.' },
        { title: 'Suggested fixes', body: 'Keeps hue and saturation and only adjusts lightness to reach the target.' },
        { title: 'Saved palette', body: 'Name and keep pairs in this browser for later checks.' },
      ]}
      note="Contrast Lab implements the WCAG 2.x contrast formula. It does not model APCA (proposed for WCAG 3), transparency, or text over images."
      closing={{ title: <>Check your <em>first pair.</em></>, action: { href: '#/check', label: 'Open the checker' } }}
    />
  );
}

function ColorInput(props: { label: string; value: string; onChange: (v: string) => void; error: string | null }) {
  const parsed = parseColor(props.value);
  return (
    <Field label={props.label} error={props.error} hint="Hex, short hex, rgb() or a basic colour name">
      {(c) => (
        <div className="color-input">
          <input
            type="color"
            aria-label={`${props.label} picker`}
            value={parsed ? toHex(parsed) : '#000000'}
            onChange={(e) => props.onChange(e.target.value)}
          />
          <input type="text" {...c} value={props.value} onChange={(e) => props.onChange(e.target.value)} spellCheck={false} className="code" />
        </div>
      )}
    </Field>
  );
}

function Checker(props: {
  fg: string;
  bg: string;
  setFg: (v: string) => void;
  setBg: (v: string) => void;
  pairs: SavedPair[];
  setPairs: (p: SavedPair[]) => void;
}) {
  const { fg, bg, setFg, setBg, pairs, setPairs } = props;
  const fgRgb = parseColor(fg);
  const bgRgb = parseColor(bg);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();

  const ratio = fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : null;
  const results = ratio != null ? evaluate(ratio) : [];
  const verdict = ratio != null ? summary(ratio) : null;

  const suggestions = useMemo(() => {
    if (!fgRgb || !bgRgb || ratio == null) return [];
    return [4.5, 7]
      .filter((t) => ratio < t)
      .map((t) => ({ target: t, color: suggestForeground(fgRgb, bgRgb, t) }))
      .filter((s): s is { target: number; color: NonNullable<typeof s.color> } => s.color != null);
  }, [fgRgb, bgRgb, ratio]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!fgRgb || !bgRgb) {
      setNameError('Fix the colour values above before saving.');
      return;
    }
    if (!trimmed) {
      setNameError('Give this pair a name, for example “Card body text”.');
      return;
    }
    if (trimmed.length > 40) {
      setNameError('Keep the name under 40 characters.');
      return;
    }
    if (pairs.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameError('You already have a pair with this name.');
      return;
    }
    setPairs([{ id: uid('pair'), name: trimmed, fg: toHex(fgRgb), bg: toHex(bgRgb) }, ...pairs]);
    setName('');
    setNameError(null);
    setFlash({ kind: 'success', text: `Saved “${trimmed}” to your pairs.` });
  }

  const previewStyle = fgRgb && bgRgb ? { color: toHex(fgRgb), background: toHex(bgRgb) } : undefined;

  return (
    <div className="stack">
      <PageHead eyebrow="Workspace · Checker" title={<>Contrast <em>checker</em></>} description="Results update as you type. Ratios are truncated to two decimals." />
      <div className="checker">
        <div className="card stack">
          <ColorInput label="Text colour" value={fg} onChange={setFg} error={fgRgb ? null : 'Not a colour I recognise. Try #1f2937 or rgb(31, 41, 55).'} />
          <ColorInput label="Background colour" value={bg} onChange={setBg} error={bgRgb ? null : 'Not a colour I recognise. Try #ffffff.'} />
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFg(bg);
              setBg(fg);
            }}
          >
            ⇅ Swap colours
          </button>
        </div>

        <div className="card stack">
          <div className="preview" style={previewStyle} aria-label="Preview of the colour pair">
            {previewStyle ? (
              <>
                <h2 style={{ color: 'inherit' }}>Large heading sample</h2>
                <p>
                  Body text at regular size. The quick brown fox jumps over the lazy dog. <u>A sample link</u>.
                </p>
                <span className="preview-btn" style={{ borderColor: previewStyle.color }}>Button label</span>
              </>
            ) : (
              <p className="muted">Enter two valid colours to see a preview.</p>
            )}
          </div>
          <div aria-live="polite">
            {ratio != null && verdict ? (
              <div className="ratio-row">
                <div>
                  <div className="stat-label">Contrast ratio</div>
                  <div className="ratio" data-testid="ratio">{formatRatio(ratio)}</div>
                </div>
                <p className={`verdict verdict-${verdict.tone}`}>{verdict.text}</p>
              </div>
            ) : (
              <p className="muted">The ratio appears once both colours are valid.</p>
            )}
          </div>
        </div>
      </div>

      {ratio != null && (
        <div className="grid-2">
          <div className="card">
            <h2>WCAG results</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Criterion</th>
                    <th>Needs</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>
                          {r.level} · {r.label}
                        </strong>
                        <div className="hint">{r.appliesTo}</div>
                      </td>
                      <td className="num">{r.target}:1</td>
                      <td>
                        <span className={`badge ${r.pass ? 'badge-ok' : 'badge-err'}`}>{r.pass ? '✓ Pass' : '✕ Fail'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card stack">
            <h2>Recommendations</h2>
            {suggestions.length === 0 ? (
              <p>This pair already meets AAA for normal text. No change needed.</p>
            ) : (
              <ul className="list">
                {suggestions.map((s) => (
                  <li key={s.target} className="suggestion">
                    <span className="chip" style={{ background: toHex(s.color) }} aria-hidden="true" />
                    <div>
                      To reach <strong>{s.target === 4.5 ? 'AA' : 'AAA'}</strong> for normal text, use text colour{' '}
                      <code>{toHex(s.color)}</code> ({formatRatio(contrastRatio(s.color, bgRgb!))}).
                    </div>
                    <button type="button" className="btn btn-sm" onClick={() => setFg(toHex(s.color))}>
                      Apply
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {ratio < 4.5 && suggestions.length === 0 && (
              <Notice kind="warn">No lightness of this hue reaches AA on this background. Try a different background.</Notice>
            )}
            <form onSubmit={save} className="stack" noValidate>
              <Field label="Save this pair as" error={nameError}>
                {(c) => <input type="text" {...c} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Card body text" />}
              </Field>
              <div className="row">
                <button type="submit" className="btn btn-primary">Save pair</button>
                <a href="#/saved">See saved pairs ({pairs.length})</a>
              </div>
            </form>
            {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
          </div>
        </div>
      )}
    </div>
  );
}

function Saved(props: { pairs: SavedPair[]; setPairs: (p: SavedPair[]) => void; onOpen: (p: SavedPair) => void }) {
  const { pairs, setPairs, onOpen } = props;
  const [flash, setFlash] = useFlash();
  const loadDemo = () => {
    const existing = new Set(pairs.map((p) => p.id));
    setPairs([...pairs, ...DEMO_PAIRS.filter((d) => !existing.has(d.id))]);
    setFlash({ kind: 'success', text: `Added ${DEMO_PAIRS.length} demo pairs.` });
  };
  return (
    <div className="stack">
      <PageHead
        eyebrow="Workspace · Palette"
        title={<>Saved <em>pairs</em></>}
        description={`${pairs.length} pair${pairs.length === 1 ? '' : 's'} · ${pairs.filter((p) => contrastRatio(parseColor(p.fg)!, parseColor(p.bg)!) >= 4.5).length} pass AA for body text. Stored in this browser only.`}
        actions={
          <>
            {pairs.some((p) => p.demo) ? (
              <button type="button" className="btn" onClick={() => setPairs(pairs.filter((p) => !p.demo))}>Clear demo pairs</button>
            ) : (
              <button type="button" className="btn" onClick={loadDemo}>Add demo pairs</button>
            )}
            <a className="btn btn-primary" href="#/check">New check</a>
          </>
        }
      />
      {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
      {pairs.length === 0 ? (
        <EmptyState
          title="No saved pairs yet"
          actions={
            <>
              <a className="btn btn-primary" href="#/check">Check a pair</a>
              <button type="button" className="btn" onClick={loadDemo}>Add demo pairs</button>
            </>
          }
        >
          Save a colour pair from the checker to build a palette you can come back to.
        </EmptyState>
      ) : (
        <div className="pair-grid">
          {pairs.map((p) => {
            const ratio = contrastRatio(parseColor(p.fg)!, parseColor(p.bg)!);
            const aa = ratio >= 4.5;
            return (
              <article className="card pair" key={p.id}>
                <div className="pair-swatch" style={{ color: p.fg, background: p.bg }}>Aa</div>
                <div className="pair-body">
                  <h3>
                    {p.name.replace(/^Demo: /, '')} {p.demo && <DemoTag />}
                  </h3>
                  <p className="mono small">
                    {p.fg} on {p.bg}
                  </p>
                  <span className={`badge ${aa ? 'badge-ok' : 'badge-err'}`}>
                    {formatRatio(ratio)} · {aa ? 'AA text' : 'Fails AA text'}
                  </span>
                </div>
                <div className="row">
                  <button type="button" className="btn btn-sm" onClick={() => onOpen(p)}>Open in checker</button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => setPairs(pairs.filter((x) => x.id !== p.id))}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
