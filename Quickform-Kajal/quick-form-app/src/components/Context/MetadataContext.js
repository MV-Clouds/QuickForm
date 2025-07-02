import React, { createContext, useContext, useState, useEffect } from 'react';

export const MetadataContext = createContext();

export const SalesforceDataProvider = ({ children }) => {
  const [metadata, setMetadata] = useState([]);
  const [formRecords, setFormRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    
    if (userId && instanceUrl) {
      try {
        setIsLoading(true);
        const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
        const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, instanceUrl: cleanedInstanceUrl }),
        });

        const data = await response.json();
        setMetadata(JSON.parse(data.metadata || '[]'));
        setFormRecords(JSON.parse(data.FormRecords || '[]'));
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Fetch data automatically when provider mounts
  useEffect(() => {
    fetchData();
  }, []); 

  // Add refresh capability
  const refreshData = async () => {
    await fetchData();
  };

  return (
    <MetadataContext.Provider value={{
      metadata,
      formRecords,
      isLoading,
      error,
      refreshData,
    }}>
      {children}
    </MetadataContext.Provider>
  );
};

export const useSalesforceData = () => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('useSalesforceData must be used within a SalesforceDataProvider');
  }
  return context;
};