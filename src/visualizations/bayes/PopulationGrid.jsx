import { useMemo } from 'react';
import { scatterPermutation } from './math';
import { asPercent } from './math';
import './PopulationGrid.css';

const COLS = 40;
const SPACING = 11;
const RADIUS = 4;
const MARGIN = 8;

// 1,000 dots, one per person. Category depends on which trace steps have
// been reached, so the grid always agrees with the step player:
//   sick  → vermilion fill        (from 'natural-frequencies')
//   tested positive → cobalt ring (sick from 'test-sick', healthy from 'test-healthy')
//   negatives fade                (from 'condition-on-positive')
export default function PopulationGrid({ steps, stepIndex, artifacts }) {
    const reached = new Set(steps.slice(0, stepIndex + 1).map((step) => step.id));
    const has = (id) => reached.has(id);

    const { population, sick, truePositives, falsePositives, posteriorNatural } = artifacts;
    const rows = Math.ceil(population / COLS);
    const width = MARGIN * 2 + (COLS - 1) * SPACING;
    const height = MARGIN * 2 + (rows - 1) * SPACING;

    // Fixed scatter: person i's grid position never changes; slider moves
    // grow or shrink groups in place instead of reshuffling the crowd.
    const permutation = useMemo(() => scatterPermutation(population), [population]);

    const sickSet = useMemo(() => new Set(permutation.slice(0, sick)), [permutation, sick]);
    const tpSet = useMemo(
        () => new Set(permutation.slice(0, truePositives)),
        [permutation, truePositives]
    );
    const fpSet = useMemo(
        () => new Set(permutation.slice(sick, sick + falsePositives)),
        [permutation, sick, falsePositives]
    );

    const showSick = has('natural-frequencies');
    const showTp = has('test-sick');
    const showFp = has('test-healthy');
    const conditioned = has('condition-on-positive');
    const showPosterior = has('posterior');

    const dots = [];
    for (let i = 0; i < population; i++) {
        const isSick = showSick && sickSet.has(i);
        const flagged = (showTp && tpSet.has(i)) || (showFp && fpSet.has(i));
        const dimmed = conditioned && !flagged;
        const cls = `pdot${isSick ? ' sick' : ''}${flagged ? ' flagged' : ''}${dimmed ? ' dim' : ''}`;
        dots.push(
            <circle
                key={i}
                className={cls}
                cx={MARGIN + (i % COLS) * SPACING}
                cy={MARGIN + Math.floor(i / COLS) * SPACING}
                r={RADIUS}
            />
        );
    }

    return (
        <div className="population-wrap">
            <svg
                className="population-grid"
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={`Population of ${population} people; ${sick} with the condition; ${truePositives + falsePositives} test positive.`}
            >
                {dots}
            </svg>
            <div className="population-caption">
                <span className="pkey">
                    <span className="pswatch sick" /> has condition
                </span>
                <span className="pkey">
                    <span className="pswatch flagged" /> tested positive
                </span>
                {conditioned && (
                    <span className="pkey">
                        <span className="pswatch dim" /> ruled out
                    </span>
                )}
                {showPosterior && (
                    <span className="population-readout">
                        P(sick&nbsp;|&nbsp;positive) ={' '}
                        <strong>{asPercent(posteriorNatural)}</strong>
                    </span>
                )}
            </div>
        </div>
    );
}
