'use client'
// VersionItem.jsx
import React from 'react';

const VersionItem = ({ version, isSelected, onSelect, onRevert, onLockToggle }) => {
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className={`version-item ${isSelected ? 'selected' : ''}`}>
      <div className="version-header" onClick={onSelect}>
        <span className="version-id">{version.id}</span>
        <span className="version-date">{formatDate(version.timestamp)}</span>
        {version.locked && <span className="lock-icon" title="Locked">🔒</span>}
      </div>
      <div className="version-author">{version.author}</div>
      <div className="version-summary">{version.summary}</div>
      <div className="version-tags">
        {version.tags.map(tag => (
          <span key={tag} className={`tag ${tag.toLowerCase()}`}>{tag}</span>
        ))}
      </div>
      <div className="version-actions">
        <button onClick={onSelect}>Compare</button>
        <button onClick={onRevert}>Revert</button>
        <button onClick={onLockToggle}>
          {version.locked ? 'Unlock' : 'Lock'}
        </button>
      </div>
    </div>
  );
};

export default VersionItem;