import React, { useEffect, useState } from 'react';

const GetFormTemplate = () => {
    const templates = [
        {
            id: 'blank',
            title: 'Start from Scratch',
            description: 'Build a custom form with drag-and-drop.',
            category: 'All',
            fields: 0,
            isPopular: false,
            isNew: true,
            usageCount: 0,
            completionRate: 0,
            hasPayment: false,
            hasConditionalLogic: false,
            isMobileFriendly: true,
        },
        {
            id: 'event-registration',
            title: 'Event Registration',
            description: 'Collect names, emails, and ticket choices.',
            category: 'Registrations',
            fields: 5,
            isPopular: true,
            isNew: false,
            usageCount: 1200,
            completionRate: 90,
            hasPayment: true,
            hasConditionalLogic: true,
            isMobileFriendly: true,
        },
        {
            id: 'customer-feedback',
            title: 'Customer Feedback',
            description: 'Gather product reviews and satisfaction ratings.',
            category: 'Surveys',
            fields: 7,
            isPopular: true,
            isNew: false,
            usageCount: 850,
            completionRate: 78,
            hasPayment: false,
            hasConditionalLogic: false,
            isMobileFriendly: true,
        },
        {
            id: 'contact-form',
            title: 'Contact Form',
            description: 'Basic form for website visitor inquiries.',
            category: 'Contact',
            fields: 4,
            isPopular: false,
            isNew: false,
            usageCount: 3200,
            completionRate: 95,
            hasPayment: false,
            hasConditionalLogic: false,
            isMobileFriendly: true,
        },
        {
            id: 'job-application',
            title: 'Job Application',
            description: 'Collect resumes and candidate information.',
            category: 'HR',
            fields: 8,
            isPopular: false,
            isNew: true,
            usageCount: 150,
            completionRate: 65,
            hasPayment: false,
            hasConditionalLogic: true,
            isMobileFriendly: true,
        },
        {
            id: 'course-enrollment',
            title: 'Course Enrollment',
            description: 'Register students for classes with payment.',
            category: 'Education',
            fields: 6,
            isPopular: false,
            isNew: false,
            usageCount: 420,
            completionRate: 88,
            hasPayment: true,
            hasConditionalLogic: false,
            isMobileFriendly: true,
        },
    ];
    return templates;
};


const useForms = () => {
    const [data, setData] = useState();
    useEffect(() => {
        async function fetchData() {
            const userId = sessionStorage.getItem('userId');
            const instanceUrl = sessionStorage.getItem('instanceUrl');
            console.log(userId, instanceUrl);
            try {
                const response = await fetch('https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/getAccessToken/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId,
                        instanceUrl,
                    }),
                })

                const tokenData = await response.json();
                console.log('token ', tokenData);
                if (!response.ok || tokenData.error) {
                    throw new Error(tokenData.error || 'Failed to fetch access token');
                }
                const token = tokenData.access_token;

                const queryResponse = await fetch('https://t08pr41vk7.execute-api.us-east-1.amazonaws.com/fetch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token,
                        instanceUrl
                    }),
                })
                const res = await queryResponse.json();
                console.log('Query Response', res);
                setData(res);
            } catch {
                setData(null);
            }
        }
        fetchData();
    }, [])
    return data;
}
export { GetFormTemplate, useForms };