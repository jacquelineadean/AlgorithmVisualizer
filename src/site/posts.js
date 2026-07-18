// Blog content as plain data for Phase 1; the roadmap moves this to MDX in
// Phase 2. Each paragraph is a string; headings use {h: '...'}.

export const POSTS = [
    {
        slug: 'nothing-renders-without-a-source',
        title: 'Nothing renders without a source',
        date: '2026-07-18',
        readingMinutes: 4,
        summary:
            'Why every step in these visualizations carries a citation — and how an evidence-based reconstruction project inspired the architecture.',
        body: [
            'Most algorithm animations ask you to trust them. They show bars swapping or nodes lighting up, and the connection back to the actual algorithm — the paper that introduced it, the theorem that makes it correct, the standard that governs how it is deployed today — is left as an exercise.',
            'This project borrows a stricter rule from Tekton, an evidence-based 3D reconstruction of historic architecture where nothing renders without a cited source, and every dimension carries a provenance class: measured, rule-derived, reconstructed, or conjecture.',
            { h: 'Provenance classes for algorithms' },
            'Translated to algorithms, the provenance classes become: paper (taken directly from the primary source), theorem (the mathematical bedrock), modern practice (how standards bodies say it is done today), and pedagogical (a simplification made for teaching, always labeled).',
            'The RSA visualization is the first to ship under this rule. Key generation follows the 1978 Rivest–Shamir–Adleman paper, down to a detail most explainers miss: the paper computes the private exponent with Euclid’s algorithm against Euler’s totient, while modern practice (RFC 8017) uses the Carmichael function. The visualization shows the paper’s route and labels the modern difference.',
            'The toy parameters are labeled too. Encrypting character-by-character under a modulus this small is flagrantly insecure, and the visualization says so on the step where it matters, citing the key-size and padding recommendations real deployments follow.',
            { h: 'Enforced by tests' },
            'The rule is not a style guide; it is a test. Every step a visualization emits must resolve at least one citation in its sources file, or the suite fails. Tekton fails its build when geometry verification fails; we fail ours when evidence is missing.',
            'One algorithm is live today. The roadmap adds Diffie–Hellman, sorting, statistics, machine learning, and distributed consensus — each under the same rule.',
        ],
    },
];

export const getPost = (slug) => POSTS.find((post) => post.slug === slug);
