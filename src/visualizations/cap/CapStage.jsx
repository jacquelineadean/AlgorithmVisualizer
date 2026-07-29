import GraphStage from '../stages/GraphStage';

// Two replicas, two clients, and the link between them — drawn from the
// scenario the trace already resolved. When the link is cut it is drawn cut;
// when a request is refused the arrow is dashed and vermilion.

export default function CapStage({ steps, stepIndex, artifacts }) {
    const step = steps[stepIndex];
    const phase = step.data?.phase ?? 'setup';
    const partitioned = step.data?.partitioned ?? false;
    const state = partitioned ? artifacts.split : artifacts.healthy;
    const decided = phase === 'choice' || phase === 'table';

    const nodes = [
        {
            id: 'writer',
            x: 0.06,
            y: 0.5,
            label: 'W',
            sub: 'write v1',
            tone: 'faint',
            r: 20,
        },
        {
            id: 'A',
            x: 0.38,
            y: 0.5,
            label: 'A',
            sub: decided || !partitioned ? state.a.value : 'v0',
            caption: 'replica',
            tone: state.writeAccepted && (decided || !partitioned) ? 'cobalt' : 'ink',
            ring: state.writeAccepted && (decided || !partitioned),
            r: 26,
        },
        {
            id: 'B',
            x: 0.7,
            y: 0.5,
            label: 'B',
            sub: state.b.value,
            caption: 'replica',
            tone: decided && partitioned && !state.linearizable ? 'vermilion' : 'ink',
            ring: decided && partitioned && !state.linearizable,
            r: 26,
        },
        {
            id: 'reader',
            x: 0.98,
            y: 0.5,
            label: 'R',
            sub: decided || !partitioned ? (state.readAnswered ? state.readValue : 'error') : 'read?',
            tone: 'faint',
            r: 20,
        },
    ];

    const edges = [
        {
            from: 'writer',
            to: 'A',
            label: state.writeAccepted || !decided ? 'write v1' : 'rejected',
            tone: decided && !state.writeAccepted ? 'vermilion' : 'green',
            dashed: decided && !state.writeAccepted,
            width: 1.8,
        },
        {
            from: 'A',
            to: 'B',
            label: partitioned ? '✕ partitioned' : 'replicate',
            tone: partitioned ? 'vermilion' : 'green',
            dashed: partitioned,
            width: 1.8,
        },
        {
            from: 'B',
            to: 'reader',
            label: !decided ? 'read' : state.readAnswered ? `reply ${state.readValue}` : 'error',
            tone:
                decided && !state.readAnswered
                    ? 'vermilion'
                    : decided && !state.linearizable
                      ? 'gold'
                      : 'green',
            dashed: decided && !state.readAnswered,
            width: 1.8,
        },
    ];

    return (
        <GraphStage
            nodes={nodes}
            edges={edges}
            notes={[
                partitioned ? 'network partitioned' : 'network healthy',
                decided || !partitioned
                    ? `${state.linearizable ? 'consistent' : 'stale read'} · ${
                          state.available ? 'available' : 'unavailable'
                      }`
                    : 'outcome undecided',
            ]}
            ariaLabel={state.note}
        />
    );
}
