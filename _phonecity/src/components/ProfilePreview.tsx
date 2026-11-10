import { Canvas } from '@react-three/fiber';
import { AvatarModel } from '../scene/AvatarModel';
import type { Look } from '../data/profile';
export default function ProfilePreview({ look }: { look: Look }) {
  return <Canvas flat dpr={[1, 1.25]} camera={{ position: [0, 1.05, 3.1], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0.82, 0)}>
    <hemisphereLight args={['#ffffff', '#cfdcbf', 1.7]} />
    <directionalLight position={[2, 4, 3]} intensity={1.1} />
    <AvatarModel look={look} preview />
    <mesh rotation-x={-Math.PI / 2} position-y={-0.01}><circleGeometry args={[0.7, 32]} /><meshLambertMaterial color="#dfe9d3" /></mesh>
  </Canvas>;
}
