import { SNSClient, PublishCommand} from '@aws-sdk/client-sns';
// Your region
const sns = new SNSClient({ region: 'us-east-1' });

const handler = async (event) => {
  console.log('Received Event',event.body);
  const eventBody = event.body ? JSON.parse(event.body) : event;
  if(!eventBody.phoneNumber || !eventBody.message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters' }),
      headers : { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    };
  }
  const phoneNumber = eventBody.phoneNumber; // E.164 format
  const message = eventBody.message; //Message Body
  console.log('Sending SMS to:', phoneNumber);
  console.log('Message:', message);
  const params = {
    Message: message,
    PhoneNumber: phoneNumber,
  };
  const command = new PublishCommand({
    Message: message,
    PhoneNumber: phoneNumber,
  });
  try {
    const result = await sns.send(command);

    console.log('SMS sent! Message ID:', result.MessageId);

    return {
      statusCode: 200,
      body: JSON.stringify({ messageId: result.MessageId, message: 'SMS sent' }),
      headers : { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    };
  } catch (err) {
    console.error('Failed to send SMS:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
      headers : { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    };
  }
};

export { handler };