import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CHAINS, getChain } from './model';
import { buildMarkovTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import MarkovStage from './MarkovStage';

const readInitial = (sp) => {
    const chainId = CHAINS.some((chain) => chain.id === sp.get('chain')) ? sp.get('chain') : 'weather';
    const start = Number.parseInt(sp.get('start') ?? '', 10);
    const states = getChain(chainId).states.length;
    return {
        chainId,
        startIndex: Number.isFinite(start) && start >= -1 && start < states ? start : -1,
    };
};

export default function MarkovVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [chainId, setChainId] = useState(initial.chainId);
    const [startIndex, setStartIndex] = useState(initial.startIndex);

    const chain = getChain(chainId);
    // Switching presets can strand the start index past the last state.
    useEffect(() => {
        if (startIndex >= chain.states.length) setStartIndex(-1);
    }, [chain, startIndex]);

    const built = useMemo(() => {
        try {
            return {
                trace: buildMarkovTrace({
                    chainId,
                    startIndex: Math.min(startIndex, chain.states.length - 1),
                    iterations: 40,
                }),
            };
        } catch (error) {
            return { error: error.message };
        }
    }, [chainId, startIndex, chain]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Chain</span>
                <select value={chainId} onChange={(event) => setChainId(event.target.value)}>
                    {CHAINS.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Start from</span>
                <select
                    value={String(startIndex)}
                    onChange={(event) => setStartIndex(Number(event.target.value))}
                >
                    <option value="-1">uniform</option>
                    {chain.states.map((state, index) => (
                        <option key={state} value={String(index)}>
                            all mass on {state}
                        </option>
                    ))}
                </select>
            </label>
            <p className="control-note">{chain.note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="A walk with no memory"
            controls={controls}
            renderStage={(ctx) => <MarkovStage {...ctx} />}
            urlParams={{ chain: chainId, start: startIndex }}
            playIntervalMs={3000}
        />
    );
}
