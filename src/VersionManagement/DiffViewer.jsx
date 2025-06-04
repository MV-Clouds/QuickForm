'use client'

import React from 'react';
import './DiffViewer.css'; // Make sure to create this CSS file

const DiffViewer = ({ versions, mode, onModeChange }) => {
  if (versions.length === 0) {
    return (
      <div className="diff-viewer empty">
        <p>Select versions to compare</p>
      </div>
    );
  }

  // Prevent comparing same versions
  if (versions.length === 2 && versions[0].id === versions[1].id) {
    return (
      <div className="diff-viewer empty">
        <p>Cannot compare the same version</p>
      </div>
    );
  }

  // const delta = diff(
  //   versions.length > 1 ? JSON.parse(versions[1].json) : {},
  //   JSON.parse(versions[0].json)
  // );

  const getFieldStatus = (field, oldFields, newFields) => {
    if (!oldFields) return 'added';
    if (!newFields) return 'removed';
    
    const oldField = oldFields.find(f => f.label === field.label);
    const newField = newFields.find(f => f.label === field.label);
    
    if (!oldField) return 'added';
    if (!newField) return 'removed';
    if (JSON.stringify(oldField) !== JSON.stringify(newField)) return 'modified';
    return 'unchanged';
  };

  const renderFormFields = (jsonData, isChanged = false, compareData = null) => {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    const compareFields = compareData ? JSON.parse(compareData).fields : null;
    
    return (
      <div className={`form-preview ${isChanged ? 'changed' : ''}`}>
        <h2 className="form-title">{data.title}</h2>
        <div className="form-fields">
          {data.fields?.map((field, index) => {
            const status = compareData ? getFieldStatus(field, compareFields, data.fields) : 'unchanged';
            console.log(status)
            return (
              <div key={index} className={`form-field ${status}`}>
                <label>{field.label}</label>
                <input type={field.type} value={field.label} disabled/>
                {/* Add more field types as needed */}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Determine which version is newer for proper comparison
  const newerVersion = versions.length > 1 ? versions[0] : versions[0];
  const olderVersion = versions.length > 1 ? versions[1] : null;

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <h3>
          Comparing {versions.length > 1 ? `${olderVersion.id} ↔ ` : ''}{newerVersion.id}
        </h3>
        <div className="diff-mode-selector">
          <button
            className={`mode-btn ${mode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => onModeChange('side-by-side')}
          >
            Side-by-side
          </button>
          <button
            className={`mode-btn ${mode === 'unified' ? 'active' : ''}`}
            onClick={() => onModeChange('unified')}
          >
            Unified
          </button>
        </div>
      </div>
      
      <div className={`diff-content ${mode}`}>
        {mode === 'side-by-side' ? (
          <div className="side-by-side-container">
            <div className="version-pane">
              <h4>Version {olderVersion?.id || 'Base'}</h4>
              {renderFormFields(
                olderVersion?.json || {},
                false,
                newerVersion.json
              )}
            </div>
            <div className="version-pane">
              <h4>Version {newerVersion.id}</h4>
              {renderFormFields(
                newerVersion.json,
                false,
                olderVersion?.json
              )}
            </div>
          </div>
        ) : (
          <div className="unified-container">
            {renderFormFields(
              newerVersion.json,
              true,
              olderVersion?.json
            )}
          </div>
        )}
      </div>
      
      <div className="diff-actions">
        <button 
          className="revert-btn"
          onClick={() => console.log('Reverting to', newerVersion.id)}
        >
          Revert to {newerVersion.id}
        </button>
        <button 
          className="copy-btn"
          onClick={() => navigator.clipboard.writeText(newerVersion.json)}
        >
          Copy JSON
        </button>
      </div>
    </div>
  );
};

export default DiffViewer;