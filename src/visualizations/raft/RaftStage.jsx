import GraphStage from '../stages/GraphStage';
import MatrixStage from '../stages/MatrixStage';

// The cluster as a ring — role, term, and partition side per server, with
// the messages of the current frame drawn as arrows — over a log table whose
// cells are entry terms. Both read a recorded frame; nothing is simulated
// here.

const ROLE_TONE = { leader: 'cobalt', candidate: 'gold', follower: 'faint' };
const MESSAGE_TONE = {
    'vote-req': 'gold',
    'vote-ok': 'green',
    'vote-no': 'vermilion',
    heartbeat: 'cobalt',
    'append-ok': 'green',
    'append-no': 'vermilion',
};

export default function RaftStage({ steps, stepIndex, artifacts, streamIndex }) {
    const step = steps[stepIndex];
    const { frames, quorum } = artifacts;
    const base = step.data?.frame ?? 0;
    const index = step.stream
        ? Math.min(
              (step.data?.eventBase ?? 0) +
                  base +
                  Math.min(streamIndex, step.stream.events.length - 1),
              frames.length - 1
          )
        : Math.min(base, frames.length - 1);
    const frame = frames[index];
    const split = new Set(frame.nodes.map((node) => node.partition)).size > 1;

    const nodes = frame.nodes.map((node, i) => {
        const angle = (2 * Math.PI * i) / frame.nodes.length - Math.PI / 2;
        return {
            id: node.id,
            // Under partition the two sides pull apart horizontally, so the
            // split is visible rather than merely stated.
            x: 0.5 + 0.34 * Math.cos(angle) + (split ? (node.partition === 'A' ? -0.14 : 0.14) : 0),
            y: 0.5 + 0.36 * Math.sin(angle),
            label: node.id,
            sub: `t${node.term}`,
            caption: `${node.role}${node.commitIndex ? ` · ${node.commitIndex} committed` : ''}`,
            tone: ROLE_TONE[node.role],
            ring: node.role === 'leader',
            r: node.role === 'leader' ? 26 : 21,
        };
    });

    const edges = (frame.messages ?? []).map((message) => ({
        from: message.from,
        to: message.to,
        tone: MESSAGE_TONE[message.kind] ?? 'faint',
        label: message.kind,
        width: 1.6,
        curve: 0.25,
        dashed: message.kind.endsWith('-no'),
    }));

    // Log table: one row per server, one column per log position, cell = term.
    const width = Math.max(1, ...frame.nodes.map((node) => node.log.length));
    const values = frame.nodes.map((node) =>
        Array.from({ length: width }, (_, i) => (i < node.log.length ? node.log[i].term : 0))
    );
    const commands = frame.nodes.reduce((best, node) => (node.log.length > best.length ? node.log : best), []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <GraphStage
                nodes={nodes}
                edges={edges}
                notes={[frame.note, split ? 'network partitioned' : `majority = ${quorum}`]}
                ariaLabel={`Raft cluster: ${frame.note}`}
            />
            <MatrixStage
                values={values}
                rowLabels={frame.nodes.map(
                    (node) => `${node.id} (${node.commitIndex} committed)`
                )}
                colLabels={commands.map((entry, i) => `${i + 1}: ${entry.command}`)}
                max={Math.max(1, ...values.flat())}
                format={(value) => (value === 0 ? '—' : `t${value}`)}
                tone="cobalt"
                caption="Logs — each cell is the term the entry was created in"
                footer="An entry is committed once a majority holds it and it was created in the leader's own term."
                ariaLabel="Per-server Raft logs."
            />
        </div>
    );
}
