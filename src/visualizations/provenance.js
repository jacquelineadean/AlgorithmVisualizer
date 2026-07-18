// Provenance classes shared by every visualization, adapted from Tekton's
// measured / rule-derived / reconstruction / conjecture evidence layers.
//   paper        — taken directly from the primary source
//   theorem      — the mathematical bedrock the step rests on
//   modern       — how standards bodies / current practice refine the paper
//   pedagogical  — a simplification made for teaching, always labeled

export const PROVENANCE = {
    paper: {
        label: 'From the paper',
        description: 'Follows the primary source directly.',
    },
    theorem: {
        label: 'Theorem',
        description: 'Rests on a proved mathematical result.',
    },
    modern: {
        label: 'Modern practice',
        description: 'Reflects current standards, which refine the paper.',
    },
    pedagogical: {
        label: 'Teaching simplification',
        description: 'Simplified for the visualization; real deployments differ.',
    },
};
