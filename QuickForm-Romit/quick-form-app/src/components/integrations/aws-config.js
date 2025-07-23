const awsConfig = {
  Auth: {
    Cognito: {
      // REQUIRED - Amazon Cognito Identity Pool ID
      identityPoolId: 'us-east-1:7369c253-4afc-4f4b-89df-07822b668440', // e.g. 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      // REQUIRED - Amazon Cognito Region
      region: 'us-east-1', // e.g. 'us-east-1'
      // OPTIONAL - Amazon Cognito User Pool ID (if using User Pools)
      userPoolId: 'us-east-1_AlL651JJl', // e.g. 'us-east-1_xxxxxxxx'
      // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string, if using User Pools)
      userPoolWebClientId: '60te4rqf6iuvn5b3445dnb21lk', // e.g. 'xxxxxxxxxxxxxxxxxxxxxxxxxx'

    }
  }
};

export default awsConfig;