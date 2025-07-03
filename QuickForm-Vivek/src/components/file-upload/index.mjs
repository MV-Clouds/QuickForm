import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";

const s3Client = new S3Client({ region: 'us-east-1' });

export const handler = async (event) => {
    // Get bucket name and region from environment variables
    const bucketName = 'quickform-images';
    const region = 'us-east-1';

    try {
        // Get file data from the request
        const fileContent = Buffer.from(event.body, 'base64');

        // Get fileName and fileType from query string parameters
        const fileName = event.queryStringParameters?.fileName;
        const fileType = event.queryStringParameters?.fileType;
        console.log('file--> ' , fileName , fileType , fileContent );
        // Basic validation
        if (!fileName || !fileType) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: 'Missing fileName or fileType query parameter' }),
            };
        }

        // To prevent overwrites, you could generate a unique key, e.g., by adding a timestamp
        const uniqueKey = `${Date.now()}_${fileName}`;

        const params = {
            Bucket: bucketName,
            Key: uniqueKey, // Use the unique key
            Body: fileContent,
            ContentType: fileType,
            ACL: 'public-read'

        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // CHANGED: Construct the S3 URL to return to the frontend
        const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Or your specific domain
            },
            // CHANGED: Return a JSON object with the success message and the file URL
            body: JSON.stringify({
                message: 'File uploaded successfully!',
                fileUrl: fileUrl,
            }),
        };
    } catch (error) {
        console.error("Error uploading file:", error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ message: 'File upload failed.', error: error.message }),
        };
    }
};