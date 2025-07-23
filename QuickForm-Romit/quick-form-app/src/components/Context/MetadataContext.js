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
      const fetchStart = Date.now();
      console.log('Metadata Context initialize')
      const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, instanceUrl: cleanedInstanceUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }

      const data = await response.json();
      console.log(`Fetch completed in ${Date.now() - fetchStart}ms`);
      const parsedMetadata = JSON.parse(data.metadata || '[]');
      const parseFormRecords = (formRecordsString) => {
        if (!formRecordsString || formRecordsString === 'null') return [];
        
        try {
          // First attempt direct parse
          const parsed = JSON.parse(formRecordsString);
          return parsed;
        } catch (e) {
          console.error('Initial parse failed, attempting recovery:', e.message);
          
          try {
            // Try fixing common concatenation issues
            const fixed = formRecordsString
              .replace(/\](?=\s*\[)/g, '],') // Add missing comma between arrays
              .replace(/\}(?=\s*\{)/g, '},') // Add missing comma between objects
              .replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas
            
            return JSON.parse(fixed);
          } catch (recoveryError) {
            console.error('Recovery failed:', {
              error: recoveryError.message,
              inputSample: formRecordsString.substring(0, 200) + '...' + formRecordsString.slice(-200),
              length: formRecordsString.length
            });
            return [];
          }
        }
      };

      // Usage:
      const parsedFormRecords = parseFormRecords(data.FormRecords);
      
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

  // useEffect(() => {
  //   const userId = sessionStorage.getItem('userId');
  //   const instanceUrl = sessionStorage.getItem('instanceUrl');
  //   if (userId && instanceUrl) {
  //     fetchSalesforceData(userId, instanceUrl);
  //   }
  // }, []);

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