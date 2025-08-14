import React from "react";
import { motion } from "framer-motion";

const FormCard = ({ form }) => {
  // Find the active version
  const activeVersion = form.Active_Version__c !== 'None' ? form.FormVersions?.find(
    v => v.Version__c === form.Active_Version__c.replace("V", "") 
  ): form.FormVersions[0]; 
  if (!activeVersion) return null;

  return (
    <motion.div
      className="bg-white rounded-lg shadow-md p-4 mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className="font-bold text-lg mb-1">{activeVersion.Name}</div>
      <div className="text-blue-600 font-semibold mb-2">Version: {activeVersion.Version__c}</div>
      <div className="text-gray-700 mb-1">Status: {form.Status__c}</div>
      <div className="text-gray-500 mb-1">Last Modified: {new Date(form.LastModifiedDate).toLocaleString()}</div>
      <div className="text-gray-500 mb-1">Publish Link: <a href={form.Publish_Link__c} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{form.Publish_Link__c}</a></div>
      <div className="text-gray-500 mb-1">Submission Count: {activeVersion.Submission_Count__c}</div>
      <div className="text-gray-500 mb-1">Stage: {activeVersion.Stage__c}</div>
      <div className="text-gray-500 mb-1">Version Name: {activeVersion.Name}</div>
      <div className="text-gray-500 mb-1">Description: {activeVersion.Description__c || "No description"}</div>
    </motion.div>
  );
};

export default FormCard;