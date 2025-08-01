import React from 'react';
import './formbuilder.css';

const ToggleSwitch = ({ checked, onChange, id, disabled = false }) => {
  return (
    <label className="toggle-switch">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        id={id}
        disabled={disabled}
      />
      <span className="toggle-slider" />
    </label>
  );
};

export default ToggleSwitch;