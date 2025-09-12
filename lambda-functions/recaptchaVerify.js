export const handler = async (event) => {
  try {
    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const token = body.token;

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Missing reCAPTCHA token" }),
      };
    }

    // reCAPTCHA secret key (store in AWS Secrets Manager or Lambda env variable)
    const secretKey = '6LepAsMrAAAAAOEOOpxX8IRu0aiTvmUlfkLvxR8B';

    // Verify token with Google
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
console.log('Data ',data);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // adjust for your domain
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Server error" }),
    };
  }
};
