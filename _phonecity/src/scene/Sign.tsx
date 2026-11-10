import { labelTexture } from './textures';

/** 항상 카메라를 향하고 거리와 무관하게 같은 화면 크기로 보이는 이름표 */
export function Sign({ text, bg, fg, position, height = 0.034 }: { text: string; bg: string; fg: string; position: [number, number, number]; height?: number }) {
  const { texture, aspect } = labelTexture(text, bg, fg);
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} sizeAttenuation={false} />
    </sprite>
  );
}
