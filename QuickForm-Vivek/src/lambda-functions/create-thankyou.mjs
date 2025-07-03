export const handler = async (event) => {
  try {
    // Salesforce Instance URL
    console.log(event);
    console.log(event.body, 'body');
    const body = JSON.parse(event.body || '{}');
    const { instanceUrl, userId, ThankYouData } = body;
    const parsedData = JSON.parse(ThankYouData)
    //To fetch the token
    const token = event.headers.Authorization.split(' ')[1];
    //Logs
    console.log('instanceUrl --> ', instanceUrl);
    console.log('userId --> ', userId);
    console.log('token --> ', token);
    console.log('ThankYouData --> ', JSON.stringify(parsedData));
    const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');
    const salesforceBaseUrl = `https://${cleanedInstanceUrl}/services/data/v60.0`;
    console.log('Salesforce first base url --> ' + salesforceBaseUrl);
    const formVersionId = parsedData.Form_Version__c;

    const thankyouquery = `SELECT Id FROM Thank_You__c WHERE Form_Version__c = '${formVersionId}'`;
    const otherThankYouUrl = `${salesforceBaseUrl}/query?q=${encodeURIComponent(thankyouquery)}`;
    console.log('other Url ==>', otherThankYouUrl);
    const otherVersionsRes = await fetch(otherThankYouUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const otherVersionsData = await otherVersionsRes.json();
    console.log('Data from other Salesforce==>', JSON.stringify(otherVersionsData));
    if (!otherVersionsRes.ok) {
      return {
        statusCode: otherVersionsData.status,
        body: JSON.stringify({ error: 'Failed to fetch other thankyou' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      };
    }

    if (otherVersionsData.totalSize > 0) {
      try {
        const { Form_Version__c, Body__c, Actions__c, ...restFields } = parsedData;
        const bodyString = typeof Body__c === 'object' ? JSON.stringify(Body__c) : Body__c;
        const actionsString = typeof Actions__c === 'object' ? JSON.stringify(Actions__c) : Actions__c;

        const rest = {
          ...restFields,
          Body__c: bodyString,
          Actions__c: actionsString,
        };
        console.log('Rest data', rest);
        console.log('Id', otherVersionsData?.records[0].Id);
        // Update existing Thank_You__c record
        const formVersionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Thank_You__c/${otherVersionsData?.records[0].Id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rest)
        });
        const formVersionData = await formVersionResponse.json();
        console.log('Data from Salesforce==>', JSON.stringify(formVersionData, null, 2));
        return {
          statusCode: 200,
          body: 'Thank you record updated successfully',
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        };
      } catch (error) {
        return {
          statusCode: 500,
          body: JSON.stringify({ message: error, error: error.message }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }

        }
      }
    } else {
      // Create new Thank_You__c record
      const formVersionResponse = await fetch(`${salesforceBaseUrl}/sobjects/Thank_You__c`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...parsedData })

      });
      const formVersionData = await formVersionResponse.json();
      console.log('Data from Salesforce==>', JSON.stringify(formVersionData, null, 2));
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Thank you record created successfully',
          data: JSON.stringify(formVersionData)
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    };
  }
};
