// ActionsSection.jsx
export default function ActionsSection() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Actions</h3>
      <div className="space-y-2">
        <div
          className="p-2 bg-white border border-gray-200 rounded cursor-move hover:bg-blue-50"
          draggable
          onDragStart={(event) => onDragStart(event, 'upsert')}
        >
          Upsert
        </div>
        <div
          className="p-2 bg-white border border-gray-200 rounded cursor-move hover:bg-blue-50"
          draggable
          onDragStart={(event) => onDragStart(event, 'findNode')}
        >
          Find Node
        </div>
      </div>
    </div>
  );
}