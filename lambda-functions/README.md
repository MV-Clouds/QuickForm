# QuickForm Lambda Functions

This directory contains AWS Lambda functions for the QuickForm application.

## Functions

### getFormSubmissions.js

Fetches form submissions from Salesforce for a specific form version using ES6 modules and fetch API.

#### Request Format

```json
{
  "userId": "string",
  "instanceUrl": "string",
  "formVersionId": "string",
  "accessToken": "string" // Optional - will fetch if not provided
}
```

#### Response Format

```json
{
  "success": true,
  "submissions": [
    {
      "id": "submission_id",
      "name": "Submission 1",
      "submissionDate": "2024-01-01T12:00:00.000Z",
      "lastModified": "2024-01-01T12:00:00.000Z",
      "status": "Submitted",
      "data": {
        "field_key": "field_value"
      },
      "index": 1
    }
  ],
  "fields": {
    "field_key": "Field Label"
  },
  "metadata": {
    "totalCount": 1,
    "formVersionId": "form_version_id",
    "fetchedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Key Features

- **ES6 Modules**: Uses `export const handler` instead of `exports.handler`
- **Fetch API**: Uses modern `fetch()` instead of Node.js `https` module
- **Consistent Pattern**: Matches other lambda functions in the project
- **Field Mapping**: Extracts proper field labels from `Properties__c`
- **Error Handling**: Comprehensive error handling with meaningful messages
- **Multi-Operation**: Supports both GET (fetch) and DELETE operations in one function

#### Operations Supported

##### GET/POST - Fetch Submissions

Returns all submissions for a form version with field mappings.

##### DELETE - Delete Submissions

Deletes multiple submissions by their IDs.

**DELETE Request Format:**

```json
{
  "userId": "string",
  "instanceUrl": "string",
  "formVersionId": "string",
  "submissionIds": ["id1", "id2", "id3"],
  "accessToken": "string" // Optional
}
```

**DELETE Response Format:**

```json
{
  "success": true,
  "message": "Deleted 2 of 3 submissions",
  "results": [
    {
      "id": "submission_id_1",
      "success": true
    },
    {
      "id": "submission_id_2",
      "success": false,
      "error": "Record not found"
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

## Deployment

### Prerequisites

1. AWS CLI configured with appropriate permissions
2. Node.js 18+ installed
3. Access to Salesforce org with form data

### Steps

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Test locally (optional):**

   ```bash
   # Edit the test function in getFormSubmissions.js with your test data
   # Uncomment the testLocally() call at the end of the file
   node getFormSubmissions.js
   ```

3. **Create deployment package:**

   ```bash
   zip -r getFormSubmissions.zip getFormSubmissions.js package.json node_modules/
   ```

4. **Deploy to AWS Lambda:**

   ```bash
   aws lambda create-function \
     --function-name getFormSubmissions \
     --runtime nodejs18.x \
     --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
     --handler getFormSubmissions.handler \
     --zip-file fileb://getFormSubmissions.zip \
     --timeout 30 \
     --memory-size 256
   ```

5. **Update function (for subsequent deployments):**
   ```bash
   aws lambda update-function-code \
     --function-name getFormSubmissions \
     --zip-file fileb://getFormSubmissions.zip
   ```

### Environment Variables

Set these in your Lambda function configuration:

- `GET_ACCESS_TOKEN_URL`: URL for the access token service (default: https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/prod/getAccessToken)
- `NODE_ENV`: Environment (production/development)

### API Gateway Integration

If using API Gateway, configure:

- **Method**: POST
- **CORS**: Enable for your domain
- **Integration Type**: Lambda Function
- **Lambda Function**: getFormSubmissions

### Error Handling

The function handles various error scenarios:

- Invalid JSON in request body (400)
- Missing required parameters (400)
- Salesforce authentication failures (500)
- Salesforce query failures (500)
- JSON parsing errors for submission data (logged, but doesn't fail)

### Logging

The function logs:

- Incoming requests
- SOQL queries executed
- Number of records found
- Parsing errors for individual submissions
- Final response summary

### Security Considerations

1. **Access Token**: Function can use provided token or fetch new one
2. **CORS**: Configured to allow cross-origin requests
3. **Input Validation**: Validates required parameters
4. **Error Messages**: Sanitized to avoid exposing sensitive information

## Troubleshooting

### Common Issues

1. **"Missing required parameters"**

   - Ensure userId, instanceUrl, and formVersionId are provided in request body

2. **"Authentication failed"**

   - Check if GET_ACCESS_TOKEN_URL is correct
   - Verify Salesforce credentials are valid

3. **"Salesforce query failed"**

   - Check if form version exists in Salesforce
   - Verify field names match your Salesforce schema

4. **Empty submissions array**
   - Check if submissions exist for the form version
   - Verify Submission**c object has correct relationship to Form_Version**c

### Testing

Use tools like Postman or curl to test:

```bash
curl -X POST https://your-api-gateway-url/getFormSubmissions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "instanceUrl": "your-instance.salesforce.com",
    "formVersionId": "your-form-version-id"
  }'
```

## Support

For issues or questions, check:

1. CloudWatch logs for the Lambda function
2. API Gateway logs if using API Gateway
3. Salesforce debug logs for query issues
