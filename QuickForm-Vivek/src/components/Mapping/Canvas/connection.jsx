import { getBezierPath } from 'reactflow';

export default function CustomConnection({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Add connection validation styling
  const connectionStyle = {
    ...style,
    stroke: '#94a3b8', // Default slate-400
    strokeWidth: 2,
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={connectionStyle}
        markerEnd={markerEnd}
      />
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={15}
        className="react-flow__edge-interaction"
      />
    </>
  );
};

// Optional: Connection line with arrow marker
export function ConnectionWithArrow(props) {
  return (
    <CustomConnection 
      {...props}
      markerEnd="url(#arrow-closed)"
    />
  );
}