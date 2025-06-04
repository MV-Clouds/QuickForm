'use client'
// VersionControl.jsx
import React, { useState } from 'react';
import VersionHistory from './VersionHistory';
import DiffViewer from './DiffViewer';
import './styles.css';

const VersionControl = ({ formId }) => {
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [diffMode, setDiffMode] = useState('side-by-side');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - in a real app, this would come from an API
  const versions = [
    {
      id: 'v5.2',
      timestamp: '2025-05-26T15:45:00Z',
      author: 'Jane Doe',
      summary: 'Added payment section',
      tags: ['Approved'],
      locked: true,
      json: '{"title":"Payment Form","fields":[{"type":"text","label":"Name"},{"type":"payment","label":"Card"}]}'
    },
    {
      id: 'v5.1',
      timestamp: '2025-05-25T10:30:00Z',
      author: 'John Smith',
      summary: 'Updated validation rules',
      tags: ['Draft'],
      locked: false,
      json: '{"title":"Payment Form","fields":[{"type":"text","label":"Name"}]}'
    },
    // More versions...
  ];

  const handleVersionSelect = (version) => {
    if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, version]);
    } else {
      setSelectedVersions([selectedVersions[1], version]);
    }
  };

  const handleRevert = (versionId) => {
    if (window.confirm(`Revert to version ${versionId}? This cannot be undone.`)) {
      // API call to revert would go here
      console.log(`Reverting to ${versionId}`);
    }
  };

  const handleLockToggle = (versionId) => {
    // API call to toggle lock would go here
    console.log(`Toggling lock for ${versionId}`);
  };

  const filteredVersions = versions.filter(version => 
    version.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    version.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    version.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="version-control-container">
      <VersionHistory
        versions={filteredVersions}
        selectedVersions={selectedVersions}
        onSelect={handleVersionSelect}
        onRevert={handleRevert}
        onLockToggle={handleLockToggle}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
      <DiffViewer
        versions={selectedVersions}
        mode={diffMode}
        onModeChange={setDiffMode}
      />
    </div>
  );
};

export default VersionControl;