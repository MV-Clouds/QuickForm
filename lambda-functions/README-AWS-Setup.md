# AWS S3 File Deletion Setup

## Lambda Function Dependencies

To enable S3 file deletion functionality, you need to add the AWS SDK to your Lambda function dependencies.

### Option 1: Using Lambda Layers

1. Create a Lambda layer with the AWS SDK v3
2. Add the layer to your Lambda function

### Option 2: Package Dependencies

Add to your Lambda function's package.json:

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x.x"
  }
}
```

### Option 3: Direct Installation

If deploying via ZIP file, run in your lambda function directory:

```bash
npm install @aws-sdk/client-s3
```

## IAM Permissions

Your Lambda function's execution role needs the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:DeleteObject"],
      "Resource": "arn:aws:s3:::quickform-images/*"
    }
  ]
}
```

## Configuration

The Lambda function is configured to delete files from:

- **Bucket**: `quickform-images`
- **Region**: `us-east-1`

Make sure these match your actual S3 setup.

## File URL Format

The function expects S3 URLs in the format:

```
https://quickform-images.s3.us-east-1.amazonaws.com/1234567890_filename.ext
```

Where:

- `1234567890` is the timestamp prefix added during upload
- `filename.ext` is the original filename with extension

## Testing

The function will:

1. Extract the S3 key from the file URL
2. Attempt to delete the object from S3
3. Return success/failure status for each file
4. Log all operations for debugging

## Error Handling

- Invalid URLs are skipped with error messages
- Individual file deletion failures don't stop the process
- All results are returned with success/failure status
