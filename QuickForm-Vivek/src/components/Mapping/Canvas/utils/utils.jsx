// src/utils.js
export function getNodeDescription(type) {
  const descriptions = {
    upsert: 'Create or update records in Salesforce',
    findNode: 'Query records from Salesforce',
    formatter: 'Transform field values',
    filter: 'Filter records based on conditions',
    condition: 'Branch your flow based on conditions',
    delay: 'Pause the flow for a specified time',
    path: 'Split your flow into different paths',
    loop: 'Iterate over a collection of records'
  };
  return descriptions[type] || '';
}

export function getNodeLabel(type) {
  const labels = {
    upsert: 'Upsert Records',
    findNode: 'Find Records',
    formatter: 'Format Data',
    filter: 'Filter Records',
    condition: 'Condition',
    delay: 'Delay',
    path: 'Path',
    loop: 'Loop'
  };
  return labels[type] || type;
}
// src/utils.js
export function getNodeColor(type) {
  const colors = {
    upsert: 'bg-green-50 hover:bg-green-100 border-green-200',
    findNode: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    formatter: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    filter: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    condition: 'bg-red-50 hover:bg-red-100 border-red-200',
    delay: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    path: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    loop: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    default: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
  };
  
  return colors[type] || colors.default;
}