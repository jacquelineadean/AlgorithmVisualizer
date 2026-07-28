import { Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// Phase 3a scene shell: paper-world canvas, soft lighting, orbit camera.
// Imported only from lazy-loaded scene modules so three.js stays out of
// every 2D route's bundle. Scenes render *content* as children; anything
// drawn must derive from trace artifacts (see docs/CONTRACTS.md).

class SceneErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        if (this.state.failed) {
            return (
                <div className="scene3d-fallback">
                    3D rendering is unavailable in this browser — the 2D diagram above
                    tells the same story.
                </div>
            );
        }
        return this.props.children;
    }
}

export default function Scene3D({ children, cameraPosition = [4.6, 3.6, 4.6], height = 380 }) {
    return (
        <SceneErrorBoundary>
            <div className="scene3d-canvas" style={{ height }}>
                <Canvas camera={{ position: cameraPosition, fov: 45 }} dpr={[1, 2]}>
                    <color attach="background" args={['#faf9f5']} />
                    <ambientLight intensity={0.85} />
                    <directionalLight position={[5, 7, 4]} intensity={0.7} />
                    <OrbitControls enableDamping makeDefault />
                    {children}
                </Canvas>
            </div>
        </SceneErrorBoundary>
    );
}
