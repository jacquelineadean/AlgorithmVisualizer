import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SENTENCES, getSentence } from './model';
import { buildAttentionTrace } from './trace';
import { SOURCES } from './sources';
import TraceInstrument from '../player/TraceInstrument';
import AttentionStage from './AttentionStage';

const readInitial = (sp) => {
    const sentenceId = SENTENCES.some((item) => item.id === sp.get('s2'))
        ? sp.get('s2')
        : 'animal';
    const row = Number.parseInt(sp.get('q') ?? '', 10);
    const tokens = getSentence(sentenceId).tokens.length;
    return {
        sentenceId,
        causal: sp.get('mask') === '1',
        focusRow: Number.isFinite(row) && row >= 0 && row < tokens ? row : tokens - 1,
    };
};

export default function AttentionVisualizer() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => readInitial(searchParams));
    const [sentenceId, setSentenceId] = useState(initial.sentenceId);
    const [causal, setCausal] = useState(initial.causal);
    const [focusRow, setFocusRow] = useState(initial.focusRow);

    const sentence = getSentence(sentenceId);
    const safeRow = Math.min(focusRow, sentence.tokens.length - 1);

    const built = useMemo(() => {
        try {
            return {
                trace: buildAttentionTrace({ sentenceId, causal, focusRow: safeRow }),
            };
        } catch (error) {
            return { error: error.message };
        }
    }, [sentenceId, causal, safeRow]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Sentence</span>
                <select value={sentenceId} onChange={(event) => setSentenceId(event.target.value)}>
                    {SENTENCES.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.tokens.join(' ')}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Query token</span>
                <select
                    value={String(safeRow)}
                    onChange={(event) => setFocusRow(Number(event.target.value))}
                >
                    {sentence.tokens.map((token, index) => (
                        <option key={token + index} value={String(index)}>
                            {token}
                        </option>
                    ))}
                </select>
            </label>
            <label className="control">
                <span className="control-label">Causal mask</span>
                <select
                    value={causal ? '1' : '0'}
                    onChange={(event) => setCausal(event.target.value === '1')}
                >
                    <option value="0">off (encoder)</option>
                    <option value="1">on (decoder)</option>
                </select>
            </label>
            <p className="control-note">{sentence.note}</p>
        </>
    );

    return (
        <TraceInstrument
            trace={built.trace}
            error={built.error}
            sources={SOURCES}
            listLabel="One head, start to finish"
            controls={controls}
            renderStage={(ctx) => <AttentionStage {...ctx} />}
            urlParams={{ s2: sentenceId, q: safeRow, mask: causal ? 1 : 0 }}
            playIntervalMs={3400}
        />
    );
}
