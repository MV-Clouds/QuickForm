import React, { useState, useEffect } from 'react';
import { Columns } from './columns';
import DataTable from './Datatable';
import QuickFormLoading from './QuickFormLoading'
const mapApiToTableData = (apiData) => {
  if (!Array.isArray(apiData)){
    console.log('not an array');
    return [];
  };
  return apiData.map((item, idx) => ({
    id: item.Id || item.id || `row-${idx}`,
    srNo: idx + 1,
    formName: item.FormVersions[0]?.Name || 'Untitled Form',
    activeVersion: item.Active_Version__c || 'V1',
    submissionCount: item.FormVersions[0]?.Submission_Count__c,
    status: item.Status__c || '',
    lastmodDate : new Date(item.LastModifiedDate).toLocaleDateString(),
    fields : item.FormVersions[0]?.Fields
  }));
};

const ShowPage = ({forms , handleEditForm ,handleCreateForm,  isLoading ,handleDeleteForm ,handleFavoriteForm, handleCloneForm }) => {
  return (
    <div className="container mx-auto py-10">
      <DataTable columns={Columns({forms,handleEditForm , handleDeleteForm , handleFavoriteForm, handleCloneForm})} forms = {forms} data={mapApiToTableData(forms)} handleCreateForm={handleCreateForm} handleEditForm={handleEditForm} handleCloneForm={handleCloneForm} />
    </div>
  );
};

export default ShowPage;