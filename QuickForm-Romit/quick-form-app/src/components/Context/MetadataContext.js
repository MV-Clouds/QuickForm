import React, { createContext, useContext, useState, useEffect } from 'react';

export const MetadataContext = createContext();

export const SalesforceDataProvider = ({ children }) => {
  const [metadata, setMetadata] = useState([]);
  const [formRecords, setFormRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSalesforceData = async (userId, instanceUrl) => {
    if (!userId || !instanceUrl) {
      setError('Missing userId or instanceUrl');
      return;
    }

    try {
      setIsLoading(true);
      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
      const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, instanceUrl: cleanedInstanceUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }

      const data = await response.json();
      const parsedMetadata = JSON.parse(data.metadata || '[]');
      const parsedFormRecords = JSON.parse(data.FormRecords || '[]');

      setMetadata(parsedMetadata);
      setFormRecords(parsedFormRecords);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

   const refreshData = async () => {
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    if (userId && instanceUrl) {
      fetchSalesforceData(userId, instanceUrl);
    }
  };

  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    if (userId && instanceUrl) {
      fetchSalesforceData(userId, instanceUrl);
    }
  }, []);

  return (
    <MetadataContext.Provider
      value={{
        metadata,
        formRecords,
        isLoading,
        error,
        refreshData,
        fetchSalesforceData, // Expose fetchSalesforceData
      }}
    >
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