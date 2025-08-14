import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

const TOKEN_TABLE_NAME = 'SalesforceAuthTokens';
const METADATA_TABLE_NAME = 'SalesforceChunkData';

export const handler = async (event) => {
  // Extract query parameters from the Lambda event
  const queryStringParameters = event.queryStringParameters || {};
  const access_token = queryStringParameters.access_token;
  const instance_url = queryStringParameters.instance_url;
  const refresh_token = queryStringParameters.refresh_token;
  const userId = queryStringParameters.userId;
  const org = queryStringParameters.org || 'production';
  const user_name = queryStringParameters.user_name;
  const user_email = queryStringParameters.user_email;
  const user_preferred_username = queryStringParameters.user_preferred_username;
  const user_zoneinfo = queryStringParameters.user_zoneinfo;
  const user_locale = queryStringParameters.user_locale;
  const user_language = queryStringParameters.user_locale;


  // User Profile Data
  const user_profile_data = {
    user_name,
    user_email,
    user_preferred_username,
    user_zoneinfo,
    user_locale,
    user_language,
  };
  // Validate required parameters
  if (!access_token || !instance_url || !userId || !refresh_token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required parameters: access_token, instance_url, or userId' }),
    };
  }

  try {
    // Clean the instance URL (remove protocol)
    const cleanedInstanceUrl = instance_url.replace(/https?:\/\//, '');
    const currentTime = new Date().toISOString();

    // 1. Upsert token to DynamoDB (similar to the iframe flow)
    const tokenItem = {
      UserId: { S: userId },
      InstanceUrl: { S: cleanedInstanceUrl },
      RefreshToken: { S: refresh_token || '' },
      AccessToken: { S: access_token },
      CreatedAt: { S: currentTime },
      UpdatedAt: { S: currentTime },
    };
    const queryResponse = await dynamoClient.send(
      new GetItemCommand({
        TableName: TOKEN_TABLE_NAME,
        Key: {
          UserId: { S: userId },
        },
      })
    );

    if (queryResponse.Item) {
      tokenItem.CreatedAt = queryResponse.Item.CreatedAt || { S: currentTime };
    }

    await dynamoClient.send(
      new PutItemCommand({
        TableName: TOKEN_TABLE_NAME,
        Item: tokenItem,
      })
    );

    // 2. Fetch Salesforce objects
    const objectsRes = await fetch(`${instance_url}/services/data/v60.0/sobjects/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!objectsRes.ok) {
      const errorData = await objectsRes.json();
      throw new Error(errorData.message || 'Failed to fetch objects');
    }

    const objectsData = await objectsRes.json();
    const rawObjects = objectsData.sobjects;

    // 3. Filter relevant objects (same logic as the iframe flow)
    const metadata = rawObjects
      .filter(obj => {
        const isCustom = obj.name.endsWith('__c');
        const isStandard = !obj.name.endsWith('__c') && obj.queryable && obj.updateable;

        const isMetadataComponent = obj.custom === false &&
          (obj.name.startsWith('Apex') ||
            obj.name.endsWith('Definition') ||
            obj.name.endsWith('Info') ||
            obj.name.includes('Settings') ||
            obj.name.includes('Permission') ||
            obj.name.includes('SetupEntity') ||
            obj.name.includes('Package') ||
            obj.name.includes('Profile') ||
            obj.name.includes('EmailTemplate') ||
            obj.name.includes('Report') ||
            obj.name.includes('Dashboard'));

        const excludedPatterns = [
          'Share',
          'History',
          'Feed',
          'ChangeEvent',
          'Tag',
          'Vote',
          'Login',
          'EventRelation',
          'PageLayout',
          'FieldPermissions',
          'UserRole',
          'SetupEntityAccess',
          'PermissionSetAssignment',
          'UserLicense',
          'ObjectPermissions',
          'Topic',
          'StreamingChannel',
          'UserPreference',
        ];

        const isExcluded = excludedPatterns.some(pattern => obj.name.includes(pattern));
        return (isCustom || isStandard) && !isExcluded && !isMetadataComponent;
      })
      .map(obj => ({
        name: obj.name,
        label: obj.label,
      }));

    // 3. Fetch Form__c records
    const fetchSalesforceData = async (accessToken, instanceUrl, query) => {
      let allRecords = [];
      let nextUrl = `${instanceUrl}/services/data/v60.0/queryAll?q=${encodeURIComponent(query)}`;
      const queryStart = Date.now();

      while (nextUrl) {
        const queryRes = await fetch(nextUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!queryRes.ok) {
          const errorData = await queryRes.json();
          throw new Error(errorData[0]?.message || `Failed to fetch records for query: ${query}`);
        }

        const queryData = await queryRes.json();
        allRecords.push(...(queryData.records || []));

        nextUrl = queryData.nextRecordsUrl
          ? `${instanceUrl}${queryData.nextRecordsUrl}`
          : null;
      }

      return allRecords;
    };


    const [forms, formVersions, formFields, formConditions, prefills, Mappings, Fieldset, Fieldset_Field, formNotifications, formThankYou, formFolders] = await Promise.all([
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Name, Active_Version__c, Publish_Link__c , Status__c, LastModifiedDate , Folder__c , IsDeleted , isFavorite__c FROM Form__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Name, Form__c, Description__c, Object_Info__c, Version__c, Stage__c, Submission_Count__c , IsDeleted FROM Form_Version__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Name, Form_Version__c, Field_Type__c, Page_Number__c, Order_Number__c, Properties__c, Unique_Key__c , isHidden__c ,Default_Value__c,IsDeleted FROM Form_Field__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Form_Version__c, Condition_Type__c, Condition_Data__c ,IsDeleted FROM Form_Condition__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Form_Version__c, Prefill_Data__c, Order__c, IsDeleted FROM Prefill__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Name, Order__c, Node_Configuration__c,Form_Version__c,Conditions__c,Salesforce_Object__c,Next_Node_Id__c,Previous_Node_Id__c,IsDeleted,Field_Mappings__c,Node_Id__c,Loop_Config__c,Formatter_Config__c FROM QF_Mapping__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id , Name, Description__c , isDeleted  FROM Fieldset__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id, Name, Field_Type__c, Page_Number__c, Order_Number__c, Properties__c, Unique_Key__c , IsDeleted , Fieldset__c  FROM Fieldset_Field__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id,	IsDeleted,	Name,	LastModifiedDate,	Body__c	,Form__c	,Title__c	,Type__c	,Status__c,	Receipe__c,	Condition__c	,Schedule__c  FROM Notification__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id , Body__c, Image_Url__c ,Sub_Heading__c ,Heading__c ,Actions__c , Description__c , IsDeleted , Form_Version__c from Thank_You__c'
      ),
      fetchSalesforceData(
        access_token,
        instance_url,
        'SELECT Id , Name , FormIds__c , Parent_Folder__c , Description__c , IsDeleted  from Folder__c'
      ),
    ]);
    const formversionsdel = formVersions.filter(val => val.IsDeleted === true)
    const formRecords = forms.filter(val => val.IsDeleted !== true).map(form => {
      const versions = formVersions
        .filter(version => version.Form__c === form.Id && version.IsDeleted !== true)
        .map(version => {
          // Filter QF_Mapping__c records for this Form_Version__c
          const versionMappings = Mappings.filter(mapping => mapping.Form_Version__c === version.Id && mapping.IsDeleted !== true);

          // Initialize Mappings structure
          const mappingsObject = {
            Id: version.Id, // Use Form_Version__c ID as top-level ID
            FlowId: version.Id, // Same as Id for consistency
            Mappings: {},
            Nodes: [],
            Edges: [],
          };

          // Function to validate and parse JSON
          const parseJsonField = (fieldValue, fieldName, mappingId) => {
            if (!fieldValue || typeof fieldValue !== 'string') {
              return {};
            }
            try {
              // Check if the string starts with a valid JSON character ({, [, or ")
              if (!fieldValue.match(/^\s*[\{\[\"]/)) {
                console.warn(`Invalid JSON in ${fieldName} for mapping ${mappingId}: "${fieldValue}"`);
                return {};
              }
              return JSON.parse(fieldValue);
            } catch (e) {
              console.warn(`Failed to parse ${fieldName} for mapping ${mappingId}:`, e.message);
              return {};
            }
          };

          // Process each QF_Mapping__c record to build Mappings, Nodes, and Edges
          versionMappings.forEach(mapping => {
            // Parse JSON fields with validation
            const nodeConfig = parseJsonField(mapping.Node_Configuration__c, 'Node_Configuration__c', mapping.Id);
            const formatterConfig = parseJsonField(mapping.Formatter_Config__c, 'Formatter_Config__c', mapping.Id);
            const fieldMappings = parseJsonField(mapping.Field_Mappings__c, 'Field_Mappings__c', mapping.Id);
            const conditions = parseJsonField(mapping.Conditions__c, 'Conditions__c', mapping.Id);
            const loopConfig = parseJsonField(mapping.Loop_Config__c, 'Loop_Config__c', mapping.Id);

            // Parse Next_Node_Id__c as JSON array or split comma-separated string
            let nextNodeIds = [];
            if (mapping.Next_Node_Id__c) {
              try {
                nextNodeIds = JSON.parse(mapping.Next_Node_Id__c);
                if (!Array.isArray(nextNodeIds)) {
                  console.warn(`Next_Node_Id__c for mapping ${mapping.Id} is not an array:`, nextNodeIds);
                  nextNodeIds = [];
                }
              } catch (e) {
                console.warn(`Failed to parse Next_Node_Id__c for mapping ${mapping.Id}:`, e.message);
                // Fallback to splitting comma-separated string if JSON parsing fails
                if (typeof mapping.Next_Node_Id__c === 'string') {
                  nextNodeIds = mapping.Next_Node_Id__c.split(',').map(id => id.trim()).filter(id => id);
                }
              }
            }

            // Build the Mappings sub-object
            mappingsObject.Mappings[mapping.Node_Id__c] = {
              id: mapping.Id,
              nodeId: mapping.Node_Id__c,
              actionType: mapping.Type__c || 'Unknown',
              salesforceObject: mapping.Salesforce_Object__c || '',
              fieldMappings: Array.isArray(fieldMappings) ? fieldMappings : [],
              conditions: conditions.conditions || [],
              logicType: conditions.logicType || null,
              customLogic: conditions.customLogic || '',
              formatterConfig: mapping.Type__c === 'Formatter' ? formatterConfig : {},
              loopConfig: mapping.Type__c === 'Loop' ? loopConfig : {},
              enableConditions: mapping.Type__c === 'CreateUpdate' ? !!conditions.conditions?.length : undefined,
              returnLimit: ['Find', 'Filter', 'Condition'].includes(mapping.Type__c) ? conditions.returnLimit || null : undefined,
              sortField: ['Find', 'Filter', 'Condition'].includes(mapping.Type__c) ? conditions.sortField || null : undefined,
              sortOrder: ['Find', 'Filter', 'Condition'].includes(mapping.Type__c) ? conditions.sortOrder || null : undefined,
              pathOption: mapping.Type__c === 'Condition' ? conditions.pathOption || 'Rules' : undefined,
              nextNodeIds,
              previousNodeId: mapping.Previous_Node_Id__c || null,
              label: mapping.Name || mapping.Node_Id__c,
              order: parseInt(mapping.Order__c) || 0,
              formVersionId: version.Id,
            };

            // Build the Nodes array with formatterConfig and loopConfig merged into data
            mappingsObject.Nodes.push({
              id: mapping.Node_Id__c,
              type: 'custom',
              position: nodeConfig.position || { x: 0, y: 0 },
              data: {
                label: mapping.Name || mapping.Node_Id__c,
                displayLabel: nodeConfig.displayLabel || mapping.Name || mapping.Node_Id__c,
                order: parseInt(mapping.Order__c) || 0,
                type: mapping.Type__c?.toLowerCase() || 'unknown',
                action: mapping.Type__c || 'Unknown',
                ...(mapping.Type__c === 'Formatter' && formatterConfig ? { formatterConfig } : {}),
                ...(mapping.Type__c === 'Loop' && loopConfig ? { loopConfig } : {}),
              },
              draggable: true,
              width: nodeConfig.width || 120,
              height: nodeConfig.height || 52,
            });

            // Build the Edges array
            nextNodeIds.forEach(nextNodeId => {
              mappingsObject.Edges.push({
                id: `e${mapping.Node_Id__c}-${nextNodeId}`,
                source: mapping.Node_Id__c,
                sourceHandle: 'bottom',
                target: nextNodeId,
                targetHandle: 'top',
                type: 'default',
                animated: false,
              });
            });
          });

          return {
            Id: version.Id,
            FormId: version.Form__c,
            Name: version.Name,
            Object_Info__c: version.Object_Info__c || null,
            Description__c: version.Description__c || null,
            Version__c: version.Version__c || '1',
            Publish_Link__c: version.Publish_Link__c || null,
            Stage__c: version.Stage__c || 'Draft',
            Submission_Count__c: version.Submission_Count__c || 0,
            Source: 'Form_Version__c',
            Mappings: mappingsObject,
            Fields: formFields
              .filter(field => field.Form_Version__c === version.Id)
              .map(field => ({
                Id: field.Id,
                Name: field.Name,
                Field_Type__c: field.Field_Type__c, // Fixed typo from 'Field_Type'
                Page_Number__c: field.Page_Number__c,
                Order_Number__c: field.Order_Number__c,
                Properties__c: field.Properties__c,
                Unique_Key__c: field.Unique_Key__c,
                Fieldset__c: field.Fieldset__c || null, // Added fieldset
                isHidden__c: field.isHidden__c || false, // Added Hidden
                Default_Value__c: field.Default_Value__c || null, // Added Default Value
              })),
            Conditions: formConditions
              .filter(condition => condition.Form_Version__c === version.Id)
              .flatMap(condition => {
                try {
                  return JSON.parse(condition.Condition_Data__c || '[]').map(cond => ({
                    Id: cond.Id,
                    type: cond.type,
                    ...(cond.type === 'dependent'
                      ? {
                        ifField: cond.ifField,
                        value: cond.value || null,
                        dependentField: cond.dependentField,
                        dependentValues: cond.dependentValues || [],
                      }
                      : {
                        conditions: cond.conditions?.map(c => ({
                          ifField: c.ifField,
                          operator: c.operator || 'equals',
                          value: c.value || null,
                        })) || [],
                        logic: cond.logic || 'AND',
                        logicExpression: cond.logicExpression || '',
                        ...(cond.type === 'show_hide'
                          ? { thenAction: cond.thenAction, thenFields: cond.thenFields || [] }
                          : cond.type === 'skip_hide_page'
                            ? {
                              thenAction: cond.thenAction,
                              sourcePage: cond.sourcePage,
                              targetPage: cond.targetPage,
                              ...(cond.thenAction && cond.thenAction.toLowerCase() === 'loop'
                                ? {
                                  loopField: cond.loopField ?? '',
                                  loopValue: cond.loopValue ?? '',
                                  loopType: cond.loopType ?? 'static',
                                }
                                : {}),
                            }
                            : {
                              thenAction: cond.thenAction,
                              thenFields: cond.thenFields || [],
                              ...(cond.thenAction === 'set mask' ? { maskPattern: cond.maskPattern } : {}),
                              ...(cond.thenAction === 'unmask' ? { maskPattern: null } : {}),
                            }),
                      }),
                  }));
                } catch (e) {
                  console.warn(`Failed to parse Condition_Data__c for condition ${condition.Id}:`, e);
                  return [];
                }
              }),
            Prefills: prefills
              .filter(pf => pf.Form_Version__c === version.Id && pf.IsDeleted !== true)
              .map(pf => ({
                Id: pf.Id,
                Prefill_Data__c: pf.Prefill_Data__c || '{}', // keep as string for DDB storage
                Order__c: pf.Order__c || null
              })),
            ThankYou: formThankYou.filter(val => val.Form_Version__c == version.Id && val.IsDeleted === false),
          };
        })
        .sort((a, b) => (b.Version__c || '1').localeCompare(a.Version__c || '1')); // Sort by Version__c DESC

      return {
        Id: form.Id,
        Name: form.Name,
        Active_Version__c: form.Active_Version__c || null,
        Publish_Link__c: form.Publish_Link__c || null,
        Status__c: form.Status__c || 'Inactive',
        Source: 'Form__c',
        LastModifiedDate: form.LastModifiedDate || Date.now(),
        Folder__c: form.Folder__c || null,
        FormVersions: versions,
        IsDeleted: form.IsDeleted,
        isFavorite: form.isFavorite__c || false,
        Notifications: formNotifications
          .filter(notification => notification.Form__c === form.Id)
          .map(notification => ({
            Id: notification.Id,
            Name: notification.Name,
            Body__c: notification.Body__c,
            Title__c: notification.Title__c,
            Type__c: notification.Type__c,
            Status__c: notification.Status__c,
            Schedule__c: notification.Schedule__c,
            Condition__c: notification.Condition__c,
            Receipe__c: notification.Receipe__c,
            IsDeleted: notification.IsDeleted,
            LastModifiedDate: notification.LastModifiedDate
          })),
      };
    });

    //Records for Deleted Forms
    const deletedformRecords = forms.filter(form => form.IsDeleted === true).map(form => {
      const versions = formVersions.filter(version => version.Form__c === form.Id).map(version => {
        // Filter QF_Mapping__c records for this Form_Version__c
        const versionMappings = Mappings.filter(mapping => mapping.Form_Version__c === version.Id);

        // Initialize Mappings structure
        const mappingsObject = {
          Id: version.Id, // Use Form_Version__c ID as top-level ID
          FlowId: version.Id, // Same as Id for consistency
          Mappings: {},
          Nodes: [],
          Edges: [],
        };

        // Function to validate and parse JSON
        const parseJsonField = (fieldValue, fieldName, mappingId) => {
          if (!fieldValue || typeof fieldValue !== 'string') {
            return {};
          }
          try {
            // Check if the string starts with a valid JSON character ({, [, or ")
            if (!fieldValue.match(/^\s*[\{\[\"]/)) {
              console.warn(`Invalid JSON in ${fieldName} for mapping ${mappingId}: "${fieldValue}"`);
              return {};
            }
            return JSON.parse(fieldValue);
          } catch (e) {
            console.warn(`Failed to parse ${fieldName} for mapping ${mappingId}:`, e.message);
            return {};
          }
        };

        // Process each QF_Mapping__c record to build Mappings, Nodes, and Edges
        versionMappings.forEach(mapping => {
          // Parse JSON fields with validation
          const nodeConfig = parseJsonField(mapping.Node_Configuration__c, 'Node_Configuration__c', mapping.Id);
          const formatterConfig = parseJsonField(mapping.Formatter_Config__c, 'Formatter_Config__c', mapping.Id);
          const fieldMappings = parseJsonField(mapping.Field_Mappings__c, 'Field_Mappings__c', mapping.Id);
          const conditions = parseJsonField(mapping.Conditions__c, 'Conditions__c', mapping.Id);
          const loopConfig = parseJsonField(mapping.Loop_Config__c, 'Loop_Config__c', mapping.Id);

          // Parse Next_Node_Id__c as JSON array or split comma-separated string
          let nextNodeIds = [];
          if (mapping.Next_Node_Id__c) {
            try {
              nextNodeIds = JSON.parse(mapping.Next_Node_Id__c);
              if (!Array.isArray(nextNodeIds)) {
                console.warn(`Next_Node_Id__c for mapping ${mapping.Id} is not an array:`, nextNodeIds);
                nextNodeIds = [];
              }
            } catch (e) {
              console.warn(`Failed to parse Next_Node_Id__c for mapping ${mapping.Id}:`, e.message);
              // Fallback to splitting comma-separated string if JSON parsing fails
              if (typeof mapping.Next_Node_Id__c === 'string') {
                nextNodeIds = mapping.Next_Node_Id__c.split(',').map(id => id.trim()).filter(id => id);
              }
            }
          }

          // Build the Mappings sub-object
          mappingsObject.Mappings[mapping.Node_Id__c] = {
            id: mapping.Id,
            nodeId: mapping.Node_Id__c,
            actionType: mapping.Type__c || 'Unknown',
            salesforceObject: mapping.Salesforce_Object__c || '',
            fieldMappings: Array.isArray(fieldMappings) ? fieldMappings : [],
            conditions: conditions.conditions || [],
            logicType: conditions.logicType || null,
            customLogic: conditions.customLogic || '',
            formatterConfig: mapping.Type__c === 'Formatter' ? formatterConfig : {},
            loopConfig: mapping.Type__c === 'Loop' ? loopConfig : {},
            enableConditions: mapping.Type__c === 'CreateUpdate' ? !!conditions.conditions?.length : undefined,
            returnLimit: ['Find', 'Filter', 'Condition'].includes(mapping.Type__c) ? conditions.returnLimit || null : undefined,
            sortField: ['Find', 'Filter', 'Condition'].includes(mapping.Type__c) ? conditions.sortField || null : undefined,
            sortOrder: ['Find', 'Filter', 'Condition'].includes(mapping.Type__c) ? conditions.sortOrder || null : undefined,
            pathOption: mapping.Type__c === 'Condition' ? conditions.pathOption || 'Rules' : undefined,
            nextNodeIds,
            previousNodeId: mapping.Previous_Node_Id__c || null,
            label: mapping.Name || mapping.Node_Id__c,
            order: parseInt(mapping.Order__c) || 0,
            formVersionId: version.Id,
          };

          // Build the Nodes array with formatterConfig and loopConfig merged into data
          mappingsObject.Nodes.push({
            id: mapping.Node_Id__c,
            type: 'custom',
            position: nodeConfig.position || { x: 0, y: 0 },
            data: {
              label: mapping.Name || mapping.Node_Id__c,
              displayLabel: nodeConfig.displayLabel || mapping.Name || mapping.Node_Id__c,
              order: parseInt(mapping.Order__c) || 0,
              type: mapping.Type__c?.toLowerCase() || 'unknown',
              action: mapping.Type__c || 'Unknown',
              ...(mapping.Type__c === 'Formatter' && formatterConfig ? { formatterConfig } : {}),
              ...(mapping.Type__c === 'Loop' && loopConfig ? { loopConfig } : {}),
            },
            draggable: true,
            width: nodeConfig.width || 120,
            height: nodeConfig.height || 52,
          });

          // Build the Edges array
          nextNodeIds.forEach(nextNodeId => {
            mappingsObject.Edges.push({
              id: `e${mapping.Node_Id__c}-${nextNodeId}`,
              source: mapping.Node_Id__c,
              sourceHandle: 'bottom',
              target: nextNodeId,
              targetHandle: 'top',
              type: 'default',
              animated: false,
            });
          });
        });

        return {
          Id: version.Id,
          FormId: version.Form__c,
          Name: version.Name,
          Object_Info__c: version.Object_Info__c || null,
          Description__c: version.Description__c || null,
          Version__c: version.Version__c || '1',
          Publish_Link__c: version.Publish_Link__c || null,
          Stage__c: version.Stage__c || 'Draft',
          Submission_Count__c: version.Submission_Count__c || 0,
          Source: 'Form_Version__c',
          Mappings: mappingsObject,
          Fields: formFields
            .filter(field => field.Form_Version__c === version.Id)
            .map(field => ({
              Id: field.Id,
              Name: field.Name,
              Field_Type__c: field.Field_Type__c, // Fixed typo from 'Field_Type'
              Page_Number__c: field.Page_Number__c,
              Order_Number__c: field.Order_Number__c,
              Properties__c: field.Properties__c,
              Unique_Key__c: field.Unique_Key__c,
            })),
          Conditions: formConditions
            .filter(condition => condition.Form_Version__c === version.Id)
            .flatMap(condition => {
              try {
                return JSON.parse(condition.Condition_Data__c || '[]').map(cond => ({
                  Id: cond.Id,
                  type: cond.type,
                  ...(cond.type === 'dependent'
                    ? {
                      ifField: cond.ifField,
                      value: cond.value || null,
                      dependentField: cond.dependentField,
                      dependentValues: cond.dependentValues || [],
                    }
                    : {
                      conditions: cond.conditions?.map(c => ({
                        ifField: c.ifField,
                        operator: c.operator || 'equals',
                        value: c.value || null,
                      })) || [],
                      logic: cond.logic || 'AND',
                      logicExpression: cond.logicExpression || '',
                      ...(cond.type === 'show_hide'
                        ? { thenAction: cond.thenAction, thenFields: cond.thenFields || [] }
                        : cond.type === 'skip_hide_page'
                          ? {
                            thenAction: cond.thenAction,
                            sourcePage: cond.sourcePage,
                            targetPage: cond.targetPage,
                            ...(cond.thenAction && cond.thenAction.toLowerCase() === 'loop'
                              ? {
                                loopField: cond.loopField ?? '',
                                loopValue: cond.loopValue ?? '',
                                loopType: cond.loopType ?? 'static',
                              }
                              : {}),
                          }
                          : {
                            thenAction: cond.thenAction,
                            thenFields: cond.thenFields || [],
                            ...(cond.thenAction === 'set mask' ? { maskPattern: cond.maskPattern } : {}),
                            ...(cond.thenAction === 'unmask' ? { maskPattern: null } : {}),
                          }),
                    }),
                }));
              } catch (e) {
                console.warn(`Failed to parse Condition_Data__c for condition ${condition.Id}:`, e);
                return [];
              }
            }),
        };
      })
        .sort((a, b) => (b.Version__c || '1').localeCompare(a.Version__c || '1')); // Sort by Version__c DESC

      return {
        Id: form.Id,
        Name: form.Name,
        Active_Version__c: form.Active_Version__c || null,
        Publish_Link__c: form.Publish_Link__c || null,
        Status__c: form.Status__c || 'Inactive',
        Source: 'Form__c',
        LastModifiedDate: form.LastModifiedDate || Date.now(),
        Folder__c: form.Folder__c || null,
        FormVersions: versions,
        IsDeleted: form.IsDeleted,
        isFavorite: form.isFavorite__c || false
      };
    }).filter(deletedForm => deletedForm.FormVersions.length > 0);

    const queryResponseData = await dynamoClient.send(
      new QueryCommand({
        TableName: METADATA_TABLE_NAME,
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
        },
      })
    );

    const formRecordsString = JSON.stringify(formRecords);
    const deletedformRecordsString = JSON.stringify(deletedformRecords);
    const CHUNK_SIZE = 370000;
    const chunks = [];
    const deletedchunks = [];
    for (let i = 0; i < formRecordsString.length; i += CHUNK_SIZE) {
      chunks.push(formRecordsString.slice(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < deletedformRecordsString.length; i += CHUNK_SIZE) {
      deletedchunks.push(deletedformRecordsString.slice(i, i + CHUNK_SIZE));
    }
    const constructedFieldset = Fieldset.map(val => {
      const fieldsetFields = Fieldset_Field.filter(field => field.Fieldset__c === val.Id);
      return {
        Id: val.Id,
        Name: val.Name,
        Description__c: val.Description__c,
        Fieldset_Fields__c: fieldsetFields,
        IsDeleted: val.IsDeleted
      };
    })
    const writeRequests = [
      {
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: 'Metadata' },
            InstanceUrl: { S: cleanedInstanceUrl },
            UserProfile: { S: JSON.stringify(user_profile_data) },
            Folders: { S: JSON.stringify(formFolders.filter(val => val.IsDeleted !== true)) },
            Fieldset: { S: JSON.stringify(constructedFieldset.filter(val => val.IsDeleted !== true)) },
            Metadata: { S: JSON.stringify(metadata) },
            CreatedAt: { S: queryResponseData.Items?.find(item => item.ChunkIndex?.S === 'Metadata')?.CreatedAt?.S || currentTime },
            UpdatedAt: { S: currentTime },
          },
        },
      },
      ...chunks.map((chunk, index) => ({
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: `FormRecords_${index}` },
            FormRecords: { S: chunk },
            CreatedAt: { S: currentTime },
            UpdatedAt: { S: currentTime },
          },
        },
      })),
      ...deletedchunks.map((chunk, index) => ({
        PutRequest: {
          Item: {
            UserId: { S: userId },
            ChunkIndex: { S: `DeletedFormRecords_${index}` },
            FormRecords: { S: chunk },
            Fieldset: { S: JSON.stringify(constructedFieldset.filter(val => val.IsDeleted === true)) },
            CreatedAt: { S: currentTime },
            UpdatedAt: { S: currentTime },
          },
        },
      }))
    ];

    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [METADATA_TABLE_NAME]: writeRequests,
        },
      })
    )

    // 6. Return HTML to notify the parent window and close the popup
    const htmlResponse = `
    <html>
      <head><title>Authenticated</title></head>
      <body>
        <script>
          // Notify parent window of success and send the token
          window.opener?.postMessage(
            { type: 'login_success', userId: '${userId}', instanceUrl: '${instance_url}' },
            'https://d2bri1qui9cr5s.cloudfront.net'
          );
          window.close();
        </script>
      </body>
    </html>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: htmlResponse,
    };
  } catch (err) {
    const stackTrace = (err && err.stack) || new Error().stack;
    console.error('Error in storeMetadata:', err.message, '\nStack trace:', stackTrace);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};