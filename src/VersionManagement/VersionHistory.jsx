'use client'
// VersionHistory.jsx
import React from 'react';
import VersionItem from './VersionItem';

const VersionHistory = ({ 
  versions, 
  selectedVersions, 
  onSelect, 
  onRevert, 
  onLockToggle, 
  searchTerm, 
  onSearchChange 
}) => {
  return (
    <div className="version-history">
      <div className="version-search">
        <input
          type="text"
          placeholder="Search versions..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="version-list">
        {versions.map(version => (
          <VersionItem
            key={version.id}
            version={version}
            isSelected={selectedVersions.some(v => v.id === version.id)}
            onSelect={() => onSelect(version)}
            onRevert={() => onRevert(version.id)}
            onLockToggle={() => onLockToggle(version.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default VersionHistory;