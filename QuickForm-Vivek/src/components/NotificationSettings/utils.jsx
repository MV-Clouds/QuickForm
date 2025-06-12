'use client'

export const formFields = [
  { id: 'fullName', label: 'Full Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'country', label: 'Country' }
];

export const emailTemplates = [
  {
    "id": "welcome",
    "name": "Welcome Email",
    "icon": "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    "subject": "Welcome to Our Platform, {{fullName}}!",
    "body": "<p>Dear {{fullName}},</p><p>Welcome to <strong>QuickForm</strong> by <strong>MV Clouds</strong>! 🎉</p><p>We’re absolutely thrilled to have you join us. You successfully signed up on <strong>{{submissionDate}}</strong>, and you're now part of a growing community that values speed, simplicity, and power in form building.</p><p><strong>QuickForm</strong> is designed to help you create smart, responsive forms effortlessly — whether it’s for feedback, surveys, applications, or lead capture. Our goal is to make complex form logic, automation, and styling feel intuitive and, well... quick.</p><p>Here's what you can do right now:</p><ul><li>🚀 Start creating forms with drag &amp; drop ease</li><li>📊 View real-time submissions and analytics</li><li>🔗 Embed forms directly into your website or apps</li><li>⚙️ Automate responses and integrate with your workflow</li></ul><p>Need help? Visit our <a href=\"https://support.mvclouds.com\" target=\"_blank\" rel=\"noopener noreferrer\">Help Center</a> or reach out to <a href=\"mailto:support@mvclouds.com\">support@mvclouds.com</a>. Our team is here to assist you every step of the way.</p><p>Once again, welcome aboard. Let’s build something amazing together.</p><p>Warm regards,<br /><strong>MV Clouds</strong> Team</p>"
  }
  ,
  {
    "id": "reminder",
    "name": "Reminder Email",
    "icon": "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    "subject": "Reminder: Action Required for {{formName}}",
    "body": "<p>Dear {{fullName}},</p><p>This is a friendly reminder from <strong>MV Clouds</strong> to complete your pending action for <strong>{{formName}}</strong>.</p><p>We noticed that you haven’t submitted your information yet. To ensure your data is processed on time, please complete the required form by <strong>{{submissionDate}}</strong>. Timely submission helps us serve you better and avoid any unnecessary delays in your workflow.</p><p>Here's a quick overview of what you can do with <strong>QuickForm</strong>:</p><ul><li>📝 Fill out detailed forms in minutes</li><li>📥 Save drafts and resume later</li><li>📧 Get instant confirmation emails</li><li>🔒 Your data is safe with enterprise-grade encryption</li></ul><p>If you have any questions or need assistance, our support team is just one click away. Visit our <a href=\"https://support.mvclouds.com\" target=\"_blank\" rel=\"noopener noreferrer\">Help Center</a> or email us at <a href=\"mailto:support@mvclouds.com\">support@mvclouds.com</a>.</p><p>We appreciate your attention to this matter. Thank you for choosing <strong>QuickForm</strong> by <strong>MV Clouds</strong>.</p><p>Best regards,<br /><strong>MV Clouds</strong> Team</p>"
  }
  ,
  {
    "id": "confirmation",
    "name": "Confirmation Email",
    "icon": "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    "subject": "Submission Confirmed for {{formName}}",
    "body": "<p>Dear {{fullName}},</p><p>Thank you for submitting your response to <strong>{{formName}}</strong> via <strong>QuickForm</strong> by <strong>MV Clouds</strong>. We have successfully received your submission on <strong>{{submissionDate}}</strong>.</p><p>Your input is important to us, and we will review your submission carefully. If any additional information or follow-up is required, our team will reach out to you promptly.</p><p>With QuickForm, you can expect a seamless experience where your data is securely handled and processed efficiently. We’re committed to providing you with the best service possible to ensure your needs are met.</p><p>In the meantime, if you have any questions or need assistance, please do not hesitate to contact our support team at <a href=\"mailto:support@mvclouds.com\">support@mvclouds.com</a> or visit our <a href=\"https://support.mvclouds.com\" target=\"_blank\" rel=\"noopener noreferrer\">Help Center</a>.</p><p>Thank you once again for choosing <strong>QuickForm</strong>. We look forward to assisting you further.</p><p>Best regards,<br /><strong>MV Clouds</strong> Team</p>"
  }
  ,
  {
    "id": "update",
    "name": "Update Email",
    "icon": "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    "subject": "Update: Changes to {{formName}}",
    "body": "<p>Dear {{fullName}},</p><p>We wanted to inform you that important updates have been made to <strong>{{formName}}</strong> as of <strong>{{submissionDate}}</strong>. These changes are designed to improve your experience and ensure the information you provide is always up-to-date.</p><p>Please take a moment to review the modifications at your earliest convenience to stay informed and ensure your records remain accurate.</p><p>At <strong>MV Clouds</strong>, we’re committed to continuously enhancing <strong>QuickForm</strong> to meet your needs effectively. Your feedback is invaluable to us, so if you have any questions or concerns regarding these updates, please don’t hesitate to reach out.</p><p>You can contact our support team at <a href=\"mailto:support@mvclouds.com\">support@mvclouds.com</a> or visit our <a href=\"https://support.mvclouds.com\" target=\"_blank\" rel=\"noopener noreferrer\">Help Center</a> for assistance.</p><p>Thank you for being a valued member of the <strong>QuickForm</strong> community.</p><p>Best regards,<br /><strong>MV Clouds</strong> Team</p>"
  }
  ,
  {
    "id": "thank-you",
    "name": "Thank You Email",
    "icon": "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2",
    "subject": "Thank You, {{fullName}}!",
    "body": "<p>Dear {{fullName}},</p><p>Thank you for your recent submission to <strong>{{formName}}</strong> on <strong>{{submissionDate}}</strong>. We truly appreciate you taking the time to participate and share your valuable information with us.</p><p>At <strong>MV Clouds</strong>, we strive to make every interaction seamless and meaningful. Your input helps us improve our platform, QuickForm, to better serve your needs and those of our community.</p><p>If you have any questions or need further assistance, please do not hesitate to contact our support team at <a href=\"mailto:support@mvclouds.com\">support@mvclouds.com</a> or visit our <a href=\"https://support.mvclouds.com\" target=\"_blank\" rel=\"noopener noreferrer\">Help Center</a>. We’re always here to help!</p><p>Thanks again for your participation. We look forward to continuing to support you with QuickForm.</p><p>Warm regards,<br /><strong>MV Clouds</strong> Team</p>"
  }
  
];

export const smsTemplates = [
  {
    id: 'default-sms',
    name: 'Default SMS',
    icon: 'M12 1v2m0 18v2m-9.66-17.66l1.42 1.42m15.52 15.52l-1.42 1.42M1 12h2m18 0h2M4.34 4.34l1.42-1.42m15.52 15.52l-1.42-1.42',
    body: 'Hi {{fullName}}, your {{formName}} submission was received on {{submissionDate}}. Thanks!'
  }
];


export const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],        // formatting
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ direction: 'rtl' }],
    [{ size: ['small', false, 'large', 'huge'] }],
    [{ color: [] }, { background: [] }],
    [{ font: [] }],
    [{ align: [] }],
    ['link', 'image', 'video'],
    ['code-block'],
    ['clean'] // remove formatting
  ]
};

export const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'script',
  'indent',
  'direction',
  'size',
  'color', 'background',
  'font',
  'align',
  'link', 'image', 'video',
  'code-block'
];
