import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    CACHE_READ_SHARE,
    DECODE_SETUPS,
    H100,
    KV_MODELS,
    LARGE_SMALL_PRICE_RATIO,
    BATCH_DISCOUNT,
    PREFIX_REQUESTS,
    PREFIX_TREE,
    PROMPT_BEST,
    PROMPT_BLOCKS,
    PROMPT_START,
    billCut,
    decodeStep,
    endToEnd,
    formatGB,
    formatRate,
    formatUSD,
    kvFootprint,
    prefixMatch,
    promptCacheMatch,
    ridgePoint,
    roofline,
} from '../models/inference';
import { BATCH_MAX_LEN, LAUNCH_MODES, attentionTraffic, batchRace, deploySeries, gatewaySim, launchTimeline, prefillDecode } from '../models/sims';
import { findTray, trayPath } from '../model';
import Rich from '../ui/Rich';
import { Button, Note, Readouts, Row, Says, Seg, Slider, pct, usePlayer } from './kit';

// Labs for the AI inference stack. Arithmetic comes from
// models/inference.js and mechanisms from models/sims.js; components here
// only draw and format.

/* --- Follow one request down a stack --------------------------------------------- */

export function RequestTrace({ system }) {
    const layers = system.layers;
    const N = layers.length;
    // Positions 0..N-1 going down, N..2N-1 coming back up.
    const [pos, setPos] = useState(-1);
    const [playing, setPlaying] = usePlayer(
        () => {
            setPos((p) => (p >= 2 * N - 1 ? -1 : p + 1));
        },
        1300,
        { autoplay: false }
    );
    const down = pos >= 0 && pos < N;
    const up = pos >= N;
    const at = pos < 0 ? -1 : down ? pos : 2 * N - 1 - pos;
    const layer = at >= 0 ? layers[at] : null;
    const ROW = 58;
    const H = 30 + N * ROW + 10;
    return (
        <div className="sd-trace">
            <div className="sd-trace-grid">
                <svg viewBox={`0 0 520 ${H}`} className="sd-svg" role="img" aria-label="A request travels down the layers, then tokens stream back up">
                    <line x1="494" x2="494" y1="14" y2={H - 8} className="sd-trace-down" />
                    <line x1="22" x2="22" y1="14" y2={H - 8} className="sd-trace-up" />
                    <text x="494" y="10" textAnchor="middle" className="sd-axis">
                        {system.trace.down}
                    </text>
                    <text x="22" y="10" textAnchor="middle" className="sd-axis">
                        {system.trace.up}
                    </text>
                    {layers.map((L, i) => {
                        const y = 26 + i * ROW;
                        const on = i === at;
                        const passed = down ? i < at : up ? i > at : false;
                        return (
                            <Link key={L.id} to={trayPath(system.id, L.id)} aria-label={`${L.code} ${L.name}: open this layer`}>
                                <g className={`sd-trace-tray c${L.color}${on ? ' on' : ''}${passed ? ' passed' : ''}`}>
                                    <rect x="40" y={y} width="440" height={ROW - 10} rx="5" className="body" />
                                    <rect x="40" y={y} width="9" height={ROW - 10} rx="3" className="stripe" />
                                    <text x="62" y={y + 21} className="code">
                                        {L.code}
                                    </text>
                                    <text x="104" y={y + 21} className="name">
                                        {L.name}
                                    </text>
                                    <text x="104" y={y + 38} className="sub">
                                        {L.products}
                                    </text>
                                    <circle cx="462" cy={y + (ROW - 10) / 2} r="5" className="led" />
                                </g>
                            </Link>
                        );
                    })}
                    {at >= 0 && <circle cx={down ? 494 : 22} cy={26 + at * ROW + (ROW - 10) / 2} r="8" className="sd-token" />}
                </svg>
                <div className="sd-trace-card" aria-live="polite">
                    {layer ? (
                        <>
                            <div className="sd-k">
                                {layer.code} · {down ? system.trace.goingLabel : system.trace.returningLabel}
                            </div>
                            <h4>{system.trace.steps[layer.id].head}</h4>
                            <p>
                                <Rich text={system.trace.steps[layer.id].does} />
                            </p>
                            {system.trace.steps[layer.id].owner && <p className="sd-muted">Owned by {system.trace.steps[layer.id].owner}.</p>}
                        </>
                    ) : (
                        <p>
                            <Rich text={system.trace.intro} />
                        </p>
                    )}
                    {up && at === 0 && (
                        <p className="sd-muted">
                            <Rich text={system.trace.outro} />
                        </p>
                    )}
                </div>
            </div>
            <Row>
                <Button primary onClick={() => setPlaying(!playing)}>
                    {playing ? 'Pause' : pos < 0 ? 'Play' : 'Resume'}
                </Button>
                <Button
                    onClick={() => {
                        setPlaying(false);
                        setPos((p) => (p >= 2 * N - 1 ? -1 : p + 1));
                    }}
                >
                    Next layer
                </Button>
                <Button
                    onClick={() => {
                        setPlaying(false);
                        setPos(-1);
                    }}
                >
                    Restart
                </Button>
            </Row>
        </div>
    );
}

export function StackMorph({ before, after }) {
    const [mode, setMode] = useState('after');
    const list = mode === 'after' ? after : before;
    return (
        <div>
            <Seg
                label="Picture"
                options={[
                    { id: 'before', name: before.label },
                    { id: 'after', name: after.label },
                ]}
                value={mode}
                onChange={setMode}
            />
            <ol className={`sd-morph ${mode}`}>
                {list.boxes.map((b, i) => (
                    <li key={b.name} className={b.color ? `c${b.color}` : 'c0'} style={{ flexGrow: b.grow ?? 1 }}>
                        <strong>{b.name}</strong>
                        {b.sub && <span>{b.sub}</span>}
                        {i < list.boxes.length - 1 && <span className="sd-sr">, then</span>}
                    </li>
                ))}
            </ol>
            <Says text={list.note} />
        </div>
    );
}

export function Phases({ prompt, output }) {
    const P = prompt.length;
    const [step, setStep] = useState(-1);
    const [playing, setPlaying] = usePlayer(() => setStep((s) => (s >= output.length ? -1 : s + 1)), 1100);
    const filled = step < 0 ? 0 : P + step;
    const label =
        step === 0
            ? `Prefill: one forward pass over all ${P} prompt tokens at once`
            : step > 0
              ? `Decode step ${step}: one new token`
              : 'Press Play or Step';
    const sub =
        step === 0
            ? 'Every prompt token is computed in parallel, and each writes its keys and values to the cache.'
            : step > 0
              ? 'The new token attends to every cached entry, then adds its own. Weights are read again for this one token.'
              : `A prompt arrives with ${P} tokens.`;
    return (
        <div>
            <Row>
                <Button primary onClick={() => setPlaying(!playing)}>
                    {playing ? 'Pause' : 'Play'}
                </Button>
                <Button
                    onClick={() => {
                        setPlaying(false);
                        setStep((s) => (s >= output.length ? -1 : s + 1));
                    }}
                >
                    Step
                </Button>
                <Button
                    onClick={() => {
                        setPlaying(false);
                        setStep(-1);
                    }}
                >
                    Restart
                </Button>
            </Row>
            <div className="sd-phase-tokens">
                <div>
                    <div className="sd-k">Prompt tokens</div>
                    <div className="sd-toks">
                        {prompt.map((t, i) => (
                            <span key={i} className={`sd-tok prompt${step === 0 ? ' active' : ''}${step >= 0 ? ' cached' : ''}`}>
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
                <div>
                    <div className="sd-k">Output tokens</div>
                    <div className="sd-toks">
                        {output.map((t, i) => (
                            <span key={i} className={`sd-tok out${i < step ? ' shown' : ''}${i === step - 1 ? ' active' : ''}`}>
                                {i < step ? t : '·'}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <div className="sd-k">KV cache in GPU memory</div>
            <div className="sd-kv-slots" aria-label={`${filled} KV entries stored`}>
                {Array.from({ length: P + output.length }, (_, i) => (
                    <span key={i} className={i < filled ? (i < P ? 'p' : 'o') : ''} />
                ))}
            </div>
            <Says>
                <strong>{label}.</strong> {sub}
            </Says>
            <Readouts
                items={[
                    { label: 'forward passes', value: Math.max(0, step + 1), strong: true },
                    { label: 'KV entries stored', value: filled },
                    { label: 'tokens out', value: Math.max(0, step) },
                    { label: 'KV entries read this pass', value: step <= 0 ? 0 : P + step - 1 },
                ]}
            />
        </div>
    );
}

const CTX = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];
const REQ = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const kLabel = (n) => (n >= 1024 ? `${n / 1024}K` : String(n));

export function KvSizer() {
    const [m, setM] = useState('l70');
    const [c, setC] = useState(6);
    const [r, setR] = useState(4);
    const model = KV_MODELS.find((x) => x.id === m);
    const f = kvFootprint(m, CTX[c], REQ[r]);
    const cells = Math.min(24, Math.max(1, Math.ceil(f.gpus)));
    return (
        <div>
            <Seg label="Model" options={KV_MODELS.filter((x) => x.id !== 'q72')} value={m} onChange={setM} />
            <div className="sd-controls">
                <Slider label="Tokens per request" min={0} max={CTX.length - 1} value={c} onChange={setC} format={(v) => kLabel(CTX[v])} />
                <Slider label="Requests in memory at once" min={0} max={REQ.length - 1} value={r} onChange={setR} format={(v) => String(REQ[v])} />
            </div>
            <p className="sd-formula">
                {model.formula} = <strong>{model.bytes.toLocaleString('en-US')} bytes per token</strong>
            </p>
            <div className="sd-gpucells">
                {Array.from({ length: cells }, (_, i) => (
                    <div key={i} className="sd-gpucell">
                        <i style={{ width: `${Math.max(0, Math.min(1, f.gpus - i)) * 100}%` }} />
                        <span>H100 {i + 1}</span>
                    </div>
                ))}
                {Math.ceil(f.gpus) > 24 && <p className="sd-fig-note">+{Math.ceil(f.gpus) - 24} more GPUs of memory not drawn</p>}
            </div>
            <Readouts
                items={[
                    { label: 'KV cache per token', value: `${Math.round(f.perToken / 1000).toLocaleString('en-US')} KB` },
                    { label: 'per request', value: formatGB(f.perRequest) },
                    { label: 'for all requests', value: formatGB(f.total), strong: true },
                    { label: 'H100s of memory, KV alone', value: f.gpus < 0.1 ? f.gpus.toFixed(2) : f.gpus.toFixed(1), strong: true },
                ]}
            />
            <Says>
                {f.gpus <= 0.5
                    ? 'Fits easily. Memory is left for weights and more requests.'
                    : f.gpus <= 1
                      ? 'Most of one GPU’s memory goes to KV cache, before counting the weights.'
                      : `The KV cache alone needs ${f.gpus.toFixed(1)} GPUs’ worth of memory, before a single weight is loaded.`}
            </Says>
        </div>
    );
}

const LATENCY_TEXT =
    'Prefill reads the prompt in one pass and fills the KV cache. Decode then adds one token per step, reading every weight and every cached key and value each time. That is why a long answer feels slow even when the first word arrives quickly: the wait is the step time multiplied by the number of tokens, and every request in the batch shares each step.';

export function LatencyFeel() {
    const [ttft, setTtft] = useState(5);
    const [tpot, setTpot] = useState(30);
    const [n, setN] = useState(6);
    const [shown, setShown] = useState(null);
    const ttftMs = ttft * 100;
    const out = n * 50;
    const e2e = endToEnd(ttftMs, tpot, out);
    const words = LATENCY_TEXT.split(' ');
    useEffect(() => {
        if (shown == null) return undefined;
        const t0 = Date.now();
        const id = setInterval(() => {
            const el = Date.now() - t0;
            const k = el < ttftMs ? 0 : Math.min(words.length, 1 + Math.floor((el - ttftMs) / tpot));
            setShown(k);
            if (k >= words.length) clearInterval(id);
        }, 25);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shown == null, ttftMs, tpot]);
    return (
        <div>
            <div className="sd-controls">
                <Slider label="Time to first token" min={1} max={30} value={ttft} onChange={setTtft} format={(v) => `${v * 100} ms`} />
                <Slider label="Time per output token" min={5} max={120} value={tpot} onChange={setTpot} format={(v) => `${v} ms`} />
                <Slider label="Output tokens" min={1} max={40} value={n} onChange={setN} format={(v) => String(v * 50)} />
            </div>
            <div className="sd-latbar" aria-hidden="true">
                <span className="ttft" style={{ width: `${(100 * ttftMs) / e2e}%` }}>
                    TTFT
                </span>
                <span className="dec" style={{ width: `${(100 * (e2e - ttftMs)) / e2e}%` }}>
                    decode: {out - 1} × TPOT
                </span>
            </div>
            <Readouts
                items={[
                    { label: 'end-to-end latency', value: `${(e2e / 1000).toFixed(2)} s`, strong: true },
                    { label: 'tokens per second, one user', value: (1000 / tpot).toFixed(1) },
                    { label: 'share spent before the first token', value: pct(ttftMs / e2e) },
                ]}
            />
            <div className="sd-stream">
                <Button primary onClick={() => setShown(shown == null ? 0 : null)}>
                    {shown == null ? 'Stream a sample answer at these speeds' : 'Stop'}
                </Button>
                <p className={`sd-stream-text${shown === 0 ? ' waiting' : ''}`}>{shown == null ? '' : shown === 0 ? 'waiting for the first token…' : words.slice(0, shown).join(' ')}</p>
            </div>
        </div>
    );
}

export function Roofline() {
    const [I, setI] = useState(1);
    const [fp8, setFp8] = useState(false);
    const r = roofline(I, { fp8 });
    const ridge = ridgePoint(H100, fp8);
    const x0 = 60;
    const x1 = 580;
    const y0 = 20;
    const y1 = 220;
    const lx = (v) => x0 + ((Math.log10(v) + 0) / 4) * (x1 - x0); // 1 … 10^4 FLOPs/byte
    const ly = (v) => y1 - ((Math.log10(v) - 12) / (Math.log10(2e15) - 12)) * (y1 - y0); // 1e12 … 2e15 FLOPS
    const pts = Array.from({ length: 81 }, (_, i) => 10 ** (i / 20));
    const d = pts.map((v, i) => `${i ? 'L' : 'M'}${lx(v).toFixed(1)},${ly(roofline(v, { fp8 }).attainable).toFixed(1)}`).join('');
    return (
        <div>
            <div className="sd-controls">
                <Slider label="Arithmetic intensity (FLOPs per byte)" min={0} max={4} step={0.05} value={Math.log10(I)} onChange={(v) => setI(10 ** v)} format={(v) => Math.round(10 ** v).toLocaleString('en-US')} />
                <Seg
                    label="Precision"
                    options={[
                        { id: 'bf16', name: 'BF16' },
                        { id: 'fp8', name: 'FP8' },
                    ]}
                    value={fp8 ? 'fp8' : 'bf16'}
                    onChange={(v) => setFp8(v === 'fp8')}
                />
            </div>
            <div className="sd-chips" role="group" aria-label="Workloads">
                {[
                    ['Decode, batch 1', 1],
                    ['Decode, batch 64', 64],
                    ['Prefill, 2K prompt', 2048],
                ].map(([name, v]) => (
                    <button key={name} type="button" className="sd-chip-btn" aria-pressed={Math.abs(I - v) < 0.5} onClick={() => setI(v)}>
                        {name}
                    </button>
                ))}
            </div>
            <svg viewBox="0 0 600 250" className="sd-svg" role="img" aria-label={`Roofline: ${(r.attainable / 1e12).toFixed(0)} TFLOPS attainable at ${I.toFixed(0)} FLOPs per byte`}>
                {[1, 10, 100, 1000, 10000].map((v) => (
                    <g key={v}>
                        <line x1={lx(v)} x2={lx(v)} y1={y0} y2={y1} className="sd-grid" />
                        <text x={lx(v)} y={y1 + 16} textAnchor="middle" className="sd-axis">
                            {v.toLocaleString('en-US')}
                        </text>
                    </g>
                ))}
                {[1e12, 1e13, 1e14, 1e15].map((v) => (
                    <g key={v}>
                        <line x1={x0} x2={x1} y1={ly(v)} y2={ly(v)} className="sd-grid" />
                        <text x={x0 - 6} y={ly(v) + 4} textAnchor="end" className="sd-axis">
                            {v / 1e12 >= 1000 ? `${v / 1e15} P` : `${v / 1e12} T`}
                        </text>
                    </g>
                ))}
                <text x={(x0 + x1) / 2} y={y1 + 30} textAnchor="middle" className="sd-axis">
                    FLOPs per byte read (log)
                </text>
                <path d={d} className="sd-line" />
                <line x1={lx(ridge)} x2={lx(ridge)} y1={y0} y2={y1} className="sd-limit" />
                <text x={lx(ridge) + 6} y={y0 + 12} className="sd-axis bad">
                    ridge {Math.round(ridge)}
                </text>
                <circle cx={lx(I)} cy={ly(r.attainable)} r="6" className="sd-mark" />
            </svg>
            <Says>
                At <strong>{Math.round(I).toLocaleString('en-US')}</strong> FLOPs per byte the H100 can reach <strong>{(r.attainable / 1e12).toFixed(r.attainable < 1e13 ? 1 : 0)} TFLOPS</strong>,{' '}
                {pct(r.attainable / r.peak, r.attainable / r.peak < 0.01 ? 1 : 0)} of its {fp8 ? 'FP8' : 'BF16'} peak. {r.memoryBound ? 'Memory bandwidth is the ceiling.' : 'Compute is the ceiling.'}
            </Says>
            <Note>
                Simplified: weights only, no KV cache or attention math. H100 datasheet peaks: {(H100.bf16 / 1e12).toLocaleString('en-US')} TFLOPS dense BF16, {(H100.fp8 / 1e12).toLocaleString('en-US')} FP8,{' '}
                {H100.bandwidth / 1e12} TB/s.
            </Note>
        </div>
    );
}

export function Glossary({ terms, system }) {
    const [q, setQ] = useState('');
    const shown = terms.filter((t) => `${t.term} ${t.def}`.toLowerCase().includes(q.toLowerCase()));
    return (
        <div>
            <input className="sd-search" type="search" placeholder="Filter terms" aria-label="Filter terms" value={q} onChange={(e) => setQ(e.target.value)} />
            <dl className="sd-glossary">
                {shown.map((t) => (
                    <div key={t.term}>
                        <dt>{t.term}</dt>
                        <dd>
                            {t.def}{' '}
                            {t.layers.map((id) => {
                                const tray = findTray(system, id);
                                return (
                                    <Link key={id} to={trayPath(system.id, id)} className={`sd-chip c${tray.color}`}>
                                        {tray.code}
                                    </Link>
                                );
                            })}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export function PromptOrder() {
    const [order, setOrder] = useState(PROMPT_START);
    const r = promptCacheMatch(order);
    const move = (i, j) => {
        if (j < 0 || j >= order.length) return;
        const next = [...order];
        const [k] = next.splice(i, 1);
        next.splice(j, 0, k);
        setOrder(next);
    };
    let acc = 0;
    return (
        <div>
            <Row>
                <Button primary onClick={() => setOrder(PROMPT_BEST)}>
                    Put the stable parts first
                </Button>
                <Button onClick={() => setOrder(PROMPT_START)}>Reset to the timestamp-first prompt</Button>
            </Row>
            <div className="sd-two">
                <ol className="sd-plist">
                    {order.map((id, i) => {
                        const b = PROMPT_BLOCKS.find((x) => x.id === id);
                        return (
                            <li key={id} className={b.changes ? 'changes' : ''}>
                                <span>
                                    <strong>{b.name}</strong>
                                    <small>
                                        {b.tokens.toLocaleString('en-US')} tokens · {b.changes ? 'changes every request' : b.note}
                                    </small>
                                </span>
                                <button type="button" aria-label={`Move ${b.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                                    ↑
                                </button>
                                <button type="button" aria-label={`Move ${b.name} down`} disabled={i === order.length - 1} onClick={() => move(i, i + 1)}>
                                    ↓
                                </button>
                            </li>
                        );
                    })}
                </ol>
                <div>
                    <div className="sd-pbar" aria-hidden="true">
                        {order.map((id) => {
                            const b = PROMPT_BLOCKS.find((x) => x.id === id);
                            acc += b.tokens;
                            return <span key={id} className={acc <= r.hit ? 'hit' : 'miss'} style={{ width: `${(100 * b.tokens) / r.total}%` }} title={b.name} />;
                        })}
                    </div>
                    <div className="sd-legend">
                        <span>
                            <i className="sw hit" /> served from cache
                        </span>
                        <span>
                            <i className="sw miss" /> computed again
                        </span>
                    </div>
                    <Readouts
                        items={[
                            { label: 'of input tokens from cache', value: pct(r.share), strong: true },
                            { label: 'input cost against list price', value: pct(r.cost) },
                            { label: 'first part that changed', value: r.broken ? r.broken.name : 'none' },
                        ]}
                    />
                    <Says>
                        {r.share > 0.9 ? (
                            <>
                                The repeated parts lead, so the next request reuses <strong>{pct(r.share)}</strong> of its input and pays about <strong>{pct(r.cost)}</strong> of list price for it.
                            </>
                        ) : r.share > 0 ? (
                            <>
                                The match stops at <strong>{r.broken.name}</strong>. Everything after it is computed again, even the parts that never change.
                            </>
                        ) : (
                            <>
                                <strong>{r.broken.name}</strong> comes first and changes every time, so nothing matches. Every request pays full price, and no error says so.
                            </>
                        )}
                    </Says>
                </div>
            </div>
            <Note>Example prompt, sizes illustrative. Cache reads priced at {pct(CACHE_READ_SHARE)} of the input price.</Note>
        </div>
    );
}

export function GatewaySim() {
    const [rate, setRate] = useState(5);
    const [small, setSmall] = useState(30);
    const [down, setDown] = useState(false);
    const r = gatewaySim({ rate, smallShare: small, largeDown: down });
    const maxQ = Math.max(4, ...r.series.map((p) => p.waiting));
    return (
        <div>
            <div className="sd-controls">
                <Slider label="Traffic" min={1} max={12} value={rate} onChange={setRate} format={(v) => `${v} req/s`} />
                <Slider label="Routed to the small model" min={0} max={90} step={5} value={small} onChange={setSmall} format={(v) => `${v}%`} />
            </div>
            <Button aria-pressed={down} onClick={() => setDown(!down)}>
                {down ? 'Bring the large model back' : 'Take the large model down'}
            </Button>
            <svg viewBox="0 0 600 150" className="sd-svg" role="img" aria-label="Requests waiting on the token budget over one minute">
                <text x="0" y="12" className="sd-axis strong">
                    Requests waiting on the token budget, over one minute
                </text>
                <line x1="30" x2="590" y1="130" y2="130" className="sd-rule" />
                {r.series.map((p) => (
                    <rect key={p.t} x={30 + p.t * 9.2} y={130 - (p.waiting / maxQ) * 100} width="7" height={(p.waiting / maxQ) * 100} className="sd-bar" />
                ))}
                <text x="26" y="34" textAnchor="end" className="sd-axis">
                    {maxQ}
                </text>
                <text x="26" y="134" textAnchor="end" className="sd-axis">
                    0
                </text>
            </svg>
            <Readouts
                items={[
                    { label: 'requests sent', value: r.sent.toLocaleString('en-US') },
                    { label: 'still waiting on the token budget', value: r.waiting },
                    { label: 'retries (billed twice)', value: r.retries, tone: r.retries ? 'bad' : '' },
                    { label: 'spend per minute, small-model tokens = 1', value: Math.round(r.spendPerMinute).toLocaleString('en-US'), strong: true },
                    { label: 'share of spend on the large model', value: pct(r.largeShare) },
                ]}
            />
            <Note>
                Simulation over one minute, seeded so it repeats. The large model costs {LARGE_SMALL_PRICE_RATIO} times the small one per token, the input price ratio between Claude 3.5 Sonnet and
                Claude 3 Haiku. The gateway refills a fixed token budget each second; a failed call bills half its tokens before the fallback bills them again.
            </Note>
        </div>
    );
}

const PD_SAYS = {
    'one-pool': '**One pool.** A long prompt’s prefill takes the whole GPU for several steps, and every user mid-answer waits for it.',
    chunked: '**Chunked prefill.** The engine cuts each prompt into pieces that ride along with decode steps. Steps get a little longer, and the long pauses disappear.',
    split: '**Split pools.** Prefill GPUs read prompts while decode GPUs stream answers. The KV cache moves between them; DistServe served 7.4× more requests within latency targets this way.',
};

export function PdSplit() {
    const [mode, setMode] = useState('one-pool');
    const r = prefillDecode(mode, 64);
    const W = 600;
    const px = (W - 120) / 64;
    return (
        <div>
            <Seg
                label="Mode"
                options={[
                    { id: 'one-pool', name: 'One pool' },
                    { id: 'chunked', name: 'One pool, chunked prefill' },
                    { id: 'split', name: 'Split pools' },
                ]}
                value={mode}
                onChange={setMode}
            />
            <svg viewBox={`0 0 ${W} ${40 + r.lanes.length * 50 + 50}`} className="sd-svg" role="img" aria-label={`Longest pause between tokens: ${r.longestGap.toFixed(1)} steps`}>
                {r.lanes.map((lane, li) => {
                    const y = 24 + li * 50;
                    return (
                        <g key={lane.name}>
                            <text x="0" y={y + 20} className="sd-axis strong">
                                {lane.name}
                            </text>
                            {lane.blocks
                                .filter((b) => b.start < 64)
                                .map((b, i) => (
                                    <rect key={i} x={110 + b.start * px} y={y + 4} width={Math.max(1, Math.min(b.len, 64 - b.start) * px - 1)} height="26" rx="2" className={b.kind === 'prefill' ? 'sd-prefill' : 'sd-decode'} />
                                ))}
                        </g>
                    );
                })}
                {(() => {
                    const y = 24 + r.lanes.length * 50 + 6;
                    return (
                        <g>
                            <text x="0" y={y + 12} className="sd-axis strong">
                                One user’s tokens
                            </text>
                            {r.tokens
                                .filter((t) => t <= 64)
                                .map((t, i) => (
                                    <circle key={i} cx={110 + t * px} cy={y + 8} r="3.5" className="sd-tokdot" />
                                ))}
                        </g>
                    );
                })()}
            </svg>
            <div className="sd-legend">
                <span>
                    <i className="sw prefill" /> prefill: reading a new prompt
                </span>
                <span>
                    <i className="sw decode" /> decode step: one token per running request
                </span>
            </div>
            <Readouts
                items={[
                    { label: 'longest pause between one user’s tokens', value: `${r.longestGap.toFixed(1)} steps`, strong: true },
                    { label: 'new prompts read', value: r.prefills },
                    { label: 'GPU pools', value: r.pools },
                ]}
            />
            <Says text={PD_SAYS[mode]} />
            <Note>Simulation in decode steps, seeded. Long prompts arrive every 18 to 28 steps; their prefill takes 6 to 10 steps.</Note>
        </div>
    );
}

export function BatchingRace() {
    const [steps, setSteps] = useState(0);
    const [playing, setPlaying] = usePlayer(() => setSteps((s) => (s >= 400 ? s : s + 3)), 120);
    const [stat, cont] = batchRace(steps);
    const panel = (sim, name, sub) => (
        <div className="sd-bpanel">
            <h4>{name}</h4>
            <p className="sd-fig-sub">{sub}</p>
            {sim.slots.map((sl, i) => (
                <div key={i} className={`sd-slot${sl.progress >= sl.len ? ' idle' : ''}`}>
                    <span className="tgt" style={{ width: `${(100 * sl.len) / BATCH_MAX_LEN}%` }} />
                    <span className="fill" style={{ width: `${(100 * sl.progress) / BATCH_MAX_LEN}%` }} />
                </div>
            ))}
            <Readouts
                items={[
                    { label: 'requests finished', value: sim.done, strong: true },
                    { label: 'slot-steps doing work', value: pct(sim.utilization) },
                ]}
            />
        </div>
    );
    return (
        <div>
            <Row>
                <Button primary onClick={() => setPlaying(!playing)}>
                    {playing ? 'Pause' : 'Play'}
                </Button>
                <Button
                    onClick={() => {
                        setPlaying(false);
                        setSteps((s) => s + 1);
                    }}
                >
                    Step
                </Button>
                <Button
                    onClick={() => {
                        setPlaying(false);
                        setSteps(0);
                    }}
                >
                    Reset
                </Button>
                <span className="sd-muted">Step {steps}</span>
            </Row>
            <div className="sd-two even">
                {panel(stat, 'Static batching', 'A new batch starts only when every request in it has finished.')}
                {panel(cont, 'Continuous batching (Orca)', 'A finished request leaves at the next step, and a waiting one takes its seat.')}
            </div>
            <Says>
                {cont.done > stat.done && stat.done > 0 ? (
                    <>
                        Same requests, same six slots: continuous batching has finished <strong>{cont.done}</strong> to static batching’s <strong>{stat.done}</strong>. Orca reported 36.9× the
                        throughput of FasterTransformer at equal latency.
                    </>
                ) : (
                    'Both panels draw from the same queue. Dashed outlines show each request’s full length. Press Play.'
                )}
            </Says>
        </div>
    );
}

const LAUNCH_SAYS = [
    '**Eager.** The CPU launches eight small kernels one after another. The GPU finishes each one before the next launch arrives, so it sits idle in the gaps.',
    '**Compiled.** Fusion turns eight operations into three larger kernels. Fewer launches, fewer gaps.',
    '**Compiled plus a CUDA graph.** One launch replays the whole step, and the kernels run back to back.',
];

export function LaunchOverhead() {
    const [mode, setMode] = useState('eager');
    const t = launchTimeline(mode);
    const scale = 520 / 56;
    return (
        <div>
            <Seg label="Mode" options={LAUNCH_MODES} value={mode} onChange={setMode} />
            <svg viewBox="0 0 600 120" className="sd-svg" role="img" aria-label={`GPU busy ${pct(t.busy)} of the step`}>
                <defs>
                    <pattern id="sd-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="6" className="sd-hatch-line" />
                    </pattern>
                </defs>
                <text x="0" y="36" className="sd-axis strong">
                    CPU
                </text>
                <text x="0" y="86" className="sd-axis strong">
                    GPU
                </text>
                {t.blocks.map((b, i) => (
                    <rect
                        key={i}
                        x={60 + b.start * scale}
                        y={b.lane === 'cpu' ? 18 : 68}
                        width={Math.max(1, (b.end - b.start) * scale - 1)}
                        height="26"
                        rx="2"
                        className={b.kind === 'launch' ? 'sd-launch' : b.kind === 'kernel' ? 'sd-kernel' : 'sd-idle'}
                        fill={b.kind === 'idle' ? 'url(#sd-hatch)' : undefined}
                    />
                ))}
                <line x1={60 + t.end * scale} x2={60 + t.end * scale} y1="10" y2="104" className="sd-limit" />
                <text x={60 + t.end * scale + 4} y="112" className="sd-axis">
                    step done
                </text>
            </svg>
            <Readouts
                items={[
                    { label: 'GPU busy during the step', value: pct(t.busy), strong: true },
                    { label: 'time to finish the step', value: `${t.end} units` },
                    { label: 'CPU launches', value: t.launches },
                ]}
            />
            <Says text={LAUNCH_SAYS[LAUNCH_MODES.findIndex((m) => m.id === mode)]} />
            <Note>Illustrative timings: a launch costs 6 units; eager kernels run 2 units each, fused kernels 5.</Note>
        </div>
    );
}

export function FlashTraffic() {
    const [n, setN] = useState(6);
    const t = attentionTraffic(n);
    const cell = Math.min(22, 150 / n);
    const grid = (flash) => (
        <svg viewBox="0 0 200 200" className="sd-svg sd-flash" role="img" aria-label={flash ? 'FlashAttention: score tiles stay on chip' : 'Standard attention: score tiles written to HBM'}>
            {Array.from({ length: n * n }, (_, i) => (
                <rect key={i} x={20 + (i % n) * cell} y={20 + Math.floor(i / n) * cell} width={cell - 2} height={cell - 2} className={flash ? 'sram' : 'hbm'} />
            ))}
        </svg>
    );
    return (
        <div>
            <Slider label="Prompt length (tiles per side)" min={4} max={10} value={n} onChange={setN} format={(v) => `${v} × ${v}`} />
            <div className="sd-two even sd-flash">
                <div>
                    <h4>Standard attention</h4>
                    <p className="sd-fig-sub">The score matrix S, then P, lives in HBM.</p>
                    {grid(false)}
                </div>
                <div>
                    <h4>FlashAttention</h4>
                    <p className="sd-fig-sub">Each tile is computed in on-chip SRAM; only the output goes back.</p>
                    {grid(true)}
                </div>
            </div>
            <Readouts
                items={[
                    { label: 'score tiles moved through HBM, standard', value: t.standard },
                    { label: 'score tiles moved through HBM, FlashAttention', value: t.flash, strong: true },
                    { label: 'growth when the prompt doubles, standard', value: '4×' },
                ]}
            />
            <Says text="Standard attention writes the score matrix to HBM, reads it back for the softmax, writes the result and reads it again. The traffic grows with the square of the prompt. FlashAttention computes each tile of scores in on-chip SRAM and writes only the output." />
        </div>
    );
}

const BATCHES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
const CTXS = [512, 1024, 2048, 4096, 8192, 16384, 32768];

export function DecodeBatch() {
    const [m, setM] = useState('8b');
    const [fp8, setFp8] = useState(false);
    const [b, setB] = useState(0);
    const [c, setC] = useState(2);
    const setup = DECODE_SETUPS.find((x) => x.id === m);
    const r = decodeStep(setup, { fp8, batch: BATCHES[b], ctx: CTXS[c] });
    const pts = BATCHES.map((batch) => decodeStep(setup, { fp8, batch, ctx: CTXS[c] }));
    const ymax = Math.max(...pts.map((p) => p.tps));
    const X = (i) => 50 + (i * 530) / (BATCHES.length - 1);
    const Y = (v) => 170 - (v / ymax) * 150;
    const scale = Math.max(r.capacity, r.weights + r.kv);
    return (
        <div>
            <div className="sd-controls">
                <Seg label="Setup" options={DECODE_SETUPS} value={m} onChange={setM} />
                <Seg
                    label="Precision"
                    options={[
                        { id: 'bf16', name: 'BF16' },
                        { id: 'fp8', name: 'FP8' },
                    ]}
                    value={fp8 ? 'fp8' : 'bf16'}
                    onChange={(v) => setFp8(v === 'fp8')}
                />
                <Slider label="Requests in the batch" min={0} max={BATCHES.length - 1} value={b} onChange={setB} format={(v) => String(BATCHES[v])} />
                <Slider label="Tokens per request" min={0} max={CTXS.length - 1} value={c} onChange={setC} format={(v) => kLabel(CTXS[v])} />
            </div>
            <div className={`sd-membar${r.fits ? '' : ' over'}`} aria-label={`Weights ${formatGB(r.weights)}, KV cache ${formatGB(r.kv)}, memory ${formatGB(r.capacity)}`}>
                <span className="w" style={{ width: `${(100 * r.weights) / scale}%` }} />
                <span className="kv" style={{ width: `${(100 * r.kv) / scale}%` }} />
                <i style={{ left: `${(100 * r.capacity) / scale}%` }} />
            </div>
            <p className="sd-fig-note">
                Weights {formatGB(r.weights)} + KV cache {formatGB(r.kv)} against {formatGB(r.capacity)} of HBM.
            </p>
            <Readouts
                items={[
                    { label: 'per decode step', value: `${(r.step * 1000).toFixed(r.step < 0.01 ? 1 : 0)} ms` },
                    { label: 'tokens/s, whole batch', value: formatRate(r.tps), strong: true },
                    { label: 'tokens/s, each user', value: formatRate(r.perUser) },
                    { label: 'per million output tokens', value: formatUSD(r.costPerMillion), strong: true },
                    { label: 'tensor cores busy', value: `${(r.busy * 100).toFixed(r.busy < 0.01 ? 1 : 0)}%` },
                ]}
            />
            <svg viewBox="0 0 600 200" className="sd-svg" role="img" aria-label="Tokens per second against batch size">
                <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${X(i)},${Y(p.tps)}`).join('')} className="sd-line" />
                {pts.map((p, i) => (
                    <g key={i}>
                        <circle cx={X(i)} cy={Y(p.tps)} r={i === b ? 6 : 3} className={p.fits ? 'sd-mark' : 'sd-mark bad'} />
                        <text x={X(i)} y="190" textAnchor="middle" className="sd-axis">
                            {BATCHES[i]}
                        </text>
                    </g>
                ))}
                <text x="50" y="14" className="sd-axis strong">
                    tokens/s, whole batch (red points do not fit in memory)
                </text>
            </svg>
            <Says>
                {!r.fits ? (
                    <>
                        The KV cache for {BATCHES[b]} requests of {kLabel(CTXS[c])} tokens does not fit: at most <strong>{Math.max(r.maxBatch, 0)}</strong> can share these GPUs. A real engine would
                        queue the rest or preempt running ones.
                    </>
                ) : r.memoryBound ? (
                    <>
                        <strong>Memory-bound.</strong> Each step reads {formatGB(r.weights + r.kv)} to make {BATCHES[b]} token{BATCHES[b] === 1 ? '' : 's'}, so the tensor cores are mostly idle. Adding
                        requests is nearly free until the KV cache fills or compute catches up.
                    </>
                ) : (
                    <>
                        <strong>Compute-bound.</strong> The batch finally gives the tensor cores enough math per byte read. More requests now raise total throughput slowly and slow every user.
                    </>
                )}
            </Says>
            <Note>One decode step on H100 datasheet numbers, priced at $2 per GPU-hour. Peaks only: real engines land below these numbers.</Note>
        </div>
    );
}

export function PrefixTree() {
    const [req, setReq] = useState('a4');
    const r = prefixMatch(req);
    const R = PREFIX_REQUESTS.find((x) => x.id === req);
    const POS = { root: [10, 170], sys: [130, 170], aDoc: [320, 50], a2: [470, 50], a3: [590, 50], bQ: [320, 160], fs: [320, 260] };
    const W = { root: 90, sys: 160, aDoc: 140, a2: 110, a3: 110, bQ: 140, fs: 140 };
    const FRESH = { a4: [720, 50], b2: [470, 160], new: [320, 340], ts: [130, 340] };
    const freshFrom = { a4: 'a3', b2: 'bQ', new: 'sys', ts: 'root' };
    const edge = (a, b, bw, cls) => {
        const [ax, ay] = POS[a];
        const [bx, by] = b;
        const x0 = ax + W[a];
        return <path key={`${a}-${bx}-${by}`} d={`M${x0} ${ay + 16} C${x0 + 24} ${ay + 16} ${bx - 24} ${by + 16} ${bx} ${by + 16}`} className={cls} />;
    };
    const [fx, fy] = FRESH[req];
    return (
        <div>
            <div className="sd-chips" role="group" aria-label="Send a request">
                {PREFIX_REQUESTS.map((x) => (
                    <button key={x.id} type="button" className="sd-chip-btn" aria-pressed={req === x.id} onClick={() => setReq(x.id)}>
                        {x.label}
                    </button>
                ))}
            </div>
            <div className="sd-scroll-x">
                <svg viewBox="0 0 880 390" className="sd-svg sd-tree" role="img" aria-label={`${R.label}: ${r.hit} tokens matched, ${r.fresh} computed fresh`}>
                    {Object.entries(PREFIX_TREE)
                        .filter(([, n]) => n.parent)
                        .map(([id, n]) => edge(n.parent, POS[id], W[id], r.path.includes(id) ? 'sd-tree-edge on' : 'sd-tree-edge'))}
                    {edge(freshFrom[req], FRESH[req], 150, 'sd-tree-edge fresh')}
                    {Object.entries(PREFIX_TREE).map(([id, n]) => {
                        const [x, y] = POS[id];
                        return (
                            <g key={id} className={`sd-tree-node${r.path.includes(id) ? ' on' : ''}`}>
                                <rect x={x} y={y} width={W[id]} height="32" rx="5" />
                                <text x={x + 8} y={y + 20}>
                                    {n.label}
                                </text>
                            </g>
                        );
                    })}
                    <g className="sd-tree-node fresh">
                        <rect x={fx} y={fy} width="150" height="32" rx="5" />
                        <text x={fx + 8} y={fy + 20}>
                            {R.fresh.label}
                        </text>
                    </g>
                </svg>
            </div>
            <Readouts
                items={[
                    { label: 'tokens matched in the cache', value: r.hit.toLocaleString('en-US'), strong: true },
                    { label: 'tokens computed fresh', value: r.fresh.toLocaleString('en-US') },
                    { label: 'input cost against list price', value: pct(r.cost), strong: true },
                ]}
            />
            <Says>
                {R.miss
                    ? '**Silent miss.** A timestamp ahead of the system prompt changes token one, so nothing matches. The response still succeeds, and every request pays full price.'
                    : req === 'a4'
                      ? 'A returning conversation matches everything it sent before. Only the newest turn is computed.'
                      : req === 'b2'
                        ? 'User B matches the shared system prompt and their own first question.'
                        : 'A new user still matches the shared system prompt and tools, so even a first request is mostly cached.'}
            </Says>
            <Note>Example token counts. Cache reads priced at {pct(CACHE_READ_SHARE)} of the input price.</Note>
        </div>
    );
}

export function TemplateDeploy() {
    const [events, setEvents] = useState([]);
    const [t, setT] = useState(0);
    const [playing, setPlaying] = usePlayer(() => setT((x) => (x >= 60 ? 60 : x + 1)), 250, { autoplay: false });
    const series = deploySeries(events).filter((p) => p.t <= t);
    const last = events[events.length - 1];
    const bad = last && last[1] === 'deploy';
    const deploy = () => {
        setEvents((e) => [...e, [t, 'deploy']]);
        if (!playing) setPlaying(true);
    };
    const rollback = () => setEvents((e) => [...e, [t, 'rollback']]);
    const line = (key, y0, h) =>
        series.map((p, i) => `${i ? 'L' : 'M'}${(20 + (p.t / 60) * 560).toFixed(1)},${(y0 + h - p[key] * h).toFixed(1)}`).join('');
    return (
        <div>
            <div className="sd-dash">
                <div className="sd-dtiles">
                    <div className="sd-dtile">
                        <small>GPU busy</small>
                        <b className="ok">high</b>
                    </div>
                    <div className="sd-dtile">
                        <small>HTTP status</small>
                        <b className="ok">✓ all OK</b>
                    </div>
                    <div className="sd-dtile">
                        <small>Errors</small>
                        <b className="ok">✓ none</b>
                    </div>
                    <div className="sd-dtile">
                        <small>Replicas up</small>
                        <b className="ok">3 of 3</b>
                    </div>
                </div>
                <svg viewBox="0 0 600 230" className="sd-svg" role="img" aria-label="Prefix-cache hit rate and time to first token over one minute">
                    <text x="20" y="14" className="sd-axis strong">
                        Prefix-cache hit rate (higher is better)
                    </text>
                    <rect x="20" y="20" width="560" height="80" className="sd-chart-bg" />
                    <path d={line('hit', 20, 80)} className="sd-line g" />
                    <text x="20" y="126" className="sd-axis strong">
                        Time to first token (lower is better)
                    </text>
                    <rect x="20" y="132" width="560" height="80" className="sd-chart-bg" />
                    <path d={line('ttft', 132, 80)} className="sd-line bad" />
                    {events.map(([at, kind], i) => (
                        <g key={i}>
                            <line x1={20 + (at / 60) * 560} x2={20 + (at / 60) * 560} y1="20" y2="212" className="sd-limit" />
                            <text x={24 + (at / 60) * 560} y="226" className="sd-axis">
                                {kind === 'deploy' ? 'template deploy' : 'rollback'}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
            <Row>
                <Button primary onClick={deploy} disabled={bad || t >= 60}>
                    Deploy the timestamp-first template
                </Button>
                <Button onClick={rollback} disabled={!bad || t >= 60}>
                    Roll back
                </Button>
                <Button
                    onClick={() => {
                        setEvents([]);
                        setT(0);
                        setPlaying(true);
                    }}
                >
                    Restart the minute
                </Button>
                <span className="sd-muted">t = {t} s</span>
            </Row>
            <Says>
                {!events.length
                    ? 'Cache hits are high and first tokens arrive fast. Deploy the new template and watch which panels notice.'
                    : bad
                      ? '**Nothing on the left changed.** The new template puts a timestamp first, every request misses the cache, prefill repeats work, and first tokens slow down.'
                      : 'Rolled back. Hit rate recovers and time to first token follows it down.'}
            </Says>
            <Note>Simulation of the failure pattern. The four left panels read the same in both states.</Note>
        </div>
    );
}

export function BillCut() {
    const [bill, setBill] = useState(50000);
    const [share, setShare] = useState(50);
    const [hit, setHit] = useState(0);
    const [routed, setRouted] = useState(0);
    const [batchable, setBatchable] = useState(0);
    const r = billCut({ bill, inputShare: share / 100, cacheHit: hit / 100, routed: routed / 100, batchable: batchable / 100 });
    const rows = [
        ['Today', 0, bill],
        ['Prompt cache', r.afterCache, bill],
        ['Smaller model', r.afterRouting, r.afterCache],
        ['Batch API', r.afterBatch, r.afterRouting],
        ['New bill', 0, r.afterBatch],
    ];
    const X = (v) => 130 + (v / bill) * 380;
    return (
        <div>
            <div className="sd-row">
                <label className="sd-num">
                    <span>Your monthly API bill, in dollars</span>
                    <input type="number" min="100" step="100" value={bill} onChange={(e) => Number(e.target.value) > 0 && setBill(Number(e.target.value))} />
                </label>
                {[5000, 50000, 500000].map((v) => (
                    <Button key={v} onClick={() => setBill(v)}>
                        ${v / 1000}K
                    </Button>
                ))}
            </div>
            <div className="sd-controls">
                <Slider label="Input tokens’ share of the bill" min={5} max={95} value={share} onChange={setShare} format={(v) => `${v}%`} note="Agents and document chat lean toward input." />
                <Slider label="Input tokens served from the prompt cache" min={0} max={95} value={hit} onChange={setHit} format={(v) => `${v}%`} note="DeepSeek’s production service reported 56.3%." />
                <Slider label="Requests routed to a smaller model" min={0} max={90} value={routed} onChange={setRouted} format={(v) => `${v}%`} note="Classification, extraction, short answers." />
                <Slider label="Work that can wait for a batch API" min={0} max={90} value={batchable} onChange={setBatchable} format={(v) => `${v}%`} note="Evaluations, backfills, nightly summaries." />
            </div>
            <Button
                primary
                onClick={() => {
                    setHit(56);
                    setRouted(30);
                    setBatchable(20);
                }}
            >
                Show one way to cut it
            </Button>
            <svg viewBox="0 0 600 190" className="sd-svg" role="img" aria-label={`Bill falls from ${formatUSD(bill)} to ${formatUSD(r.afterBatch)}`}>
                {rows.map(([label, a, b], i) => (
                    <g key={label}>
                        <text x="0" y={22 + i * 36} className="sd-axis strong">
                            {label}
                        </text>
                        <rect x={X(a)} y={8 + i * 36} width={Math.max(1, X(b) - X(a))} height="22" rx="2" className={i === 0 || i === 4 ? 'sd-bar' : 'sd-bar saved'} />
                        <text x={X(b) + 6} y={23 + i * 36} className="sd-axis">
                            {i === 0 || i === 4 ? formatUSD(b) : b - a > 0.005 * bill ? `−${formatUSD(b - a)}` : ''}
                        </text>
                    </g>
                ))}
            </svg>
            <Says>
                New bill: <strong>{formatUSD(r.afterBatch)}</strong> a month, {pct(r.saved)} lower, with no new hardware.
            </Says>
            <ol className="sd-math">
                <li>
                    <strong>Input spend</strong> <code>bill × input share = {formatUSD(r.input)}</code>
                </li>
                <li>
                    <strong>After the cache</strong>{' '}
                    <code>
                        input × (1 − hit rate × (1 − {pct(CACHE_READ_SHARE)})) = {formatUSD(r.inputAfterCache)}
                    </code>
                </li>
                <li>
                    <strong>After routing</strong>{' '}
                    <code>
                        total × (1 − routed × (1 − 1 ÷ {LARGE_SMALL_PRICE_RATIO})) = {formatUSD(r.afterRouting)}
                    </code>
                </li>
                <li>
                    <strong>After batching</strong>{' '}
                    <code>
                        total × (1 − batchable × {pct(BATCH_DISCOUNT)}) = {formatUSD(r.afterBatch)}
                    </code>
                </li>
            </ol>
            <Note>
                Cached input bills at a tenth of the input price, a smaller model can cost a twelfth as much per token, and batch jobs bill at half price. The model leaves out the one-time cache-write surcharge.
            </Note>
        </div>
    );
}
