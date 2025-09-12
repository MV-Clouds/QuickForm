// import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
// import { Buffer } from "buffer";

// const s3Client = new S3Client({ region: 'us-east-1' });

// // NEW: Delete function for S3 object
// async function deleteImage(event) {
//     // Pass the image key (i.e., S3 object key) in query parameter
//     const imageKey = event.queryStringParameters?.imageKey;

//     if (!imageKey) {
//         return {
//             statusCode: 400,
//             headers: { "Access-Control-Allow-Origin": "*" },
//             body: JSON.stringify({ message: 'Missing imageKey query parameter' }),
//         };
//     }

//     const params = {
//         Bucket: bucketName,
//         Key: imageKey,
//     };

//     try {
//         const command = new DeleteObjectCommand(params);
//         await s3Client.send(command);

//         return {
//             statusCode: 200,
//             headers: { "Access-Control-Allow-Origin": "*" },
//             body: JSON.stringify({
//                 message: 'File deleted successfully!',
//                 imageKey: imageKey
//             }),
//         };
//     } catch (error) {
//         return {
//             statusCode: 500,
//             headers: { "Access-Control-Allow-Origin": "*" },
//             body: JSON.stringify({ message: 'File deletion failed.', error: error.message }),
//         };
//     }
// }

// export const handler = async (event) => {

//     // Get bucket name and region from hardcode OR environment variables
//     const bucketName = 'quickform-images';
//     const region = 'us-east-1';
//     const method = event.httpMethod;
    
//     if(method === 'POST'){
//         try {
//             // Get file data from the request
//             const fileContent = Buffer.from(event.body, 'base64');
    
//             // Get fileName and fileType from query string parameters
//             const fileName = event.queryStringParameters?.fileName;
//             const fileType = event.queryStringParameters?.fileType;
    
//             console.log('file--> ' , fileName , fileType , fileContent  );
//             // Basic validation
//             if (!fileName || !fileType) {
//                 return {
//                     statusCode: 400,
//                     headers: { "Access-Control-Allow-Origin": "*" },
//                     body: JSON.stringify({ message: 'Missing fileName or fileType query parameter' }),
//                 };
//             }
    
//             // To prevent overwrites, you could generate a unique key, e.g., by adding a timestamp
//             const uniqueKey = `${Date.now()}_${fileName}`;
    
//             const params = {
//                 Bucket: bucketName,
//                 Key: uniqueKey, // Use the unique key
//                 Body: fileContent,
//                 ContentType: fileType,
//                 ACL: 'public-read'
//             };
    
//             const command = new PutObjectCommand(params);
//             await s3Client.send(command);
    
//             // CHANGED: Construct the S3 URL to return to the frontend
//             const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;
    
//             return {
//                 statusCode: 200,
//                 headers: {
//                     "Access-Control-Allow-Origin": "*", // Or your specific domain
//                 },
//                 //  Return a JSON object with the success message and the file URL
//                 body: JSON.stringify({
//                     message: 'File uploaded successfully!',
//                     fileUrl: fileUrl,
//                 }),
//             };
    
          
//         } catch (error) {
//             console.error("Error uploading file:", error);
//             return {
//                 statusCode: 500,
//                 headers: {
//                     "Access-Control-Allow-Origin": "*",
//                 },
//                 body: JSON.stringify({ message: 'File upload failed.', error: error.message }),
//             };
//         }
//     }else if(method === 'DELETE'){
//         return await deleteImage(event);
//     }else{
//         return {
//             statusCode: 400,
//             headers: { "Access-Control-Allow-Origin": "*" },
//             body: JSON.stringify({ message: 'Invalid method' }),
//         };
//     }
// };