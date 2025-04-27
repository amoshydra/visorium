import { Text } from "@react-three/drei";

export interface MediaMessageProps {
  title?: string;
  message?: string;
}
export const MediaMessage = (props: MediaMessageProps) => {
  return (
    <mesh scale={0.1} position={[0, 0.25, 0]}>
      {props.title && <Text fontSize={1}>{props.title}</Text>}
      {props.message && (
        <Text position={[0, -1, 0]} fontSize={0.4}>
          {props.message}
        </Text>
      )}
    </mesh>
  );
};
