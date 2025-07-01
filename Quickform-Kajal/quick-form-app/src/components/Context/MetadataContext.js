import React, { createContext, useContext, useState, useEffect } from 'react';

export const MetadataContext = createContext();

// export const SalesforceDataProvider = ({ children }) => {

//   const [metadata, setMetadata] = useState([]); // Stores all Salesforce objects
//   const [formRecords, setFormRecords] = useState([]); // Stores form records
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);

//   // Fetch both metadata and form records
//   const fetchSalesforceData = async (userId, instanceUrl) => {
//     try {
//       setIsLoading(true);
//       setError(null);
      
//       const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
//       const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ userId, instanceUrl: cleanedInstanceUrl }),
//       });

//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Failed to fetch data');

//       // Parse the metadata (Salesforce objects)
//       let parsedMetadata = [];
//       try {
//         parsedMetadata = JSON.parse(data.metadata || '[]');
//       } catch (e) {
//         console.error('Error parsing metadata:', e);
//       }

//       // Parse the form records
//       let parsedFormRecords = [];
//       try {
//         parsedFormRecords = JSON.parse(data.FormRecords || '[]');
//       } catch (e) {
//         console.error('Error parsing FormRecords:', e);
//       }

//       setMetadata(parsedMetadata);
//       setFormRecords(parsedFormRecords);
      
//       console.log('parsedMetadata==> ',parsedMetadata);
      
//       return {
//         metadata: parsedMetadata,
//         formRecords: parsedFormRecords
//       };

//     } catch (err) {
//       setError(err.message);
//       throw err;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <MetadataContext.Provider value={{
//       metadata,
//       formRecords,
//       isLoading,
//       error,
//       fetchSalesforceData,
//       setFormRecords // Allow updating form records if needed
//     }}>
//       {children}
//     </MetadataContext.Provider>
//   );
// };

// export const useSalesforceData = () => {
//   const context = useContext(MetadataContext);
//   if (!context) {
//     throw new Error('useSalesforceData must be used within a SalesforceDataProvider');
//   }
//   return context;
// };

export const SalesforceDataProvider = ({ children }) => {
  const [metadata, setMetadata] = useState([]);
  const [formRecords, setFormRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data automatically when provider mounts
  useEffect(() => {
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

    fetchData();
  }, []); 

  return (
    <MetadataContext.Provider value={{
      metadata,
      formRecords,
      isLoading,
      error,
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