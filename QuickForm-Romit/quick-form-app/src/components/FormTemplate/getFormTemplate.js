import React, { useEffect, useState } from 'react';

const GetFormTemplate = () => {
    const templates = [
        {
            "id": "blank",
            "Name": "New Form",
            "Description__c": "",
            "category": "General",
            "isPopular": false,
            "isNew": true,
            "usageCount": 0,
            "completionRate": 0,
            "hasPayment": false,
            "hasConditionalLogic": false,
            "isMobileFriendly": true,
            "formVersion": {
                "Name": "New Form",
                "Version__c": '1',
                "Stage__c": "Draft",
            },
            "formFields": [

                {
                    "Unique_Key__c": "field-" + Date.now() + "-" + Math.random().toString(36).substring(2, 11),
                    "Field_Type__c": "text",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": false
                    },
                    "Name": "Sample Field",
                    "placeholder": {
                        "main": ""
                    }
                }

            ]
        },
        {
            id: 'order-form',
            Name: 'Order Form',
            Description__c: 'Build Order Form',
            category: 'Ecommerce',
            isPopular: true,
            isNew: true,
            usageCount: 100,
            completionRate: '100%',
            hasPayment: false,
            hasConditionalLogic: false,
            isMobileFriendly: true,
            formVersion: {
                "Name": 'Order Form',
                Version__c: 0,
                Stage__c: 'Draft',
            },
            formFields: [

                {
                    Unique_Key__c: "default-header",
                    Field_Type__c: "header",
                    Name: "Order Form",
                    "alignment": "center"
                },
                {
                    Unique_Key__c: "field-1750671907483-e7ebhers5",
                    Field_Type__c: "fullname",


                    Properties__c: {
                        "pattern": "^[a-zA-Z\\s'-]+$",
                        "description": "Only letters, spaces, hyphens, and apostrophes allowed."
                    }
                },
                {
                    Unique_Key__c: "field-1750671918396-6fv3i3eet",
                    Field_Type__c: "email",


                    Properties__c: {
                        "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
                        "description": "Must be a valid email (e.g., user@example.com)."
                    },
                    "placeholder": {
                        "main": "ex : myname@example.com"
                    }
                },
                {
                    Unique_Key__c: "field-1750671925232-pfejvalym",
                    Field_Type__c: "phone",
                    Name: "Contact Number",


                    Properties__c: {
                        "pattern": ".*",
                        "description": "No specific validation rules."
                    },
                    "placeholder": {
                        "main": "(000) 000-0000"
                    }
                },
                {
                    Unique_Key__c: "field-1750671975080-niyu32n02",
                    Field_Type__c: "address",


                    Properties__c: {
                        "pattern": "^[\\w\\s\\-\\.,#]+$",
                        "description": "Alphanumeric, spaces, hyphens, commas, and periods allowed."
                    },
                    Name: "Billing Address",
                    "subFields": { "street": { "visiblesubFields": true, "label": "Street Address", "value": "", "placeholder": "Enter street", "visible": true }, "city": { "visible": true, "label": "City", "value": "", "placeholder": "Enter city" }, "state": { "visible": true, "label": "State", "value": "", "placeholder": "Enter state" }, "country": { "visible": true, "label": "Country", "value": "", "placeholder": "Enter country" }, "postal": { "visible": false, "label": "Postal Code", "value": "", "placeholder": "Enter postal code" } }, "label": "Address"
                },
                {
                    Unique_Key__c: "field-1750672045350-9wbl9xlc3",
                    Field_Type__c: "radio",


                    Properties__c: {
                        "pattern": ".*",
                        "description": "No specific validation rules."
                    },
                    Name: "Is shipping address same as billing address?",
                    "defaultValue": "Yes",
                    "options": [
                        "Yes",
                        "No"
                    ],
                    "radioRelatedValues": {
                        "Yes": "",
                        "No": ""
                    }
                },
                {
                    Unique_Key__c: "field-1750672298683-lgmpit52v",
                    Field_Type__c: "radio",


                    Properties__c: {
                        "pattern": ".*",
                        "description": "No specific validation rules."
                    },
                    "options": [
                        "Yes",
                        "No"
                    ],
                    "radioRelatedValues": {
                        "No": "No",
                        "Yes": "Yes"
                    },
                    Name: "Send Gift?",
                    "defaultValue": "Yes"
                },
                {
                    Unique_Key__c: "field-1750672393033-d77q92460",
                    Field_Type__c: "longtext",


                    Properties__c: {
                        "pattern": "^.{1,1000}$",
                        "description": "Maximum 1000 characters allowed."
                    },
                    Name: "Special Instructions",
                    "placeholder": {
                        "main": " "
                    }
                },
                {
                    Unique_Key__c: "field-1750672619291-bbffaj921",
                    Field_Type__c: "dropdown",


                    Properties__c: {
                        "pattern": ".*",
                        "description": "No specific validation rules."
                    },
                    Name: "Payment Methods",
                    "placeholder": {
                        "main": "Select Payment Method"
                    },
                    "options": [
                        "Debit or Credit Card",
                        "Paypal or other"
                    ],
                    "dropdownRelatedValues": {
                        "Debit or Credit Card": "debitCredit",
                        "Paypal or other": "paypal"
                    }
                }

            ]
        },
        {
            "id": "event-registration-form",
            "Name": "Event Registration",
            "Description__c": "Form for attendees to register for events",
            "category": "Events",
            "isPopular": true,
            "isNew": true,
            "usageCount": 10,
            "completionRate": '80%',
            "hasPayment": true,
            "hasConditionalLogic": true,
            "isMobileFriendly": true,
            "formVersion": {
                "Name": "Event Registration",
                "Version__c": '1',
                "Stage__c": "Draft"
            },
            "formFields": [

                {
                    "Unique_Key__c": "field-1712345678901-abc123def",
                    "Field_Type__c": "fullname",


                    "Properties__c": {
                        "pattern": "^[a-zA-Z\\s'-]+$",
                        "description": "Name as it should appear on your badge",
                        "required": true
                    },
                    "Name": "Full Name"
                },
                {
                    "Unique_Key__c": "field-1712345678902-ghi456jkl",
                    "Field_Type__c": "email",


                    "Properties__c": {
                        "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
                        "description": "Event confirmation will be sent here",
                        "required": true
                    },
                    "Name": "Email Address",
                    "placeholder": {
                        "main": "your.email@example.com"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678903-mno789pqr",
                    "Field_Type__c": "phone",


                    "Properties__c": {
                        "pattern": "^[\\d\\s\\-\\(\\)]{10,15}$",
                        "description": "For urgent event updates",
                        "required": true
                    },
                    "Name": "Mobile Number",
                    "placeholder": {
                        "main": "(123) 456-7890"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678904-stu123vwx",
                    "Field_Type__c": "dropdown",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Select your registration type",
                        "required": true
                    },
                    "Name": "Registration Type",
                    "options": [
                        "General Admission",
                        "VIP Pass",
                        "Student",
                        "Speaker",
                        "Exhibitor",
                        "Press"
                    ],
                    "placeholder": {
                        "main": "Select registration type"
                    },
                    "dropdownRelatedValues": {
                        "General Admission": "general",
                        "VIP Pass": "vip",
                        "Student": "student",
                        "Speaker": "speaker",
                        "Exhibitor": "exhibitor",
                        "Press": "press"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678905-yza456bcd",
                    "Field_Type__c": "price",


                    "Properties__c": {
                        "pattern": "^\\$?\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?$",
                        "description": "Total amount to be paid",
                        "required": true,
                        "readOnly": true
                    },
                    "Name": "Registration Fee",
                    "defaultValue": "100.00",
                    "currency": "USD"
                },
                {
                    "Unique_Key__c": "field-1712345678906-efg789hij",
                    "Field_Type__c": "checkbox",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Select all that apply",
                        "required": false
                    },
                    "Name": "Add-ons",
                    "options": [
                        "Conference Dinner (+$50)",
                        "Workshop Package (+$75)",
                        "Swag Bag (+$25)",
                        "VIP Lounge Access (+$100)"
                    ],
                    "checkboxRelatedValues": {
                        "Conference Dinner (+$50)": "50",
                        "Workshop Package (+$75)": "75",
                        "Swag Bag (+$25)": "25",
                        "VIP Lounge Access (+$100)": "100"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678907-klm123nop",
                    "Field_Type__c": "radio",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Dietary Requirements",
                    "options": [
                        "None",
                        "Vegetarian",
                        "Vegan",
                        "Gluten-Free",
                        "Kosher",
                        "Halal",
                        "Other (please specify)"
                    ],
                    "radioRelatedValues": {
                        "Other (please specify)": "otherDiet"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678908-qrs456tuv",
                    "Field_Type__c": "longtext",


                    "Properties__c": {
                        "pattern": "^.{0,500}$",
                        "description": "Maximum 500 characters",
                        "required": false
                    },
                    "Name": "Special Requirements",
                    "placeholder": {
                        "main": "Accessibility needs, allergies, etc."
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678909-wxy789zab",
                    "Field_Type__c": "fileupload",


                    "Properties__c": {
                        "pattern": ".*\\.(pdf|jpg|jpeg|png)$",
                        "description": "For student/group discounts (max 5MB)",
                        "required": false,
                        "maxSize": 5,
                        "allowedTypes": ["application/pdf", "image/jpeg", "image/png"]
                    },
                    "Name": "Proof of Eligibility"
                },
                {
                    "Unique_Key__c": "field-1712345678910-cde123fgh",
                    "Field_Type__c": "dropdown",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "How did you hear about this event?",
                        "required": false
                    },
                    "Name": "Referral Source",
                    "options": [
                        "Email Newsletter",
                        "Social Media",
                        "Friend/Colleague",
                        "Website",
                        "Search Engine",
                        "Other"
                    ]
                },
                {
                    "Unique_Key__c": "field-1712345678911-ijk456lmn",
                    "Field_Type__c": "checkbox",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Agreements",
                    "options": [
                        "I agree to the terms and conditions",
                        "I consent to receive event communications",
                        "I give permission to use photos/videos taken at the event"
                    ]
                },
                {
                    "Unique_Key__c": "field-1712345678912-opq789rst",
                    "Field_Type__c": "payment",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Secure payment processing",
                        "required": true
                    },
                    "Name": "Payment Method",
                    "options": [
                        "Credit Card",
                        "PayPal",
                        "Bank Transfer"
                    ],
                    "paymentRelatedValues": {
                        "Credit Card": "cc",
                        "PayPal": "paypal",
                        "Bank Transfer": "bank"
                    }
                }

            ]
        },
        {
            "id": "customer-feedback-form",
            "Name": "Customer Feedback",
            "Description__c": "Collect customer satisfaction and feedback",
            "category": "Customer Service",
            "isPopular": true,
            "isNew": false,
            "usageCount": 1,
            "completionRate": '100%',
            "hasPayment": false,
            "hasConditionalLogic": true,
            "isMobileFriendly": true,
            "formVersion": {
                "Name": "Customer Feedback",
                "Version__c": '1',
                "Stage__c": "Draft",
            },
            "formFields": [

                {
                    "Unique_Key__c": "default-header",
                    "Field_Type__c": "header",
                    Name: "Customer Feedback",
                    "alignment": "center",
                    "subheading": "We value your opinion! Please share your experience with us."
                },
                {
                    "Unique_Key__c": "field-1712345678901-abc123def",
                    "Field_Type__c": "radio",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Overall Satisfaction",
                    "options": [
                        "Very Satisfied",
                        "Satisfied",
                        "Neutral",
                        "Dissatisfied",
                        "Very Dissatisfied"
                    ],
                    "defaultValue": "Satisfied",
                    "visualStyle": "smiley",
                    "radioRelatedValues": {
                        "Very Satisfied": "5",
                        "Satisfied": "4",
                        "Neutral": "3",
                        "Dissatisfied": "2",
                        "Very Dissatisfied": "1"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678902-ghi456jkl",
                    "Field_Type__c": "dropdown",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "What was the nature of your interaction?",
                        "required": true
                    },
                    "Name": "Feedback Category",
                    "options": [
                        "Product Quality",
                        "Customer Service",
                        "Delivery Experience",
                        "Website Experience",
                        "Pricing",
                        "Other"
                    ],
                    "placeholder": {
                        "main": "Select category"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678903-mno789pqr",
                    "Field_Type__c": "rating",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Rate your experience (1-5 stars)",
                        "required": true
                    },
                    "Name": "Rating",
                    "maxRating": 5,
                    "defaultValue": 3,
                    "ratingLabels": {
                        "1": "Poor",
                        "2": "Fair",
                        "3": "Good",
                        "4": "Very Good",
                        "5": "Excellent"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678904-stu123vwx",
                    "Field_Type__c": "longtext",


                    "Properties__c": {
                        "pattern": "^.{0,1000}$",
                        "description": "Please provide details about your experience",
                        "required": false
                    },
                    "Name": "Detailed Feedback",
                    "placeholder": {
                        "main": "What did you like or what could we improve?"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678905-yza456bcd",
                    "Field_Type__c": "checkbox",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Select all that apply",
                        "required": false
                    },
                    "Name": "What did you like most?",
                    "options": [
                        "Product Quality",
                        "Friendly Staff",
                        "Fast Delivery",
                        "Easy Website Navigation",
                        "Competitive Pricing",
                        "None of the above"
                    ]
                },
                {
                    "Unique_Key__c": "field-1712345678906-efg789hij",
                    "Field_Type__c": "radio",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Would you recommend us to others?",
                    "options": [
                        "Definitely Yes",
                        "Probably Yes",
                        "Not Sure",
                        "Probably Not",
                        "Definitely Not"
                    ],
                    "defaultValue": "Probably Yes"
                },
                {
                    "Unique_Key__c": "field-1712345678907-klm123nop",
                    "Field_Type__c": "fullname",


                    "Properties__c": {
                        "pattern": "^[a-zA-Z\\s'-]+$",
                        "description": "Optional - if you'd like us to follow up",
                        "required": false
                    },
                    "Name": "Your Name"
                },
                {
                    "Unique_Key__c": "field-1712345678908-qrs456tuv",
                    "Field_Type__c": "email",


                    "Properties__c": {
                        "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
                        "description": "Optional - for follow-up if needed",
                        "required": false
                    },
                    "Name": "Email Address",
                    "placeholder": {
                        "main": "your.email@example.com"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678909-wxy789zab",
                    "Field_Type__c": "phone",


                    "Properties__c": {
                        "pattern": "^[\\d\\s\\-\\(\\)]{10,15}$",
                        "description": "Optional - for urgent follow-up",
                        "required": false
                    },
                    "Name": "Phone Number",
                    "placeholder": {
                        "main": "(123) 456-7890"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678910-cde123fgh",
                    "Field_Type__c": "fileupload",


                    "Properties__c": {
                        "pattern": ".*\\.(jpg|jpeg|png|pdf)$",
                        "description": "Upload photos or documents if relevant (max 5MB)",
                        "required": false,
                        "maxSize": 5,
                        "allowedTypes": ["image/jpeg", "image/png", "application/pdf"]
                    },
                    "Name": "Attachments"
                },
                {
                    "Unique_Key__c": "field-1712345678911-ijk456lmn",
                    "Field_Type__c": "checkbox",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Consent",
                    "options": [
                        "I agree to my feedback being used for service improvement",
                        "I consent to be contacted about my feedback if needed"
                    ]
                }

            ]
        },
        {
            "id": "contact-form",
            "Name": "Contact Us",
            "Description__c": "General purpose contact form for customer inquiries",
            "category": "Customer Service",
            "isPopular": true,
            "isNew": false,
            "usageCount": 200,
            "completionRate": '100%',
            "hasPayment": false,
            "hasConditionalLogic": true,
            "isMobileFriendly": true,
            "formVersion": {
                "Name": "Contact Us",
                "Version__c": '1',
                "Stage__c": "Draft",
            },
            "formFields": [

                {
                    "Unique_Key__c": "default-header",
                    "Field_Type__c": "header",
                    Name: "Contact Us",
                    "alignment": "center",
                    "subheading": "We'll get back to you within 24 hours"
                },
                {
                    "Unique_Key__c": "field-1712345678901-abc123def",
                    "Field_Type__c": "fullname",


                    "Properties__c": {
                        "pattern": "^[a-zA-Z\\s'-]+$",
                        "description": "How should we address you?",
                        "required": true
                    },
                    "Name": "Your Name"
                },
                {
                    "Unique_Key__c": "field-1712345678902-ghi456jkl",
                    "Field_Type__c": "email",


                    "Properties__c": {
                        "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
                        "description": "Where should we reply?",
                        "required": true
                    },
                    "Name": "Email Address",
                    "placeholder": {
                        "main": "your.email@example.com"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678903-mno789pqr",
                    "Field_Type__c": "phone",


                    "Properties__c": {
                        "pattern": "^[\\d\\s\\-\\(\\)]{10,15}$",
                        "description": "Optional - for urgent matters",
                        "required": false
                    },
                    "Name": "Phone Number",
                    "placeholder": {
                        "main": "(123) 456-7890"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678904-stu123vwx",
                    "Field_Type__c": "dropdown",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "What is this regarding?",
                        "required": true
                    },
                    "Name": "Subject",
                    "options": [
                        "General Inquiry",
                        "Sales Question",
                        "Technical Support",
                        "Billing Question",
                        "Partnership Opportunity",
                        "Feedback/Suggestion",
                        "Other"
                    ],
                    "placeholder": {
                        "main": "Select subject"
                    },
                    "dropdownRelatedValues": {
                        "Other": "otherSubject"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678905-yza456bcd",
                    "Field_Type__c": "longtext",


                    "Properties__c": {
                        "pattern": "^.{10,2000}$",
                        "description": "Please provide details (10-2000 characters)",
                        "required": true
                    },
                    "Name": "Your Message",
                    "placeholder": {
                        "main": "How can we help you today?"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678906-efg789hij",
                    "Field_Type__c": "fileupload",


                    "Properties__c": {
                        "pattern": ".*\\.(pdf|doc|docx|jpg|jpeg|png)$",
                        "description": "Optional attachments (max 5MB total)",
                        "required": false,
                        "maxSize": 5,
                        "maxFiles": 3,
                        "allowedTypes": [
                            "application/pdf",
                            "application/msword",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "image/jpeg",
                            "image/png"
                        ]
                    },
                    "Name": "Attachments"
                },
                {
                    "Unique_Key__c": "field-1712345678907-klm123nop",
                    "Field_Type__c": "radio",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Preferred Contact Method",
                    "options": [
                        "Email",
                        "Phone Call",
                        "Either is fine"
                    ],
                    "defaultValue": "Email"
                },
                {
                    "Unique_Key__c": "field-1712345678908-qrs456tuv",
                    "Field_Type__c": "checkbox",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Consent",
                    "options": [
                        "I agree to the privacy policy",
                        "I consent to being contacted regarding my inquiry"
                    ]
                },
                {
                    "Unique_Key__c": "field-1712345678909-wxy789zab",
                    "Field_Type__c": "captcha",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Please verify you're not a robot",
                        "required": true
                    },
                    "Name": "Security Check",
                    "captchaType": "reCAPTCHA_v2"
                }

            ]
        },
        {
            "id": "job-application-form",
            "Name": "Job Application",
            "Description__c": "Standard job application form for candidates",
            "category": "Human Resources",
            "isPopular": true,
            "isNew": true,
            "usageCount": 5000,
            "completionRate": '100%',
            "hasPayment": false,
            "hasConditionalLogic": true,
            "isMobileFriendly": true,
            "formVersion": {
                "Name": "Job Application",
                "Version__c": '1',
                "Stage__c": "Draft",
            },
            "formFields": [

                {
                    "Unique_Key__c": "default-header",
                    "Field_Type__c": "header",
                    Name: "Job Application",
                    "alignment": "center"
                },
                {
                    "Unique_Key__c": "field-1712345678901-abc123def",
                    "Field_Type__c": "fullname",


                    "Properties__c": {
                        "pattern": "^[a-zA-Z\\s'-]+$",
                        "description": "Please enter your full legal name",
                        "required": true
                    },
                    "Name": "Full Name"
                },
                {
                    "Unique_Key__c": "field-1712345678902-ghi456jkl",
                    "Field_Type__c": "email",


                    "Properties__c": {
                        "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
                        "description": "We'll contact you at this email",
                        "required": true
                    },
                    "Name": "Email Address",
                    "placeholder": {
                        "main": "your.email@example.com"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678903-mno789pqr",
                    "Field_Type__c": "phone",


                    "Properties__c": {
                        "pattern": "^[\\d\\s\\-\\(\\)]{10,15}$",
                        "description": "Include area code",
                        "required": true
                    },
                    "Name": "Phone Number",
                    "placeholder": {
                        "main": "(123) 456-7890"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678904-stu123vwx",
                    "Field_Type__c": "address",


                    "Properties__c": {
                        "pattern": "^[\\w\\s\\-\\.,#]+$",
                        "description": "Your current address",
                        "required": true
                    },
                    "Name": "Current Address",
                    "visibleSubFields": {
                        "street": true,
                        "city": true,
                        "state": true,
                        "country": true,
                        "postal": true
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678905-yza456bcd",
                    "Field_Type__c": "link",


                    "Properties__c": {
                        "pattern": "^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$",
                        "description": "Link to your professional profile",
                        "required": false
                    },
                    "Name": "LinkedIn Profile",
                    "placeholder": {
                        "main": "https://linkedin.com/in/yourprofile"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678906-efg789hij",
                    "Field_Type__c": "dropdown",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Select the position you're applying for",
                        "required": true
                    },
                    "Name": "Position Applied For",
                    "options": [
                        "Software Engineer",
                        "Product Manager",
                        "UX Designer",
                        "Data Analyst",
                        "Marketing Specialist",
                        "Other"
                    ],
                    "placeholder": {
                        "main": "Select position"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678907-klm123nop",
                    "Field_Type__c": "price",


                    "Properties__c": {
                        "pattern": "^\\$?\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?$",
                        "description": "Your expected annual salary",
                        "required": false
                    },
                    "Name": "Salary Expectations",
                    "placeholder": {
                        "main": "$75,000"
                    },
                    "currency": "USD"
                },
                {
                    "Unique_Key__c": "field-1712345678908-qrs456tuv",
                    "Field_Type__c": "fileupload",


                    "Properties__c": {
                        "pattern": ".*\\.(pdf|doc|docx)$",
                        "description": "PDF or Word documents only (max 5MB)",
                        "required": true,
                        "maxSize": 5,
                        "allowedTypes": ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
                    },
                    "Name": "Resume Upload"
                },
                {
                    "Unique_Key__c": "field-1712345678909-wxy789zab",
                    "Field_Type__c": "fileupload",


                    "Properties__c": {
                        "pattern": ".*\\.(pdf|doc|docx)$",
                        "description": "Optional cover letter (PDF or Word)",
                        "required": false,
                        "maxSize": 5,
                        "allowedTypes": ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
                    },
                    "Name": "Cover Letter"
                },
                {
                    "Unique_Key__c": "field-1712345678910-cde123fgh",
                    "Field_Type__c": "checkbox",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Check all that apply",
                        "required": false
                    },
                    "Name": "How did you hear about us?",
                    "options": [
                        "Company Website",
                        "Job Board",
                        "Employee Referral",
                        "Social Media",
                        "Other"
                    ]
                },
                {
                    "Unique_Key__c": "field-1712345678911-ijk456lmn",
                    "Field_Type__c": "imageuploader",


                    "Properties__c": {
                        "pattern": ".*\\.(jpg|jpeg|png)$",
                        "description": "Professional headshot (optional)",
                        "required": false,
                        "maxSize": 2,
                        "allowedTypes": ["image/jpeg", "image/png"],
                        "maxDimensions": {
                            "width": 1000,
                            "height": 1000
                        }
                    },
                    "Name": "Profile Photo"
                },
                {
                    "Unique_Key__c": "field-1712345678912-opq789rst",
                    "Field_Type__c": "longtext",


                    "Properties__c": {
                        "pattern": "^.{1,2000}$",
                        "description": "Explain why you're a good fit for this role",
                        "required": true
                    },
                    "Name": "Cover Letter Text",
                    "placeholder": {
                        "main": "Type your cover letter here..."
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678913-uvw123xyz",
                    "Field_Type__c": "checkbox",
                     
                    
                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Acknowledgements",
                    "options": [
                        "I certify that all information provided is accurate",
                        "I authorize the company to contact my references",
                        "I agree to the privacy policy and terms of application"
                    ]
                }

            ]
        },
        {
            "id": "course-enrollment-form",
            "Name": "Course Enrollment",
            "Description__c": "Form for students to enroll in academic courses",
            "category": "Education",
            "isPopular": true,
            "isNew": true,
            "usageCount": 2000,
            "completionRate": '90%',
            "hasPayment": true,
            "hasConditionalLogic": true,
            "isMobileFriendly": true,
            "formVersion": {
                "Name": "Course Enrollment",
                "Version__c": '1',
                "Stage__c": "Draft",
            },
            "formFields": [

                {
                    "Unique_Key__c": "default-header",
                    "Field_Type__c": "header",
                    Name: "Course Enrollment",
                    "Properties__c": "Please complete all required fields to register"
                },
                {
                    "Unique_Key__c": "field-1712345678901-abc123def",
                    "Field_Type__c": "fullname",
                     
                    
                    "Properties__c": {
                        "pattern": "^[a-zA-Z\\s'-]+$",
                        "description": "Legal name as it appears on official documents",
                        "required": true
                    },
                    "Name": "Student Name"
                },
                {
                    "Unique_Key__c": "field-1712345678902-ghi456jkl",
                    "Field_Type__c": "email",


                    "Properties__c": {
                        "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
                        "description": "Institution email preferred",
                        "required": true
                    },
                    "Name": "Email Address",
                    "placeholder": {
                        "main": "student.name@school.edu"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678903-mno789pqr",
                    "Field_Type__c": "phone",


                    "Properties__c": {
                        "pattern": "^[\\d\\s\\-\\(\\)]{10,15}$",
                        "description": "Primary contact number",
                        "required": true
                    },
                    "Name": "Phone Number",
                    "placeholder": {
                        "main": "(123) 456-7890"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678904-stu123vwx",
                    "Field_Type__c": "dropdown",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Select your program of study",
                        "required": true
                    },
                    "Name": "Academic Program",
                    "options": [
                        "Computer Science",
                        "Business Administration",
                        "Engineering",
                        "Health Sciences",
                        "Liberal Arts",
                        "Other"
                    ],
                    "placeholder": {
                        "main": "Select program"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678905-yza456bcd",
                    "Field_Type__c": "checkbox",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Select all courses you wish to enroll in",
                        "required": true,
                        "minSelection": 1
                    },
                    "Name": "Course Selection",
                    "options": [
                        "Introduction to Programming (CS101)",
                        "Data Structures (CS201)",
                        "Database Systems (CS301)",
                        "Web Development (CS215)",
                        "Algorithms (CS401)"
                    ],
                    "checkboxRelatedValues": {
                        "Introduction to Programming (CS101)": "750",
                        "Data Structures (CS201)": "850",
                        "Database Systems (CS301)": "900",
                        "Web Development (CS215)": "800",
                        "Algorithms (CS401)": "950"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678906-efg789hij",
                    "Field_Type__c": "radio",


                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Enrollment Type",
                    "options": [
                        "Degree Student",
                        "Non-Degree Student",
                        "Continuing Education",
                        "Audit (No Credit)"
                    ],
                    "radioRelatedValues": {
                        "Degree Student": "degree",
                        "Non-Degree Student": "nondegree",
                        "Continuing Education": "conted",
                        "Audit (No Credit)": "audit"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678907-klm123nop",
                    "Field_Type__c": "fileupload",
                    "Properties__c": {
                        "pattern": ".*\\.(pdf|jpg|jpeg|png)$",
                        "description": "Upload proof of prerequisites (transcripts/certificates)",
                        "required": false,
                        "maxSize": 10,
                        "allowedTypes": [
                            "application/pdf",
                            "image/jpeg",
                            "image/png"
                        ]
                    },
                    "Name": "Supporting Documents"
                },
                {
                    "Unique_Key__c": "field-1712345678908-qrs456tuv",
                    "Field_Type__c": "price",
                    "Properties__c": {
                        "pattern": "^\\$?\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?$",
                        "description": "Calculated based on course selection",
                        "required": true,
                        "readOnly": true
                    },
                    "Name": "Total Tuition",
                    "currency": "USD",
                    "defaultValue": "0.00"
                },
                {
                    "Unique_Key__c": "field-1712345678909-wxy789zab",
                    "Field_Type__c": "dropdown",
                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Select your payment method",
                        "required": true
                    },
                    "Name": "Payment Method",
                    "options": [
                        "Credit/Debit Card",
                        "Bank Transfer",
                        "Financial Aid",
                        "Payment Plan",
                        "Scholarship"
                    ],
                    "placeholder": {
                        "main": "Select payment option"
                    }
                },
                {
                    "Unique_Key__c": "field-1712345678910-cde123fgh",
                    "Field_Type__c": "checkbox",
                    "Properties__c": {
                        "pattern": ".*",
                        "description": "",
                        "required": true
                    },
                    "Name": "Agreements",
                    "options": [
                        "I certify that all information provided is accurate",
                        "I agree to the tuition payment policy",
                        "I acknowledge the academic integrity policy"
                    ]
                },
                {
                    "Unique_Key__c": "field-1712345678911-ijk456lmn",
                    "Field_Type__c": "signature",
                    "Properties__c": {
                        "pattern": ".*",
                        "description": "Sign to confirm your enrollment",
                        "required": true
                    },
                    "Name": "Student Signature"
                }

            ]
        },
    ];

    function transformField(field, index, pageNumber = 1) {
        const {
            id,
            Name: formname, // Rename Name to formname
            Description__c, category, isPopular, isNew, usageCount, completionRate, hasPayment, hasConditionalLogic, isMobileFriendly,
            formFields,
            formVersion,
            ...rest
        } = field;

        // Everything except Unique_Key__c, Field_Type__c, Properties__c goes into Properties
        return {
            id,
            formname, Description__c, category, isPopular, isNew, usageCount, completionRate, hasPayment, hasConditionalLogic, isMobileFriendly,
            formFields: Array.isArray(formFields)
            ? formFields.map((ff, idx) => {
                // Extract the known fields
                const {
                Name,
                Unique_Key__c,
                Field_Type__c,
                Properties__c,
                ...otherProps
                } = ff;
                return {
                Name,
                Unique_Key__c,
                Field_Type__c,
                Order_Number__c: idx + 1,
                Page_Number__c: pageNumber,
                Properties__c : JSON.stringify({id : Unique_Key__c,type : Field_Type__c ,Properties__c , ...otherProps}),
                };
            })
            : [],
            formVersion,
            ...rest
        };
    }
    return templates.map((t, i) => transformField(t, i));
};


const useForms = () => {

}

export { GetFormTemplate, useForms };