import { useMemo, useState } from 'react';
import { EmptyState, Field, Landing, NotFound, Notice, Shell, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
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
];

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/check', label: 'Checker' },
  { to: '/saved', label: 'Saved pairs' },
];

export default function App() {
  const [route] = useRoute();
  const [pairs, setPairs] = usePersistentState<SavedPair[]>('contrast-lab:pairs', []);
  const [fg, setFg] = usePersistentState('contrast-lab:fg', '#6b7280');
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
    <Shell name="Contrast Lab" mark="CL" nav={NAV} route={route}>
      {page}
    </Shell>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Colour accessibility checker"
      title="Check whether your text is readable before you ship it."
      lead="Pick a text colour and a background, see a live preview, and get a plain answer on which WCAG contrast levels the pair meets — plus a nearby colour that passes when it does not."
      actions={
        <>
          <a className="btn btn-primary" href="#/check">Open the checker</a>
          <a className="btn" href="#/saved">View saved pairs</a>
        </>
      }
      preview={
        <div className="hero-swatches" aria-hidden="true">
          <div style={{ background: '#ffffff', color: '#8a8f98' }}>Aa <span>2.95:1</span></div>
          <div style={{ background: '#ffffff', color: '#5c6370' }}>Aa <span>6.11:1</span></div>
          <div style={{ background: '#5034d9', color: '#ffffff' }}>Aa <span>7.04:1</span></div>
        </div>
      }
      steps={[
        { title: 'Choose two colours', body: 'Use the colour picker or type hex (#1f2937), short hex (#333) or rgb(31, 41, 55).' },
        { title: 'Read the result', body: 'The ratio is checked against AA and AAA thresholds for normal text, large text and UI parts.' },
        { title: 'Fix and save', body: 'Apply a suggested colour that passes, then save the pair to your palette for later.' },
      ]}
      features={[
        { title: 'Live preview', body: 'Headings, body copy, a link and a button rendered in your exact colours.' },
        { title: 'Honest rounding', body: 'Ratios are truncated, never rounded up, so 4.49:1 is never shown as a pass.' },
        { title: 'Suggested fixes', body: 'Keeps your hue and saturation and only adjusts lightness to reach the target.' },
        { title: 'Saved palette', body: 'Name and keep pairs in this browser. Nothing is uploaded.' },
      ]}
      note={
        <>
          Contrast Lab implements the WCAG 2.x contrast formula. It does not yet model APCA (the proposed WCAG 3 method), transparency, or text over images.
        </>
      }
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
      <div className="page-head">
        <div>
          <h1>Contrast checker</h1>
          <p>Results update as you type.</p>
        </div>
      </div>
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
    setFlash({ kind: 'success', text: 'Added three demo pairs.' });
  };
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Saved pairs</h1>
          <p>Stored in this browser only.</p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={loadDemo}>Add demo pairs</button>
          <a className="btn btn-primary" href="#/check">New check</a>
        </div>
      </div>
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
                    {p.name} {p.demo && <span className="demo-tag">Demo</span>}
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
