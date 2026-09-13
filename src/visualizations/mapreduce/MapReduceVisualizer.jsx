import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { JOBS, getJob } from './model';
import { buildMapReduceMap } from './map';
import { SOURCES } from './sources';
import DrilldownInstrument from '../drilldown/DrilldownInstrument';

const readInitial = (sp) => (JOBS.some((job) => job.id === sp.get('job')) ? sp.get('job') : 'wordcount');

export default function MapReduceVisualizer() {
    const [searchParams] = useSearchParams();
    const [jobId, setJobId] = useState(() => readInitial(searchParams));

    const built = useMemo(() => {
        try {
            return { map: buildMapReduceMap({ jobId }) };
        } catch (error) {
            return { error: error.message };
        }
    }, [jobId]);

    const controls = (
        <>
            <label className="control">
                <span className="control-label">Job</span>
                <select value={jobId} onChange={(event) => setJobId(event.target.value)}>
                    {JOBS.map((job) => (
                        <option key={job.id} value={job.id}>
                            {job.label}
                        </option>
                    ))}
                </select>
            </label>
            <p className="control-note">{getJob(jobId).note}</p>
        </>
    );

    return (
        <DrilldownInstrument
            map={built.map}
            error={built.error}
            sources={SOURCES}
            controls={controls}
            urlParams={{ job: jobId }}
            ariaLabel="MapReduce job map"
        />
    );
}
