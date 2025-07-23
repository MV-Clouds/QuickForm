export const fetchFormData = async () => {
  try {
    const res = await fetch('https://hmcyy3382m.execute-api.us-east-1.amazonaws.com/fetchMetadata/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '005gL000002qyRxQAI',
        instanceUrl: 'orgfarm-53dd64db2b-dev-ed.develop.my.salesforce.com',
      }),
    });
    if (!res.ok) throw new Error('Failed to fetch form data');
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching form data:', error);
    return null;
  }
};