import React, { useState, useEffect } from 'react';
import { columns } from './columns';
import DataTable from './Datatable';
import { fetchFormData } from './formdata';

const mapApiToTableData = (apiData) => {
  if (!Array.isArray(apiData)){
    console.log('not an array');
    return [];
  };
  return apiData.map((item, idx) => ({
    id: item.Id || item.id || `row-${idx}`,
    srNo: idx + 1,
    formName: item.FormVersions[0].Name || 'Untitled Form',
    activeVersion: item.Active_Version__c || 'V1',
    submissionCount: item.FormVersions[0].Submission_Count__c ?? 0,
    status: (item.FormVersions[0].Stage__c || 'draft').toLowerCase(),
  }));
};

const ShowPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await fetchFormData();
        // console.log(result.FormRecords)
        if (result && result.FormRecords) {
          const records = Array.isArray(result.FormRecords)
            ? result.FormRecords
            : result.FormRecords
              ? [result.FormRecords]
              : [];
          setData(mapApiToTableData(JSON.parse(result.FormRecords)));
        } else {
          setData([]); // Ensure data is always an array
        }
        console.log('Data loaded:', JSON.parse(result.FormRecords).map(item => item));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-900">
        <p className="text-lg font-semibold animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default ShowPage;