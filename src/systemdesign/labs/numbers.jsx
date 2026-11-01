import { useEffect, useRef, useState } from 'react';
import { LATENCY_LADDER, formatDuration, formatHumanScale, kvLayouts, ordinal, quorum, KV_CELL } from '../models/fundamentals';
import { addPartition, partitionLoad, reshard } from '../models/hashing';
import { SERVING_GPUS, SERVING_MODELS, batchPoint, estimateFleet, fmtInt, formatBytes, kvBytesPerToken, serving } from '../models/serving';
import { FAILURES } from '../systems/fundamentalsData';
import Rich from '../ui/Rich';
import { Button, Note, Readouts, Says, Seg, Select, Slider, pct } from './kit';

// Labs that run the numbers: capacity, latency, quorums, batching, Kafka
// partitions, KV memory and resharding. Every figure comes from
// models/serving.js, models/hashing.js or models/fundamentals.js.

const MODEL_OPTIONS = Object.values(SERVING_MODELS);
const GPU_OPTIONS = Object.values(SERVING_GPUS);
const ASSUMPTIONS =
    'Simplified model: 16-bit weights and KV cache, 90% of GPU memory usable, 80% of peak memory bandwidth and 50% of dense peak FLOPs achieved, tensor parallelism sized so weights take at most half a GPU’s usable memory, average context of prompt plus half the output, no prefix sharing. Real deployments land below these upper bounds.';

const DAU = [1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7];
const PIN = [100, 250, 500, 1000, 2000, 4000, 8000];
const POUT = [50, 100, 200, 300, 500, 1000, 2000];
const short = (n) => (n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : String(n));

export function CapacityEstimator() {
    const [m, setM] = useState('l8');
    const [g, setG] = useState('h100');
    const [dau, setDau] = useState(3);
    const [rpd, setRpd] = useState(10);
    const [peak, setPeak] = useState(3);
    const [pin, setPin] = useState(3);
    const [pout, setPout] = useState(3);
    const [spd, setSpd] = useState(30);
    const model = SERVING_MODELS[m];
    const gpu = SERVING_GPUS[g];
    const e = estimateFleet({ model, gpu, users: DAU[dau], requestsPerUser: rpd, peakFactor: peak, promptTokens: PIN[pin], outputTokens: POUT[pout], tokensPerSecond: spd });
    const shown = e.ok ? Math.min(8, e.gpus) : 0;
    const wShare = Math.min(1, e.weights / e.tp / gpu.mem);
    const kvShare = e.ok ? Math.min(1, (e.perReplica * e.perSeq) / e.tp / gpu.mem) : 0;
    return (
        <div>
            <div className="sd-controls">
                <Select label="Model" options={MODEL_OPTIONS} value={m} onChange={setM} />
                <Select label="GPU" options={GPU_OPTIONS} value={g} onChange={setG} />
                <Slider label="Daily active users" min={0} max={DAU.length - 1} value={dau} onChange={setDau} format={(v) => short(DAU[v])} />
                <Slider label="Requests per user per day" min={1} max={50} value={rpd} onChange={setRpd} />
                <Slider label="Peak over average" min={1} max={10} value={peak} onChange={setPeak} format={(v) => `${v}×`} />
                <Slider label="Prompt tokens" min={0} max={PIN.length - 1} value={pin} onChange={setPin} format={(v) => fmtInt(PIN[v])} />
                <Slider label="Output tokens" min={0} max={POUT.length - 1} value={pout} onChange={setPout} format={(v) => fmtInt(POUT[v])} />
                <Slider label="Tokens/s per stream" min={5} max={100} step={5} value={spd} onChange={setSpd} />
            </div>
            {!e.ok && (
                <p className="sd-warn" role="status">
                    {e.maxByMemory < 1
                        ? `One stream’s KV cache (${formatBytes(e.perSeq)}) does not fit next to the weights. Shorten the context or choose a larger setup.`
                        : `${gpu.name} cannot reach ${spd} tokens/s per stream on ${model.name} with this context, even at batch 1. Lower the speed target.`}
                </p>
            )}
            <Readouts
                items={[
                    { label: 'requests per second at peak', value: fmtInt(e.peakRate) },
                    { label: 'streams in flight (Little’s law)', value: fmtInt(e.concurrency) },
                    { label: 'KV cache per stream', value: formatBytes(e.perSeq) },
                    { label: e.ok ? `streams per replica, limited by ${e.limiter}` : 'streams per replica', value: e.ok ? fmtInt(e.perReplica) : 'n/a' },
                    { label: e.ok ? `GPUs (${fmtInt(e.replicas)} replica${e.replicas === 1 ? '' : 's'} × ${e.tp})` : 'GPUs', value: e.ok ? fmtInt(e.gpus) : 'n/a', strong: true },
                    { label: '8-GPU servers', value: e.ok ? fmtInt(e.servers) : 'n/a', strong: true },
                ]}
            />
            <svg viewBox="0 0 600 158" className="sd-svg" role="img" aria-label={`One 8-GPU server at peak: ${shown} of 8 GPUs in use`}>
                <text x="0" y="14" className="sd-axis">
                    {e.ok ? (e.servers > 1 ? `Server 1 of ${fmtInt(e.servers)} at peak` : 'The whole fleet at peak') : 'Not reachable'}
                </text>
                {Array.from({ length: 8 }, (_, i) => {
                    const x = 4 + i * 74;
                    const h = 104;
                    const y0 = 24;
                    const used = i < shown;
                    return (
                        <g key={i}>
                            <rect x={x} y={y0} width={66} height={h} rx={4} className={used ? 'sd-gpu' : 'sd-gpu idle'} />
                            {used && <rect x={x} y={y0 + h - h * wShare} width={66} height={h * wShare} className="sd-gpu-w" />}
                            {used && <rect x={x} y={y0 + h - h * wShare - h * kvShare} width={66} height={h * kvShare} className="sd-gpu-kv" />}
                            <text x={x + 33} y={y0 + h + 16} textAnchor="middle" className="sd-axis">
                                {used ? `GPU ${i + 1}` : 'idle'}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="sd-legend">
                <span>
                    <i className="sw w" /> weights
                </span>
                <span>
                    <i className="sw kv" /> KV cache at peak
                </span>
            </div>
            <details className="sd-details">
                <summary>Show the arithmetic</summary>
                <ol className="sd-math">
                    <li>
                        <strong>Peak rate</strong>{' '}
                        <code>
                            {fmtInt(DAU[dau])} users × {rpd} requests ÷ 86,400 s × {peak} = {fmtInt(e.peakRate)} requests/s
                        </code>
                    </li>
                    <li>
                        <strong>Time in system</strong>{' '}
                        <code>
                            prefill {(e.prefill * 1000).toFixed(0)} ms + {fmtInt(POUT[pout])} tokens ÷ {spd} tokens/s = {e.timeInSystem.toFixed(1)} s
                        </code>
                    </li>
                    <li>
                        <strong>Little’s law</strong>{' '}
                        <code>
                            L = λW = {fmtInt(e.peakRate)} × {e.timeInSystem.toFixed(1)} = {fmtInt(e.concurrency)} streams
                        </code>
                    </li>
                    <li>
                        <strong>KV per token</strong>{' '}
                        <code>
                            2 × {model.layers} layers × {model.kvHeads} KV heads × {model.headDim} × 2 bytes = {formatBytes(kvBytesPerToken(model))}
                        </code>
                    </li>
                    <li>
                        <strong>One replica</strong>{' '}
                        <code>
                            {formatBytes(e.weights)} of weights on {e.tp} GPU{e.tp > 1 ? 's' : ''}; KV room {formatBytes(e.kvCap)}
                        </code>
                    </li>
                    <li>
                        <strong>Streams per replica</strong>{' '}
                        <code>
                            min({fmtInt(e.maxByMemory)} by memory, {fmtInt(e.bySpeed)} by speed) = {e.ok ? fmtInt(e.perReplica) : 'none'}
                        </code>
                    </li>
                    {e.ok && (
                        <li>
                            <strong>Fleet</strong>{' '}
                            <code>
                                ⌈{fmtInt(e.concurrency)} ÷ {fmtInt(e.perReplica)}⌉ = {fmtInt(e.replicas)} replicas × {e.tp} = {fmtInt(e.gpus)} GPUs; one decode step {(e.step * 1000).toFixed(1)} ms
                            </code>
                        </li>
                    )}
                </ol>
            </details>
            <Note>{ASSUMPTIONS}</Note>
        </div>
    );
}

export function LatencyLadder() {
    const [human, setHuman] = useState(false);
    const W = 820;
    const x0 = 260;
    const x1 = 740;
    const rowH = 38;
    const top = 34;
    const H = top + LATENCY_LADDER.length * rowH;
    const X = (v) => x0 + ((Math.log10(v) + 10) / 10) * (x1 - x0);
    return (
        <div>
            <label className="sd-toggle">
                <input type="checkbox" checked={human} onChange={(e) => setHuman(e.target.checked)} /> Stretch to human time (1 ns becomes 1 s)
            </label>
            <div className="sd-scroll-x">
                <svg viewBox={`0 0 ${W} ${H}`} className="sd-svg sd-ladder" role="img" aria-label="Latency ladder on a log scale">
                    {[
                        [1e-9, '1 ns'],
                        [1e-6, '1 µs'],
                        [1e-3, '1 ms'],
                        [1, '1 s'],
                    ].map(([v, l]) => (
                        <g key={l}>
                            <line x1={X(v)} x2={X(v)} y1={20} y2={H} className="sd-grid" />
                            <text x={X(v)} y={12} textAnchor="middle" className="sd-axis">
                                {human ? formatHumanScale(v * 1e9) : l}
                            </text>
                        </g>
                    ))}
                    {LATENCY_LADDER.map((row, i) => {
                        const y = top + i * rowH;
                        return (
                            <g key={row.label}>
                                <text x={0} y={y + 12} className="sd-ladder-label">
                                    {row.label}
                                </text>
                                <text x={0} y={y + 27} className="sd-axis">
                                    {row.use}
                                </text>
                                <rect x={x0} y={y + 4} width={Math.max(2, X(row.seconds) - x0)} height={16} rx={2} className={`sd-lbar ${row.kind}`} />
                                <text x={X(row.seconds) + 6} y={y + 16} className="sd-axis strong">
                                    {human ? formatHumanScale(row.seconds * 1e9) : formatDuration(row.seconds)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="sd-legend">
                <span>
                    <i className="sw mem" /> memory
                </span>
                <span>
                    <i className="sw disk" /> disk
                </span>
                <span>
                    <i className="sw net" /> network
                </span>
            </div>
            <Note>Approximate costs from the table dated around 2012. Modern SSDs and networks are faster; the orders of magnitude still hold. Log scale.</Note>
        </div>
    );
}

export function Quorum() {
    const [n, setN] = useState(3);
    const [w, setW] = useState(2);
    const [r, setR] = useState(2);
    const q = quorum(n, Math.min(w, n), Math.min(r, n));
    const cx = (i) => 280 + (i - (n - 1) / 2) * 88;
    const preset = (a, b, c) => {
        setN(a);
        setW(b);
        setR(c);
    };
    return (
        <div>
            <div className="sd-controls">
                <Slider label="Replicas N" min={1} max={7} value={n} onChange={setN} />
                <Slider label="Write quorum W" min={1} max={n} value={Math.min(w, n)} onChange={setW} />
                <Slider label="Read quorum R" min={1} max={n} value={Math.min(r, n)} onChange={setR} />
            </div>
            <div className="sd-chips" role="group" aria-label="Presets, as N / W / R">
                {[
                    [3, 2, 2],
                    [3, 3, 1],
                    [3, 1, 3],
                    [3, 1, 1],
                    [5, 3, 3],
                ].map(([a, b, c]) => (
                    <button key={`${a}${b}${c}`} type="button" className="sd-chip-btn" aria-pressed={n === a && q.w === b && q.r === c} onClick={() => preset(a, b, c)}>
                        {a} / {b} / {c}
                    </button>
                ))}
            </div>
            <svg viewBox="0 0 560 120" className="sd-svg" role="img" aria-label={`${n} replicas; writes acknowledged by ${q.w}, reads ask ${q.r}`}>
                {Array.from({ length: n }, (_, i) => {
                    const isW = i < q.w;
                    const isR = i >= n - q.r;
                    return (
                        <g key={i}>
                            {isR && <circle cx={cx(i)} cy={60} r={36} className="sd-q-read" />}
                            <circle cx={cx(i)} cy={60} r={28} className={isW ? 'sd-q-node w' : 'sd-q-node'} />
                            <text x={cx(i)} y={66} textAnchor="middle" className="sd-q-text">
                                {String.fromCharCode(65 + i)}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="sd-legend">
                <span>
                    <i className="sw w" /> acknowledged the latest write (W = {q.w})
                </span>
                <span>
                    <i className="sw ring" /> asked by the read (R = {q.r}), worst case
                </span>
            </div>
            <Says>
                {q.readsSeeLatestWrite ? (
                    <>
                        <strong className="ok">Reads overlap the latest write.</strong> R + W = {q.r + q.w} &gt; N = {n}, so every read set includes at least {q.overlap} node
                        {q.overlap > 1 ? 's' : ''} holding the latest acknowledged write.
                    </>
                ) : (
                    <>
                        <strong className="no">Stale reads possible.</strong> R + W = {q.r + q.w} ≤ N = {n}. The {q.r} node{q.r > 1 ? 's' : ''} read here never saw the latest write.
                    </>
                )}{' '}
                Writes keep working with <strong>{q.writesSurviveDown}</strong> node{q.writesSurviveDown === 1 ? '' : 's'} down; reads with <strong>{q.readsSurviveDown}</strong>. Each write
                waits for the {ordinal(q.w)} fastest replica, each read for the {ordinal(q.r)} fastest.
            </Says>
        </div>
    );
}

const BCTX = [500, 1000, 2000, 4000, 8000];

export function BatchingCurve() {
    const [m, setM] = useState('l8');
    const [g, setG] = useState('h100');
    const [c, setC] = useState(2);
    const [b, setB] = useState(5);
    const model = SERVING_MODELS[m];
    const gpu = SERVING_GPUS[g];
    const ctx = BCTX[c];
    const B = 2 ** b;
    const s = serving(model, gpu, ctx);
    const pts = Array.from({ length: 101 }, (_, i) => {
        const batch = 2 ** (i / 10);
        const step = s.stepTime(batch);
        return { batch, total: batch / step, per: 1 / step };
    });
    const nice = (v) => {
        const p = 10 ** Math.floor(Math.log10(v));
        const k = v / p;
        return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * p;
    };
    const aM = nice(Math.max(...pts.map((p) => p.total)));
    const pM = nice(Math.max(...pts.map((p) => p.per)));
    const x0 = 70;
    const x1 = 590;
    const X = (v) => x0 + (Math.log2(v) / 10) * (x1 - x0);
    const P1 = [24, 150];
    const P2 = [200, 320];
    const Y1 = (v) => P1[1] - (v / aM) * (P1[1] - P1[0]);
    const Y2 = (v) => P2[1] - (v / pM) * (P2[1] - P2[0]);
    const bm = Math.max(1, Math.min(1024, s.maxByMemory));
    const path = (Y, key, from, to) =>
        pts
            .filter((p) => p.batch >= from && p.batch <= to)
            .map((p, i) => `${i ? 'L' : 'M'}${X(p.batch).toFixed(1)},${Y(p[key]).toFixed(1)}`)
            .join('');
    const cur = batchPoint(model, gpu, ctx, B);
    const one = batchPoint(model, gpu, ctx, 1);
    return (
        <div>
            <div className="sd-controls">
                <Select label="Model" options={MODEL_OPTIONS} value={m} onChange={setM} />
                <Select label="GPU" options={GPU_OPTIONS} value={g} onChange={setG} />
                <Slider label="Context per stream" min={0} max={BCTX.length - 1} value={c} onChange={setC} format={(v) => `${fmtInt(BCTX[v])} tokens`} />
                <Slider label="Batch size" min={0} max={10} value={b} onChange={setB} format={(v) => fmtInt(2 ** v)} />
            </div>
            <svg viewBox="0 0 600 350" className="sd-svg" role="img" aria-label="Total and per-stream tokens per second against batch size">
                {[
                    [P1, aM, Y1, `Total tokens/s for one replica (${s.tp} GPU${s.tp > 1 ? 's' : ''})`],
                    [P2, pM, Y2, 'Tokens/s for each stream'],
                ].map(([P, M, Y, title]) => (
                    <g key={title}>
                        {[0, 1, 2, 3, 4].map((k) => (
                            <g key={k}>
                                <line x1={x0} x2={x1} y1={Y((M * k) / 4)} y2={Y((M * k) / 4)} className="sd-grid" />
                                <text x={x0 - 6} y={Y((M * k) / 4) + 4} textAnchor="end" className="sd-axis">
                                    {fmtInt((M * k) / 4)}
                                </text>
                            </g>
                        ))}
                        <text x={x0} y={P[0] - 8} className="sd-axis strong">
                            {title}
                        </text>
                    </g>
                ))}
                {[0, 2, 4, 6, 8, 10].map((k) => (
                    <text key={k} x={X(2 ** k)} y={P2[1] + 16} textAnchor="middle" className="sd-axis">
                        {fmtInt(2 ** k)}
                    </text>
                ))}
                <text x={(x0 + x1) / 2} y={P2[1] + 30} textAnchor="middle" className="sd-axis">
                    batch size (streams decoded together)
                </text>
                <path d={path(Y1, 'total', 1, bm)} className="sd-line" />
                <path d={path(Y1, 'total', bm, 1024)} className="sd-line past" />
                <path d={path(Y2, 'per', 1, bm)} className="sd-line g" />
                <path d={path(Y2, 'per', bm, 1024)} className="sd-line g past" />
                {s.maxByMemory >= 1 && s.maxByMemory <= 1024 && (
                    <g>
                        <line x1={X(s.maxByMemory)} x2={X(s.maxByMemory)} y1={P1[0]} y2={P2[1]} className="sd-limit" />
                        <text x={X(s.maxByMemory) + (X(s.maxByMemory) > 460 ? -6 : 6)} y={P1[0] + 14} textAnchor={X(s.maxByMemory) > 460 ? 'end' : 'start'} className="sd-axis bad">
                            KV cache full at {fmtInt(s.maxByMemory)} streams
                        </text>
                    </g>
                )}
                <circle cx={X(B)} cy={Y1(cur.total)} r={5} className="sd-mark" />
                <circle cx={X(B)} cy={Y2(cur.perStream)} r={5} className="sd-mark" />
            </svg>
            <Says>
                At batch 1, each step reads <strong>{formatBytes(s.weights)}</strong> of weights to make one token: <strong>{(one.step * 1000).toFixed(1)} ms</strong>,{' '}
                {fmtInt(one.perStream)} tokens/s. At batch {fmtInt(B)}, the step reads {formatBytes(cur.bytesRead)}: <strong>{(cur.step * 1000).toFixed(1)} ms</strong>,{' '}
                <strong>{fmtInt(cur.total)}</strong> tokens/s in total and <strong>{fmtInt(cur.perStream)}</strong> per stream, bound by {cur.bound}.
                {!cur.fits && (
                    <>
                        {' '}
                        <em>This batch does not fit.</em> At {fmtInt(ctx)} tokens of context the KV cache holds {fmtInt(s.maxByMemory)} streams.
                    </>
                )}
            </Says>
            <Note>{ASSUMPTIONS}</Note>
        </div>
    );
}

export function KafkaPartitions() {
    const [N, setN] = useState(12);
    const [skew, setSkew] = useState(1.1);
    const [salt, setSalt] = useState(false);
    const [added, setAdded] = useState(null);
    const L = partitionLoad({ partitions: N, skew, salt });
    const x0 = 44;
    const x1 = 630;
    const y0 = 18;
    const y1 = 190;
    const ymax = Math.max(0.05, Math.ceil(L.hottestShare * 20) / 20);
    const bw = (x1 - x0) / N;
    const addOne = () => {
        if (N >= 48) return;
        setAdded({ from: N, ...addPartition({ partitions: N, skew }) });
        setN(N + 1);
    };
    const reset = (fn) => (v) => {
        setAdded(null);
        fn(v);
    };
    return (
        <div>
            <div className="sd-controls">
                <Slider label="Partitions N" min={2} max={48} value={N} onChange={reset(setN)} />
                <Slider label="Skew s" min={0} max={1.6} step={0.1} value={skew} onChange={reset(setSkew)} format={(v) => v.toFixed(1)} />
            </div>
            <div className="sd-row">
                <label className="sd-toggle">
                    <input type="checkbox" checked={salt} onChange={(e) => reset(setSalt)(e.target.checked)} /> Salt the hottest key into 8 sub-keys
                </label>
                <Button onClick={addOne} disabled={N >= 48}>
                    Add one partition
                </Button>
            </div>
            <svg viewBox="0 0 640 230" className="sd-svg" role="img" aria-label={`Share of messages per partition; partition ${L.hottest} is hottest`}>
                {[0, 1, 2, 3, 4].map((k) => {
                    const t = (ymax * k) / 4;
                    const y = y1 - (t / ymax) * (y1 - y0);
                    return (
                        <g key={k}>
                            <line x1={x0} x2={x1} y1={y} y2={y} className="sd-grid" />
                            <text x={x0 - 6} y={y + 4} textAnchor="end" className="sd-axis">
                                {(t * 100).toFixed(0)}%
                            </text>
                        </g>
                    );
                })}
                {L.share.map((v, i) => {
                    const h = (v / ymax) * (y1 - y0);
                    return (
                        <g key={i}>
                            <rect x={x0 + i * bw + bw * 0.12} y={y1 - h} width={bw * 0.76} height={h} rx={1.5} className={i === L.hottest ? 'sd-bar hot' : 'sd-bar'} />
                            {(N <= 24 || i % 2 === 0) && (
                                <text x={x0 + i * bw + bw / 2} y={y1 + 14} textAnchor="middle" className="sd-axis">
                                    {i}
                                </text>
                            )}
                        </g>
                    );
                })}
                <line x1={x0} x2={x1} y1={y1 - (L.fairShare / ymax) * (y1 - y0)} y2={y1 - (L.fairShare / ymax) * (y1 - y0)} className="sd-mean" />
                <text x={x1} y={y1 - (L.fairShare / ymax) * (y1 - y0) - 6} textAnchor="end" className="sd-axis">
                    fair share {(100 / N).toFixed(1)}%
                </text>
                <text x={(x0 + x1) / 2} y={y1 + 32} textAnchor="middle" className="sd-axis">
                    partition
                </text>
            </svg>
            <Says>
                The hottest partition, number {L.hottest}, carries <strong>{pct(L.hottestShare, 1)}</strong> of messages against a fair share of {pct(L.fairShare, 1)}. Its consumer is
                the bottleneck, so the topic runs like <strong>{L.effectivePartitions.toFixed(1)}</strong> partitions out of {N}.
                {!salt && L.topKeyShare > L.fairShare && (
                    <>
                        {' '}
                        The most popular key alone is <em>{pct(L.topKeyShare, 1)}</em> of traffic. Adding partitions cannot fix that, because one key always maps to one partition.
                    </>
                )}
                {salt && ' Salting spreads the top key across up to 8 partitions. The price: its messages are no longer in one order, so a consumer that needs per-key order must merge 8 sub-streams.'}
                {added && (
                    <>
                        {' '}
                        Going from {added.from} to {added.from + 1} partitions sent <strong>{pct(added.keysMoved)}</strong> of keys, carrying <strong>{pct(added.trafficMoved)}</strong> of
                        traffic, to a different partition. Older messages for a moved key stay in the old partition, so consumers can see that key out of order across the change.
                    </>
                )}
            </Says>
            <Note>5,000 keys named user-0 to user-4999, hashed with Kafka’s own murmur2. Key k gets weight 1 / k^s.</Note>
        </div>
    );
}

function KvCanvas({ layout, cols = 240 }) {
    const ref = useRef(null);
    useEffect(() => {
        const cv = ref.current;
        if (!cv || !cv.getContext) return;
        let ctx;
        try {
            ctx = cv.getContext('2d');
        } catch {
            return;
        }
        if (!ctx) return;
        const cw = 4;
        const rows = Math.ceil(layout.cell.length / cols);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = cols * cw * dpr;
        cv.height = rows * cw * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const css = getComputedStyle(cv);
        const color = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
        const pal = [1, 2, 3, 4, 5, 6].map((i) => color(`--sd-c${i}`, '#2647c9'));
        ctx.fillStyle = color('--paper-sunken', '#f3f1ea');
        ctx.fillRect(0, 0, cols * cw, rows * cw);
        for (let i = 0; i < layout.cell.length; i++) {
            const v = layout.cell[i];
            if (v === KV_CELL.FREE) continue;
            const x = (i % cols) * cw;
            const y = Math.floor(i / cols) * cw;
            if (v === KV_CELL.WASTE) {
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = color('--ink-faint', '#8d897d');
            } else {
                ctx.globalAlpha = 1;
                ctx.fillStyle = v === KV_CELL.SHARED ? color('--ink', '#1c1b18') : pal[v % pal.length];
            }
            ctx.fillRect(x, y, cw - 0.6, cw - 0.6);
        }
        ctx.globalAlpha = 1;
    }, [layout, cols]);
    return <canvas ref={ref} className="sd-kv-canvas" role="img" aria-label={`${layout.requests} requests in ${layout.cell.length} blocks of GPU memory`} />;
}

const KV_SAYS = {
    reserve: (L) =>
        `Answer length is unknown, so each request reserves 2,048 tokens up front. Only **${pct(L.utilization)}** of that reservation ever holds a token.`,
    paged: (L) =>
        `A block table hands out 16-token blocks as each sequence grows, so only the tail of each last block is wasted. The same memory now holds **${fmtInt(L.requests)}** requests.`,
    shared: (L, base, all) =>
        `Every request points at one copy of the system prompt’s ${all.sharedFull} full blocks, and only its last ${all.sharedTail} tokens are stored per request. The same memory now holds **${fmtInt(L.requests)}** requests, ${(L.requests / base).toFixed(1)} times the reserved layout.`,
};

export function KvLayout() {
    const [mode, setMode] = useState('reserve');
    const all = kvLayouts();
    const L = all[mode];
    const base = all.reserve.requests;
    return (
        <div>
            <Seg
                label="Layout"
                options={[
                    { id: 'reserve', name: 'Reserve 2,048 per request' },
                    { id: 'paged', name: 'Paged, 16-token blocks' },
                    { id: 'shared', name: 'Paged + shared prefix' },
                ]}
                value={mode}
                onChange={setMode}
            />
            <div className="sd-kv-wrap">
                <KvCanvas layout={L} />
            </div>
            <div className="sd-legend">
                <span>
                    <i className="sw c1" /> holds a token
                </span>
                <span>
                    <i className="sw waste" /> reserved, never used
                </span>
                <span>
                    <i className="sw ink" /> shared system prompt
                </span>
                <span>
                    <i className="sw free" /> free
                </span>
            </div>
            <Readouts
                items={[
                    { label: 'requests that fit', value: fmtInt(L.requests), strong: true },
                    { label: 'of allocated memory holds real tokens', value: pct(L.utilization) },
                    { label: 'blocks reserved but never used', value: fmtInt(L.wastedBlocks) },
                    { label: 'requests compared with reserving 2,048', value: `${(L.requests / base).toFixed(1)}×` },
                ]}
            />
            <Says text={KV_SAYS[mode](L, base, all)} />
            <Note>
                One H100 serving Llama 3 8B: {fmtInt(all.blocks)} blocks of 16 tokens. Every request carries the same 1,000-token system prompt plus 48 to 1,048 tokens of its own.
            </Note>
        </div>
    );
}

export function Resharding() {
    const [N, setN] = useState(4);
    const [S, setS] = useState(32);
    const { ideal, schemes } = reshard({ nodes: N, logicalShards: S });
    const [mod, ring, logical] = schemes;
    return (
        <div>
            <div className="sd-controls">
                <Slider label="Nodes before" min={2} max={15} value={N} onChange={setN} />
                <Seg
                    label="Logical shards"
                    options={[
                        { id: 32, name: '32' },
                        { id: 128, name: '128' },
                    ]}
                    value={S}
                    onChange={setS}
                />
            </div>
            <svg viewBox="0 0 640 300" className="sd-svg" role="img" aria-label="Share of rows moved by each scheme when one node is added">
                <text x="372" y="14" className="sd-axis strong">
                    rows per node after
                </text>
                {schemes.map((sch, k) => {
                    const y = 44 + k * 92;
                    const mx = Math.max(...sch.load);
                    const bw = 264 / (N + 1);
                    return (
                        <g key={sch.id}>
                            <text x={0} y={y - 6} className="sd-axis strong">
                                {sch.name}
                            </text>
                            <rect x={0} y={y} width={330} height={22} rx={2} className="sd-track" />
                            <rect x={0} y={y} width={330 * sch.moved} height={22} rx={2} className="sd-moved" />
                            <line x1={330 * ideal} x2={330 * ideal} y1={y - 4} y2={y + 26} className="sd-ideal" />
                            <text x={0} y={y + 40} className="sd-axis">
                                {pct(sch.moved, 1)} of rows moved · ideal {pct(ideal, 1)}
                            </text>
                            {sch.load.map((v, j) => (
                                <rect key={j} x={372 + j * bw + 1} y={y + 22 - (v / mx) * 34} width={Math.max(1, bw - 2)} height={(v / mx) * 34} className={j === N ? 'sd-node-bar new' : 'sd-node-bar'} />
                            ))}
                            <text x={372} y={y + 40} className="sd-axis">
                                busiest {sch.busiestOverMean.toFixed(2)}× mean
                            </text>
                        </g>
                    );
                })}
            </svg>
            <Says>
                Adding node {N + 1}: hash mod N moves <strong>{pct(mod.moved)}</strong> of rows, and <strong>{pct(mod.shuffledBetweenOld)}</strong> of all rows only shuffle between old
                nodes. The ring moves <strong>{pct(ring.moved)}</strong>, close to the ideal {pct(ideal)}, and every moved row goes to the new node. {S} logical shards move{' '}
                <strong>{pct(logical.moved)}</strong>, as whole shards that can be copied and switched one at a time; the busiest node holds{' '}
                <strong>{logical.busiestOverMean.toFixed(2)}×</strong> the mean. Kafka partitions follow the first scheme, which is why adding partitions remaps keys.
            </Says>
            <Note>20,000 rows hashed with murmur2. The ring uses 100 virtual nodes per server. 32 is Citus’s default shard count.</Note>
        </div>
    );
}

// The chat-serving diagram, failed one box at a time.
const DRILL_NODES = {
    clients: [20, 150, 110, 60, 'Clients'],
    gw: [170, 150, 130, 60, 'API gateway'],
    rl: [170, 30, 130, 56, 'Rate limiter'],
    kafka: [345, 30, 150, 56, 'Usage log (Kafka)'],
    router: [345, 150, 150, 60, 'KV-aware router'],
    g1: [560, 66, 170, 54, 'GPU replica 1'],
    g2: [560, 150, 170, 54, 'GPU replica 2'],
    g3: [560, 234, 170, 54, 'GPU replica 3'],
    pg: [345, 262, 150, 74, 'Conversations'],
};
const DRILL_ARROWS = {
    'clients-gw': [130, 180, 170, 180],
    'gw-rl': [235, 150, 235, 86],
    'gw-kafka': [300, 160, 345, 72],
    'gw-router': [300, 180, 345, 180],
    'router-g1': [495, 170, 560, 96],
    'router-g2': [495, 180, 560, 177],
    'router-g3': [495, 190, 560, 258],
    'gw-pg': [300, 200, 345, 290],
};
const NODE_FAILURE = { gw: 'gw', rl: 'rl', router: 'router', g1: 'kvfull', g2: 'gpu', g3: 'kvfull', pg: 'pg', kafka: 'broker' };
const FAILURE_DIM = { gpu: ['router-g2'], pg: ['gw-pg'] };

export function FailureDrill({ start = 'gpu', only }) {
    const keys = only ?? Object.keys(FAILURES);
    const [k, setK] = useState(start);
    const f = FAILURES[k];
    const dim = FAILURE_DIM[k] ?? [];
    return (
        <div>
            <div className="sd-chips" role="group" aria-label="Fail a part">
                {keys.map((id) => (
                    <button key={id} type="button" className="sd-chip-btn" aria-pressed={k === id} onClick={() => setK(id)}>
                        {FAILURES[id].name}
                    </button>
                ))}
            </div>
            <div className="sd-scroll-x">
                <svg viewBox="0 0 750 350" className="sd-svg sd-drill-svg" role="img" aria-label={`Chat-serving design with ${f.name} failed`}>
                    {Object.entries(DRILL_ARROWS).map(([id, [a, b, c, d]]) => (
                        <line key={id} x1={a} y1={b} x2={c} y2={d} className={dim.includes(id) ? 'sd-wire dim' : 'sd-wire'} markerEnd="url(#sd-arrow2)" />
                    ))}
                    <defs>
                        <marker id="sd-arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                            <path d="M0 0 L10 5 L0 10 z" className="sd-arrowhead" />
                        </marker>
                    </defs>
                    {Object.entries(DRILL_NODES).map(([id, [x, y, w, h, label]]) => {
                        const failed = f.nodes.includes(id);
                        const failure = NODE_FAILURE[id];
                        const activate = () => failure && keys.includes(failure) && setK(failure);
                        return (
                            <g
                                key={id}
                                className={`sd-dnode${failed ? ' fail' : ''}`}
                                role={failure ? 'button' : undefined}
                                tabIndex={failure ? 0 : undefined}
                                aria-label={failure ? `Fail: ${label}` : undefined}
                                onClick={activate}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        activate();
                                    }
                                }}
                            >
                                <rect x={x} y={y} width={w} height={h} rx={4} />
                                <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle">
                                    {label}
                                </text>
                                {id === 'pg' && (
                                    <text x={x + w / 2} y={y + h / 2 + 22} textAnchor="middle" className="small">
                                        sharded Postgres
                                    </text>
                                )}
                                {failed && (
                                    <path d={`M${x + w - 24} ${y + 8} l14 14 M${x + w - 10} ${y + 8} l-14 14`} className="sd-x" />
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="sd-fail-card">
                <h4>{f.title}</h4>
                <dl>
                    <div>
                        <dt>Users see</dt>
                        <dd>
                            <Rich text={f.users} />
                        </dd>
                    </div>
                    <div>
                        <dt>First metric to move</dt>
                        <dd>
                            <Rich text={f.metric} />
                        </dd>
                    </div>
                    <div>
                        <dt>What limits the damage</dt>
                        <dd>
                            <Rich text={f.limit} />
                        </dd>
                    </div>
                    <div>
                        <dt>Blast radius</dt>
                        <dd>
                            <Rich text={f.blast} />
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}
