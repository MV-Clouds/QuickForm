export const handler = async (event) => {
  // Parse the request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  const { userId, instanceUrl, objectName, access_token } = body;

  if (!userId || !instanceUrl || !objectName || !access_token) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Missing required parameters: userId, instanceUrl, objectName, or access_token' }),
    };
  }


  try {

    // Fetch fields from Salesforce
    const response = await fetch(`https://${instanceUrl}/services/data/v60.0/sobjects/${objectName}/describe`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });


    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch fields for ${objectName}`);
    }

    const data = await response.json();
    const rawFields = data.fields || [];

    // Filter and transform fields
    const fields = rawFields
      .filter(field => {
        const excludedFields = [
          'isDeleted',
          'CreatedById',
          'CreatedDate',
          'LastModifiedById',
          'LastModifiedDate',
          'SystemModstamp',
          'LastActivityDate',
          'LastViewedDate',
          'LastReferencedDate',
          'OwnerId',
          'RecordTypeId',
        ];

        const isExcluded = excludedFields.includes(field.name);

        const isWritable = field.updateable;

        const isNotCalculated = !field.calculated;
        const isNotAutoNumber = !field.autoNumber;


        return isWritable && isNotCalculated && isNotAutoNumber && !isExcluded;
      })
      .map(field => ({
        name: field.name,
        label: field.label,
        type: field.type, // Include the field type (e.g., string, boolean, reference)
        referenceTo: field.referenceTo || [], // For relationship fields
        required: !field.nillable && !field.defaultedOnCreate,
        values: ['picklist', 'multipicklist'].includes(field.type)
        ? field.picklistValues
            .filter(v => !v.active || v.defaultValue !== undefined) // optional: filter inactive if needed
            .map(v => v.value)
        : undefined,
      }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ fields }),
    };
  } catch (error) {
    console.error(`Error fetching fields for ${objectName}:`, error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: `Failed to fetch fields: ${error}` }),
    };
  }
};