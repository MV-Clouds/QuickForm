// // src/app/api/sendMail/route.js
// import nodemailer from 'nodemailer';

// export async function POST(request) {
//   const { name, email, message , htmlContent } = await request.json();
//   // Create a test account or replace with real credentials.
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true, // true for 465, false for other ports
//   auth: {
//     user: process.env.USER,
//     pass: process.env.PASSWORD 
//   }
// });
//   try {
//       const info = await transporter.sendMail({
//         from: process.env.USER,
//         to: email,
//         subject: "Hello ✔",
//         text: message, // plain‑text body
//         html: "<h1>Hello world?</h1><p>This is an <b>HTML</b> email.</p>"
//       });
    
     
//     return Response.json({ success: true , message : info.messageId });
//   } catch (error) {
//     console.error('Email error:', error);
//     return new Response(JSON.stringify({ success: false, error: 'Email failed' }), {
//       status: 500,
//     });
//   }
// }

export async function GET() {
  return Response.json({ message: "GET request received successfully!" });
}