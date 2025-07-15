import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "us-east-1" }); // Use your SES region

export const handler = async (event) => {
  const toEmail = event.to || "recipient@example.com"; // Input via test/event
  const fromEmail = "vivek.m@mvclouds.com"; // Must be verified in SES

 
  const params = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: "Welcome from Lambda & SES!",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>👋 Hello from AWS Lambda!</h2>
                <p>This is a <strong>HTML email</strong> sent using AWS SES.</p>
                <p style="color: gray;">Sent on ${new Date().toLocaleString()}</p>
              </body>
            </html>
          `,
          Charset: "UTF-8",
        },
        Text: {
          Data: "Hello from AWS Lambda! This is a fallback plain text version.",
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await ses.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ messageId: response.MessageId }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
 