import React from 'react';
import '../styles/LoadingSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="loading-container" aria-live="polite">
      <div className="spinner" aria-label="Loading" />
      <p>Loading...</p>
    </div>
  );
};

export default LoadingSpinner;
