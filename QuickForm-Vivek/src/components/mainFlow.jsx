import { useState } from 'react';
import { FlowProvider } from '@/components/context/FlowContext';
import FlowCanvasWrapper from '@/components/Mapping/Canvas/FlowCanvas';
import Toolbox from '@/components/Mapping/Sidebar/Toolbox';
import UpsertModal from '@/components/Mapping/Modals/UpsertModal';
import FindNodeModal from '@/components/Mapping/Modals/FindNodeModal';
import FormatterModal from '@/components/Mapping/Modals/FormatterModal';
import WorkflowHeader from '@/components/Mapping/Canvas/WorkflowHeader';
import SaveWorkflowModal from '@/components/Mapping/Modals/SaveWorkflowModal';
import LoopModal from './Mapping/Modals/LoopModal';
import PathModal from './Mapping/Modals/PathModal';
export default function App() {
  const [activeModal, setActiveModal] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const closeModal = () => {
    setActiveModal(null);
    setSelectedNodeId(null);
  };
  const handleRunFlow = async () => {
    // Implement your flow execution logic here
    console.log('Running flow...');
    // Example: await executeFlow(nodes, edges);
    // You can use the executeFlow function from your useFlow hook
  };
  const handleNodeClick = (event, node) => {
    event.stopPropagation();
    setSelectedNodeId(node.id);
    setActiveModal(node.data.type);
  };

  const renderActiveModal = () => {
    if (!activeModal || !selectedNodeId) return null;

    const modalProps = {
      isOpen: true,
      onClose: closeModal,
      nodeId: selectedNodeId,
      onSave: () => {closeModal();},
    };

    switch (activeModal) {
      case 'upsert':
        return <UpsertModal {...modalProps} />;
      case 'findNode':
        return <FindNodeModal {...modalProps} />;
      case 'formatter':
        return <FormatterModal {...modalProps} />;
      case 'loop':
        return <LoopModal {...modalProps} local />;
      case 'path':
        return <PathModal {...modalProps} />;
      default:
        return null;
    }
  };

  return (
    <FlowProvider>
      <div className="flex h-screen bg-gray-100">
        <Toolbox />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <WorkflowHeader onSave={() => setIsSaveModalOpen(true)}  handleRunFlow={handleRunFlow}/>
          
          <main className="flex-1 overflow-hidden">
            <FlowCanvasWrapper 
              onNodeClick={handleNodeClick}
            />
          </main>
        </div>
      </div>

      {renderActiveModal()}

      <SaveWorkflowModal 
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />
    </FlowProvider>
  );
}