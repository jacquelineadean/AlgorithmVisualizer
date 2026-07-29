import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CONFIGS, getConfig } from './model';
import { buildTransformerMap } from './map';
import { SOURCES } from './sources';
import DrilldownInstrument from '../drilldown/DrilldownInstrument';
import { STAGE_KINDS } from './stages';

const readInitial = (sp) =>
    CONFIGS.some((config) => config.id === sp.get('config')) ? sp.get('config') : 'gpt2-small';

export default function TransformerVisualizer() {
    const [searchParams] = useSearchParams();
    const [configId, setConfigId] = useState(() => readInitial(searchParams));

    const built = useMemo(() => {
        try {
            return { map: buildTransformerMap({ configId }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [configId]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Configuration</span>
                <select value={configId} onChange={(event) => setConfigId(event.target.value)}>
                    {CONFIGS.map((config) => (
                        <option key={config.id} value={config.id}>
                            {config.label}
                        </option>
                    ))}
                </select>
            </label>
            <p className="control-note">
                {getConfig(configId).note} Every metric below is computed from this
                configuration, not quoted.
            </p>
        </>
    );

    return (
        <DrilldownInstrument
            map={built.map}
            error={built.error}
            sources={SOURCES}
            controls={controls}
            stageKinds={STAGE_KINDS}
            urlParams={{ config: configId }}
            ariaLabel="Transformer architecture map"
        />
    );
}
