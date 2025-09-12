import { useEffect, useState } from "react";
import { useSalesforceData } from "../Context/MetadataContext";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader";

const MainLayout = () => {
    const {
        metadata,
        formRecords,
        isLoading: contextLoading,
        error: contextError,
        fetchSalesforceData,
        userProfile,
        Fieldset,
        Folders,
        googleData,
        favoriteData
    } = useSalesforceData();

    const [token, settoken] = useState();
    const navigate = useNavigate();
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    const [isProcessing, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Loading');
    const handleCloneForm = (form) => {
        // Find published version or draft version to clone
        const versionToClone = form.FormVersions.find(v => v.Stage__c === 'Publish')
            || form.FormVersions.find(v => v.Stage__c === 'Draft');

        if (!versionToClone) {
            alert('No version found to clone.');
            return;
        }

        setCloningFormData({ form, versionToClone });
        setCloneFormNameDesc({ name: versionToClone.Name || '', description: versionToClone.Description__c || '' });
        setIsCloneFormNameOpen(true);
    };

    const handleCloneFormSubmit = async (fields) => {
        setIsLoading(true);
        setLoadingText('Cloning Form');
        const newName = fields.name || cloneFormNameDesc.name;
        const newDesc = fields.description || cloneFormNameDesc.description;

        if (!newName) {
            alert('Form name is required.');
            return;
        }

        setIsCloneFormNameOpen(false);
        if (!cloningFormData) return;

        const { form, versionToClone } = cloningFormData;
        console.log('Cloning ', cloningFormData);

        const cloneFormData = {
            formVersion: {
                Name: newName,
                Description__c: newDesc,
                Version__c: "1",
                Stage__c: 'Draft',
                // Copy other necessary fields if needed
            },
            formFields: (versionToClone.Fields || []).map((field, index) => ({
                Name: field.Name,
                Field_Type__c: field.Field_Type__c,
                Page_Number__c: field.Page_Number__c,
                Order_Number__c: index + 1,
                Properties__c: field.Properties__c,
                Unique_Key__c: field.Unique_Key__c,
            })),
            conditions: versionToClone.Conditions || [],
            Mappings: versionToClone.Mappings,
            ThankYou: versionToClone.ThankYou,
            Prefills: versionToClone.Prefills,
            Notifications: form.Notifications,
        };

        try {
            const userId = sessionStorage.getItem('userId');
            const instanceUrl = sessionStorage.getItem('instanceUrl');
            const accessToken = token || await fetchAccessToken(userId, instanceUrl);

            const response = await fetch(process.env.REACT_APP_CLONE_FORM, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    userId,
                    instanceUrl,
                    formData: cloneFormData,
                }),
            });

            const data = await response.json();
            if (data.newAccessToken) {
                settoken(data.newAccessToken);
            }
            if (!response.ok) {
                throw new Error(data.error || 'Failed to clone form');
            }

            setIsLoading(false);

            navigate(`/form-builder/${data.formVersionId}`);
        } catch (error) {
            console.error('Error cloning form:', error);
            alert('Failed to clone form. Please try again.');
        } finally {
            setCloningFormData(null);
        }
    };


    // Fetch access token from Lambda
    const fetchAccessToken = async (userId, instanceUrl) => {
        try {
            const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    instanceUrl,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch access token');
            }
            return data.access_token;
        } catch (error) {
            console.error('Error fetching access token:', error);
            return null;
        }
    };



    // Initialize page by fetching formRecords and warming Lambdas
    const initializePage = async () => {
        const params = new URLSearchParams(window.location.search);
        let userId = params.get('userId');
        let instanceUrl = params.get('instanceUrl');

        if (!userId || !instanceUrl) {
            userId = sessionStorage.getItem('userId');
            instanceUrl = sessionStorage.getItem('instanceUrl');
        }

        if (userId && instanceUrl) {
            sessionStorage.setItem('userId', userId);
            sessionStorage.setItem('instanceUrl', instanceUrl);

            const token = await fetchAccessToken(userId, instanceUrl);
            settoken(token);
            if (token) {
                await Promise.all([
                    fetchSalesforceData(userId, instanceUrl),
                ]);
            }
        } else {
            console.error('Missing userId or instanceUrl. Please log in.');
        }
    };

    useEffect(() => {
        initializePage();
    }, []);


    const handleDeleteForm = async (formId) => {
        try {
            setIsLoading(true);
            setLoadingText('Deleting Form');
            const response = await fetch('https://kd1xkj8zo2.execute-api.us-east-1.amazonaws.com/delete-user-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    formId,
                    instanceUrl,
                    userId,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete form');
            }
            if (data.newAccessToken) {
                settoken(data.newAccessToken);
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error deleting form:', error);
        } finally {
            fetchSalesforceData(sessionStorage.getItem('userId'), sessionStorage.getItem('instanceUrl'));
        }
    };
    const handleOptionSelect = (option) => {
        setIsModalOpen(false);

        const params = new URLSearchParams(window.location.search);
        const userId = params.get('userId');
        const instanceUrl = params.get('instanceUrl');

        if (userId && instanceUrl) {
            sessionStorage.setItem('userId', userId);
            sessionStorage.setItem('instanceUrl', instanceUrl);
        }

        if (option === 'salesforce') {
            setShowCreateFormWizard(true);  // Open the wizard modal right here
        } else if (option === 'scratch') {
            setIsFormNameOpen(true);
        } else if (option === 'templates') {
            navigate('/template');
        }
    };

    const handleEditForm = async (form) => {
        setIsLoading(true);
        setLoadingText('Editing Form');
        const draftVersion = form.FormVersions.find(
            (version) => version.Stage__c === 'Draft'
        );

        if (draftVersion) {
            navigate(`/form-builder/${draftVersion.Id}`);
            return;
        }

        // No Draft, copy Publish version
        const publishedVersion = form.FormVersions.find(
            (version) => version.Stage__c === 'Publish'
        );

        if (!publishedVersion) {
            setIsLoading(false);
            navigate('/form-builder'); // No Publish, create new form
            return;
        }

        try {
            const userId = sessionStorage.getItem('userId');
            const instanceUrl = sessionStorage.getItem('instanceUrl');
            const token = await fetchAccessToken(userId, instanceUrl);

            // Create new version by copying Publish
            const response = await fetch(process.env.REACT_APP_SAVE_FORM_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId,
                    instanceUrl,
                    formData: {
                        formVersion: {
                            Name: publishedVersion.Name,
                            Form__c: form.Id,
                            Version__c: (
                                Math.max(
                                    ...form.FormVersions.map((v) => parseInt(v.Version__c) || 1)
                                ) + 1
                            ).toString(),
                            Stage__c: 'Draft',
                        },
                        formFields: (publishedVersion.Fields || []).map((field, index) => ({
                            Name: field.Name,
                            Field_Type__c: field.Field_Type__c,
                            Page_Number__c: field.Page_Number__c,
                            Order_Number__c: index + 1,
                            Properties__c: field.Properties__c,
                            Unique_Key__c: field.Unique_Key__c,
                        })),
                    },
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create new version');
            }
            setIsLoading(false);
            navigate(`/form-builder/${data.formVersionId}`);
        } catch (error) {
            console.error('Error creating new version:', error);
        }
    };

    // Handler for creating a folder (for now, just log)
    const handleCreateFolder = async (folderName, selectedFormIds) => {
        // TODO: Implement backend update logic here
        setisCreating(true);
        console.log('Create folder:', folderName, 'with forms:', selectedFormIds);
        // Make API call to backend to create/update folder

        try {
            // Get userId and instanceUrl from userProfile/context

            if (!userId || !instanceUrl) {
                console.error('Missing userId or instanceUrl for folder creation');
                return;
            }
            // Call the folder API
            const response = await fetch('https://8rq1el4sv2.execute-api.us-east-1.amazonaws.com/folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    folderName,
                    formIds: selectedFormIds,
                    instanceUrl,
                    token,
                    userId,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create/update folder');
            }
            if (data.newAccessToken) {
                settoken(data.newAccessToken);
            }
            // Optionally, refresh data or show success message here
        } catch (error) {
            console.error('Error creating/updating folder:', error);
        } finally {
            setisCreating(false)
            fetchSalesforceData(userId, instanceUrl);
        }


        // You would update Folder__c for each selected form in your backend
    };
    // Add to Favorites
    const handleFavoriteForm = async (formId) => {
        if (!formId) {
            console.error('No formId provided to handleFavoriteForm');
            return;
        }
        setIsLoading(true);
        setLoadingText('Updating Favorites');
        const updatedFavorite = formRecords.find(form => form.Id === formId).isFavorite;
        console.log('Favorite data ==>', updatedFavorite)
        try {
            const response = await fetch('https://v78d7u0ljd.execute-api.us-east-1.amazonaws.com/favorite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ userId: userId, formId, instanceUrl, isFavorite: !updatedFavorite }),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Favorite form toggle failed:', result?.error || 'Unknown error');
                return;
            }

            if (result.newAccessToken) {
                settoken(result.newAccessToken);
            }

            setIsLoading(false);

            console.log(`Form ${formId} favorite status toggled successfully`, result);
            // Optionally, update local state/UI here

        } catch (err) {
            console.error('Error toggling favorite form:', err);
        }
    };
    // Handler for toggling form status
    const handleToggleStatus = async (formId) => {
        console.log('Toggling status for form:', formId);
        // Implement status toggle logic here
        // This would typically involve an API call to update the form status
    };

    return(
        <div>

        </div>
    );
}
export default MainLayout;