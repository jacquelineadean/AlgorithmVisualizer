import { useMemo, useState } from 'react';
import { Line } from '@react-three/drei';
import Scene3D from '../scene3d/Scene3D';
import { helixGeometry } from '../scene3d/helix';
import './RsaHelixScene.css';

// The mod-n helix (Phase 3): the current square-and-multiply table drawn
// as clock arithmetic on a spiral. Loaded lazily — this module owns the
// three.js dependency. Colors carry provenance when the overlay is on:
//   cobalt     = paper       (the square-and-multiply hops, RSA78 §VII / Knuth §4.6.3)
//   vermilion  = pedagogical (the clock ring itself — a rendering device)

const APPEARANCE = {
    ring: '#c9c5ba',
    hop: '#2647c9',
    point: '#1c1b18',
    result: '#35916a',
};
const PROVENANCE_COLORS = {
    ring: '#dd5533',
    hop: '#2647c9',
    point: '#2647c9',
    result: '#2647c9',
};

function Helix({ rows, mod, overlay }) {
    const { points, ring } = useMemo(
        () => helixGeometry({ rows, mod }),
        [rows, mod]
    );
    const palette = overlay ? PROVENANCE_COLORS : APPEARANCE;

    return (
        <group>
            <Line points={ring} color={palette.ring} lineWidth={1.4} dashed dashSize={0.12} gapSize={0.08} />
            {points.map((point, i) => (
                <group key={i}>
                    {i > 0 && (
                        <Line
                            points={[
                                [points[i - 1].x, points[i - 1].y, points[i - 1].z],
                                [point.x, point.y, point.z],
                            ]}
                            color={palette.hop}
                            lineWidth={2.2}
                        />
                    )}
                    <mesh position={[point.x, point.y, point.z]}>
                        <sphereGeometry args={[i === points.length - 1 ? 0.13 : 0.09, 20, 20]} />
                        <meshStandardMaterial
                            color={i === points.length - 1 ? palette.result : palette.point}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

export default function RsaHelixScene({ step, artifacts }) {
    const [overlay, setOverlay] = useState(false);
    const focus = step.kind === 'sqmul' ? step.data.focus : null;
    const mod = artifacts.n;

    return (
        <div className="helix-wrap">
            <div className="helix-head">
                <div className="helix-title">
                    {focus
                        ? `Clock arithmetic mod ${mod} — every hop is one square-and-multiply row`
                        : `The mod-${mod} clock — advance to an encryption or decryption step to see the hops`}
                </div>
                <button
                    type="button"
                    className="pill-button secondary helix-toggle"
                    onClick={() => setOverlay((prev) => !prev)}
                >
                    {overlay ? 'Appearance' : 'Provenance overlay'}
                </button>
            </div>
            <Scene3D>
                <Helix rows={focus ? focus.rows : []} mod={mod} overlay={overlay} />
            </Scene3D>
            <div className="helix-legend">
                {overlay ? (
                    <>
                        <span className="hl-key">
                            <span className="hl-swatch" style={{ background: '#2647c9' }} /> paper —
                            square-and-multiply values (RSA78, Knuth §4.6.3)
                        </span>
                        <span className="hl-key">
                            <span className="hl-swatch" style={{ background: '#dd5533' }} />{' '}
                            pedagogical — the clock ring is a rendering device
                        </span>
                    </>
                ) : (
                    <>
                        <span className="hl-key">
                            <span className="hl-swatch" style={{ background: '#2647c9' }} /> hop:
                            square (and multiply) mod n
                        </span>
                        <span className="hl-key">
                            <span className="hl-swatch" style={{ background: '#35916a' }} /> final
                            value
                        </span>
                        <span className="hl-key">drag to orbit · scroll to zoom</span>
                    </>
                )}
            </div>
        </div>
    );
}
