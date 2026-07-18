import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { asPercent, populationCounts, scatterPermutation } from '../visualizations/bayes/math';
import './HeroBayes.css';

// The home-page hero: Bayes' rule running on a small population, looping
// through prior → test → posterior. The site's subject matter is its own
// identity graphic. Clicking opens the full instrument.

const COLS = 16;
const ROWS = 9;
const N = COLS * ROWS;
const SPACING = 15;
const RADIUS = 5.2;
const MARGIN = 10;

const PARAMS = { prior: 0.05, sensitivity: 0.8, falsePositiveRate: 0.1, population: N };

const PHASES = [
    { key: 'population', label: `a population of ${N}` },
    { key: 'prior', label: 'the base rate colors a few' },
    { key: 'test', label: 'the test flags true — and false — positives' },
    { key: 'posterior', label: '' }, // filled with the computed posterior
];

export default function HeroBayes() {
    const counts = useMemo(() => populationCounts(PARAMS), []);
    const permutation = useMemo(() => scatterPermutation(N, 42), []);

    const prefersReduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const [phase, setPhase] = useState(prefersReduced ? 3 : 0);

    useEffect(() => {
        if (prefersReduced) return undefined;
        const id = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 2800);
        return () => clearInterval(id);
    }, [prefersReduced]);

    const sickSet = useMemo(
        () => new Set(permutation.slice(0, counts.sick)),
        [permutation, counts.sick]
    );
    const tpSet = useMemo(
        () => new Set(permutation.slice(0, counts.truePositives)),
        [permutation, counts.truePositives]
    );
    const fpSet = useMemo(
        () => new Set(permutation.slice(counts.sick, counts.sick + counts.falsePositives)),
        [permutation, counts.sick, counts.falsePositives]
    );

    const width = MARGIN * 2 + (COLS - 1) * SPACING;
    const height = MARGIN * 2 + (ROWS - 1) * SPACING;
    const posteriorLabel = `P(sick | positive) = ${asPercent(counts.posteriorNatural, 0)}`;
    const label = phase === 3 ? posteriorLabel : PHASES[phase].label;

    const dots = [];
    for (let i = 0; i < N; i++) {
        const isSick = phase >= 1 && sickSet.has(i);
        const flagged = phase >= 2 && (tpSet.has(i) || fpSet.has(i));
        const dimmed = phase >= 3 && !flagged;
        dots.push(
            <circle
                key={i}
                className={`hdot${isSick ? ' sick' : ''}${flagged ? ' flagged' : ''}${dimmed ? ' dim' : ''}`}
                cx={MARGIN + (i % COLS) * SPACING}
                cy={MARGIN + Math.floor(i / COLS) * SPACING}
                r={RADIUS}
            />
        );
    }

    return (
        <Link
            to="/visualizer/bayes"
            className="hero-bayes"
            aria-label={`Animated Bayes' rule demo — ${posteriorLabel}. Open the full visualization.`}
        >
            <svg className="hero-bayes-grid" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
                {dots}
            </svg>
            <div className="hero-bayes-strip">
                <span className="hero-bayes-label">{label}</span>
                <span className="hero-bayes-open">open the instrument ›</span>
            </div>
        </Link>
    );
}
