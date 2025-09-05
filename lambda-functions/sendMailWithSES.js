import {
    SESClient,
    SendEmailCommand,
  } from '@aws-sdk/client-ses';
  import {
    EventBridgeClient,
    PutRuleCommand,
    PutTargetsCommand,
    RemoveTargetsCommand,
    DeleteRuleCommand
  } from "@aws-sdk/client-eventbridge";
  import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
  const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
  
  const METADATA_TABLE_NAME = 'SalesforceChunkData';
  
  const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1'  });
  const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });
  
  const EMAIL_SENDER = 'vivek.m@mvclouds.com';
  const EMAIL_SENDER_LAMBDA_ARN = process.env.EMAIL_SENDER_LAMBDA_ARN || 'arn:aws:lambda:us-east-1:590184061255:function:sendEmailWithSES';
  
  export const handler = async (event) => {
    const method = event.httpMethod || event.requestContext?.http?.method;
  
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      const { userId, instanceUrl } = body;
      try {
  
        // Fetch metadata from DynamoDB for the current user and instance URL
        let allItems = [];
        let ExclusiveStartKey = undefined;
  
        do {
          const queryResponse = await dynamoClient.send(
            new QueryCommand({
              TableName: METADATA_TABLE_NAME,
              KeyConditionExpression: 'UserId = :userId',
              ExpressionAttributeValues: {
                ':userId': { S: userId },
              },
              ExclusiveStartKey,
            })
          );
  
          if (queryResponse.Items) {
            allItems.push(...queryResponse.Items);
          }
  
          ExclusiveStartKey = queryResponse.LastEvaluatedKey;
        } while (ExclusiveStartKey);
  
        if (allItems.length === 0) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Metadata not found for this user and instance' }),
          };
        }
  
        const metadataItem = allItems.find(item => item.ChunkIndex?.S === 'Metadata');
        const formRecordItems = allItems.filter(item => item.ChunkIndex?.S.startsWith('FormRecords_'));
        let formRecords = null;
        let notificationData = null;
        if (formRecordItems.length > 0) {
          try {
            // Sort chunks by ChunkIndex and combine
            const sortedChunks = formRecordItems
              .sort((a, b) => {
                const aNum = parseInt(a.ChunkIndex.S.split('_')[1]);
                const bNum = parseInt(b.ChunkIndex.S.split('_')[1]);
                return aNum - bNum;
              })
              .map(item => item.FormRecords.S);
            const combinedFormRecords = sortedChunks.join('');
            formRecords = combinedFormRecords;
          } catch (e) {
            console.warn('Failed to process FormRecords chunks:', e.message, '\nStack trace:', e.stack);
            formRecords = null; // Return null if chunk processing fails, matching original behavior
          }
        }
        // Find form by formId
        const form = formRecords.find(f => f.Id === formId);
        if (!form) {
          return formatResponse(404, { error: `Form with ID ${formId} not found` });
        }
        notificationData = form.Notifications;
  
      } catch (error) {
        console.log("Error fetching metadata:", error);
      }
      switch (method) {
        case 'POST':
          return body.schedule ? await scheduleEmail(body) : await sendEmailDirectly(body);
        case 'PATCH':
          return await updateScheduledEmail(body);
        case 'DELETE':
          return await deleteScheduledEmail(body);
        default:
          return formatResponse(405, { message: "Method Not Allowed" });
      }
  
    } catch (error) {
      console.error("Handler Error:", {
        error: error.message,
        stack: error.stack,
        rawEvent: JSON.stringify(event, null, 2)
      });
  
      return formatResponse(500, {
        message: "Internal Server Error",
        error: error.message,
      });
    }
  };
  
  // Send email immediately via SES
  async function sendEmailDirectly(body) {
    if (!body.to || !body.subject || !body.htmlContent) {
      return formatResponse(400, { message: "Missing required fields: to, subject, htmlContent" });
    }
  
    const params = {
      Source: EMAIL_SENDER,
      Destination: {
        ToAddresses: Array.isArray(body.to) ? body.to : [body.to],
        CcAddresses: body.cc || [],
        BccAddresses: body.bcc || [],
      },
      Message: {
        Subject: { Data: body.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: body.htmlContent, Charset: 'UTF-8' },
          Text: {
            Data: body.textContent || convertHtmlToText(body.htmlContent),
            Charset: 'UTF-8',
          },
        },
      },
    };
  
    const response = await ses.send(new SendEmailCommand(params));
    console.log("Email sent immediately:", { messageId: response.MessageId });
  
    return formatResponse(200, {
      messageId: response.MessageId,
      delivery: "immediate"
    });
  }
  
  // Schedule an email using EventBridge
  async function scheduleEmail(body) {
    if (!body.to || !body.subject || !body.htmlContent || !body.schedule?.expression) {
      return formatResponse(400, { message: "Missing required schedule fields" });
    }
  
    const ruleName = `email-schedule-${Date.now()}`;
    const targetId = `email-target-${Date.now()}`;
  
    // 1. Create rule
    await eventBridge.send(new PutRuleCommand({
      Name: ruleName,
      ScheduleExpression: body.schedule.expression,
      State: 'ENABLED',
      Description: `Scheduled email: ${body.subject}`,
    }));
  
    // 2. Attach Lambda target
    await eventBridge.send(new PutTargetsCommand({
      Rule: ruleName,
      Targets: [{
        Id: targetId,
        Arn: EMAIL_SENDER_LAMBDA_ARN,
        Input: JSON.stringify({
          from: EMAIL_SENDER,
          to: body.to,
          cc: body.cc || '',
          bcc: body.bcc || '',
          subject: body.subject,
          htmlContent: body.htmlContent,
          textContent: body.textContent || convertHtmlToText(body.htmlContent),
        }),
      }],
    }));
  
    console.log("Email scheduled:", { ruleName, targetId });
  
    return formatResponse(200, {
      ruleName,
      schedule: body.schedule.expression,
      delivery: "scheduled"
    });
  }
  
  // Update a scheduled rule (delete + recreate)
  async function updateScheduledEmail(body) {
    if (!body.ruleName) {
      return formatResponse(400, { message: "Missing ruleName to update" });
    }
  
    await deleteScheduledEmail(body); // delete old rule
    const newSchedule = await scheduleEmail(body); // create new one
  
    return formatResponse(200, {
      message: "Schedule updated",
      oldRuleDeleted: body.ruleName,
      newSchedule: JSON.parse(newSchedule.body)
    });
  }
  
  // Delete an existing EventBridge rule + targets
  async function deleteScheduledEmail(body) {
    if (!body.ruleName) {
      return formatResponse(400, { message: "Missing ruleName to delete" });
    }
  
    try {
      // 1. Remove target
      await eventBridge.send(new RemoveTargetsCommand({
        Rule: body.ruleName,
        Ids: [`email-target-${body.ruleName}`], // may need to store real ID
        Force: true,
      }));
  
      // 2. Delete rule
      await eventBridge.send(new DeleteRuleCommand({
        Name: body.ruleName,
        Force: true,
      }));
  
      console.log("Deleted schedule:", body.ruleName);
      return formatResponse(200, { message: `Deleted schedule: ${body.ruleName}` });
    } catch (err) {
      console.error("Delete Error:", err);
      return formatResponse(500, {
        message: "Failed to delete rule",
        error: err.message,
      });
    }
  }
  
  // Convert basic HTML to plain text
  function convertHtmlToText(html) {
    return html
      .replace(/<style[^>]*>.*<\/style>/gms, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Standard response formatter with CORS header
  function formatResponse(statusCode, body) {
    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(body),
    };
  }
  