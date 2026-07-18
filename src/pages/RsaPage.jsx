import RsaVisualizer from '../visualizations/rsa/RsaVisualizer';

export default function RsaPage() {
    return (
        <div className="content">
            <div className="eyebrow">Cryptography · 1978 · Rivest, Shamir &amp; Adleman</div>
            <h1 className="page-title">RSA Encryption</h1>
            <p className="page-sub" style={{ maxWidth: '620px', marginTop: '12px' }}>
                Type a message, pick two primes, and step through the whole protocol —
                key generation, encryption, decryption, and the theorem that makes it
                work. Every step cites its source; simplifications are labeled.
            </p>
            <div style={{ marginTop: '32px' }}>
                <RsaVisualizer />
            </div>
        </div>
    );
}
