import BayesVisualizer from '../visualizations/bayes/BayesVisualizer';

export default function BayesPage() {
    return (
        <div className="content">
            <div className="eyebrow">Statistics &amp; Probability · 1763 · Bayes &amp; Laplace</div>
            <h1 className="page-title">Bayes&rsquo; Rule</h1>
            <p className="page-sub" style={{ maxWidth: '620px', marginTop: '12px' }}>
                A population of 1,000 people, a screening test, and one question: when the
                test says <em>positive</em>, what are the odds it&rsquo;s right? Drag the
                sliders, step through the update, and watch the base rate do the heavy
                lifting. Every step cites its source.
            </p>
            <div style={{ marginTop: '32px' }}>
                <BayesVisualizer />
            </div>
        </div>
    );
}
