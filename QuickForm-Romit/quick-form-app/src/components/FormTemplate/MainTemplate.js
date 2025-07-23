import { useState, useEffect } from "react";
import FormTemplate from './FormTemplate';
import {  useNavigate } from "react-router-dom";

const MainTemplate = () => {
    const [data, setData] = useState();
    const [token, setToken] = useState();
    const [showModal, setShowModal] = useState(true);
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
        const [loading, setLoading] = useState(false); // <-- Add this
    const navigate = useNavigate();
    useEffect(() => {
        async function fetchData() {
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
                });
                const tokenData = await response.json();
                setToken(tokenData.access_token);
                if (!response.ok || tokenData.error) {
                    throw new Error(tokenData.error || 'Failed to fetch access token');
                }
                console.log('tokenData' , tokenData);
                
            } catch {
                setData(null);
            }
        }
        fetchData();
        
    }, [userId, instanceUrl]);

    const fetchSelectTemplate = async (selectedTemplate) => {
         setLoading(true); 
        console.log('Fetch token' , token);
        console.log({
                    userId,
                    instanceUrl,
                    selectedTemplate,
                });
        
        if (!token) return;
        try {
            const queryResponse = await fetch('https://a3vtckwcyl.execute-api.us-east-1.amazonaws.com/create-form-fields/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId,
                    instanceUrl,
                    formData : selectedTemplate,
                }),
            });
            const res = await queryResponse.json();
            setData(res);
            console.log('Query Response', res);
            setLoading(false)
            navigate(`/form-builder/${res.formVersionId}`);
        } catch (error) {
            setLoading(false); // <-- Hide loading on error
            console.error('Error fetching template:', error);
        }
    };

    const handleClose = () => {
        navigate('/home')
        setShowModal(false);
    };

    return (
        <div>
            {showModal && (
                <FormTemplate
                    onTemplateSelect={fetchSelectTemplate}
                    onClose={handleClose}
                    loading={loading} // <-- Pass loading
                />
            )}
            {/*+ other UI here */}
        </div>
    );
};

export default MainTemplate;