import React, { useState, useEffect } from 'react';
import { Columns } from './columns';
import DataTable from './Datatable';
import QuickFormLoading from './QuickFormLoading'
const mapApiToTableData = (apiData) => {
  if (!Array.isArray(apiData)){
    console.log('not an array');
    return [];
  };
  console.log(apiData);
  return apiData.map((item, idx) => ({
    id: item.Id || item.id || `row-${idx}`,
    srNo: idx + 1,
    formName: item.FormVersions[0].Name || 'Untitled Form',
    activeVersion: item.Active_Version__c || 'V1',
    submissionCount: item.FormVersions[0].Submission_Count__c,
    status: item.FormVersions.filter(val => val.Stage__c === 'Publish').length > 0 ? 'Active' : 'Inactive' ,
    lastmodDate : new Date(item.LastModifiedDate).toLocaleDateString(),
    fields : item.FormVersions[0].Fields
  }));
};

const ShowPage = ({forms , handleEditForm ,handleCreateForm,  isLoading ,handleDeleteForm }) => {
  // const [data, setData] = useState([]);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     setLoading(true);
  //     try {
  //       const result = await fetchFormData();
  //       // console.log(result.FormRecords)
  //       if (result && result.FormRecords) {
  //         const records = Array.isArray(result.FormRecords)
  //           ? result.FormRecords
  //           : result.FormRecords
  //             ? [result.FormRecords]
  //             : [];
  //         setData(mapApiToTableData(JSON.parse(result.FormRecords)));
  //       } else {
  //         setData([]); // Ensure data is always an array
  //       }
  //       console.log('Data loaded:', JSON.parse(result.FormRecords).map(item => item));
  //     } catch (error) {
  //       console.error('Error loading data:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);


  if (isLoading) {
    return (
      <div className="">
        <QuickFormLoading />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={Columns({forms,handleEditForm , handleDeleteForm})} forms = {forms} data={mapApiToTableData(forms)} handleCreateForm={handleCreateForm} handleEditForm={handleEditForm} />
    </div>
  );
};

export default ShowPage;