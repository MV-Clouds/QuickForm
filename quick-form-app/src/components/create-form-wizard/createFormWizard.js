import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FormName from './FormName';
import { Select } from 'antd';
import './createFormWizard.css';
import { InfoCircleOutlined } from '@ant-design/icons';
import AnimatedTooltip from './AnimatedTooltip';
const { Option } = Select;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 }, // Animation variant for hidden state
  visible: { opacity: 1, scale: 1, y: 0 }, // Animation variant for visible state
  exit: { opacity: 0, scale: 0.95, y: -10 }, // Animation variant for exit state
};


const CreateFormWizard = ({ onClose }) => {
  const [step, setStep] = useState(1); // State for tracking current step (1 or 2)
  const [selectedObjects, setSelectedObjects] = useState([]); // State for storing selected object names
  const [metadata, setMetadata] = useState([]); // State for storing metadata (list of objects)
  const [fieldsData, setFieldsData] = useState({}); // State for storing fields data for each object
  const [selectedFields, setSelectedFields] = useState({}); // State for storing selected fields for each object
  const [currentObject, setCurrentObject] = useState(); // State for tracking the currently selected object in Step 2
  const [error, setError] = useState(''); // State for storing error messages
  const [isLoading, setIsLoading] = useState(false); // State for tracking loading status
  const [objectSearch, setObjectSearch] = useState(''); // State for object search input
  const [fieldSearch, setFieldSearch] = useState(''); // State for field search input
  const [accessToken, setAccessToken] = useState(null); // State for storing access token
  const [isFormNameOpen, setIsFormNameOpen] = useState(false);
  const navigate = useNavigate(); // Hook for navigation

  // Memoize filtered metadata based on search input
  const filteredMetadata = useMemo(() => {
    const list = Array.isArray(metadata) ? metadata : [];
    return list.filter(
      (obj) =>
        obj.name.toLowerCase().includes(objectSearch.toLowerCase()) ||
        obj.label.toLowerCase().includes(objectSearch.toLowerCase())
    );
  }, [metadata, objectSearch]);
  // Memoize filtered fields based on search input for the current object
  const filteredFields = useMemo(() => {
    return (
      fieldsData[currentObject]?.filter( // Filter fields based on search
        (field) =>
          field.name.toLowerCase().includes(fieldSearch.toLowerCase()) || // Filter by field name
          field.label.toLowerCase().includes(fieldSearch.toLowerCase()) // Filter by field label
      ) || [] // Return empty array if no fields exist
    );
  }, [fieldsData, currentObject, fieldSearch]); // Dependencies for memoization

  // Function to fetch access token from Lambda
  const fetchAccessToken = async (userId, instanceUrl) => {
    try {
      const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, { // Fetch token from Lambda
        method: 'POST', // HTTP method
        headers: {
          'Content-Type': 'application/json', // Request content type
        },
        body: JSON.stringify({
          userId, // User ID for token request
          instanceUrl, // Instance URL for token request
        }),
      });

      const data = await response.json(); // Parse response JSON

      if (!response.ok) { // Check if response is not OK
        throw new Error(data.error || 'Failed to fetch access token'); // Throw error if token fetch fails
      }

      setAccessToken(data.access_token); // Store access token in state
      return data.access_token; // Return the access token
    } catch (error) {
      console.error('Error fetching access token:', error); // Log error to console
      setError('Error fetching access token: ' + error.message); // Set error message in state
      throw error; // Rethrow error for further handling
    }
  };

  const fetchMetadata = async () => {
    setIsLoading(true);
    setError('');
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error('User not authenticated');

      const token = accessToken || (await fetchAccessToken(userId, instanceUrl));
      if (!token) throw new Error('Failed to get access token');


      const metadataResponse = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, instanceUrl, accessToken }),
      });

      if (!metadataResponse.ok) throw new Error('Failed to fetch metadata');

      const metadataData = await metadataResponse.json();
      if (metadataData.metadata) {
        setMetadata(JSON.parse(metadataData.metadata));
      } else {
        setError('No metadata found for this user.');
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Error fetching metadata: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFieldsForCurrentObject = async () => {
    if (!currentObject) return;
    setIsLoading(true);
    setError('');
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) throw new Error("User not authenticated");

      const token = accessToken || (await fetchAccessToken(userId, instanceUrl));
      if (!token) throw new Error("Failed to get access token");

      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, '');

      const response = await fetch(process.env.REACT_APP_FETCH_FIELDS_URL, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: cleanedInstanceUrl,
          objectName: currentObject,
          access_token: token,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch fields");
      }

      const data = await response.json();
      
      // Assuming your state structure expects something like:
      setFieldsData((prev) => ({
        ...prev,
        [currentObject]: data.fields || [],
      }));

    } catch (err) {
      console.error("Error refreshing fields:", err);
      setError("Error refreshing fields: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  // Fetch metadata when component mounts
  useEffect(() => {
    fetchMetadata();
  }, []); // Empty dependency array ensures this runs only on mount

  // Fetch fields for a specific object
  const fetchFieldsForObject = async (objectName) => {
    if (fieldsData[objectName]) { // Check if fields for this object are already fetched
      return fieldsData[objectName]; // Return cached fields
    }

    try {
      const instanceUrl = sessionStorage.getItem('instanceUrl'); // Get instance URL from session storage
      const userId = sessionStorage.getItem('userId'); // Get user ID from session storage

      if (!accessToken || !instanceUrl || !userId) { // Check if user is authenticated
        throw new Error('User not authenticated or instance URL missing'); // Throw error if not authenticated
      }

      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, ''); // Clean instance URL by removing protocol

      const response = await fetch(process.env.REACT_APP_FETCH_FIELDS_URL, { // Fetch fields from Lambda
        method: 'POST', // HTTP method
        headers: {
          'Content-Type': 'application/json', // Request content type
          Authorization: `Bearer ${accessToken}`, // Authorization header with token
        },
        body: JSON.stringify({
          userId, // User ID for fields request
          instanceUrl: cleanedInstanceUrl, // Cleaned instance URL for fields request
          objectName, // Object name for which fields are fetched
          access_token: accessToken, // Access token for fields request
        }),
      });

      if (!response.ok) { // Check if response is not OK
        throw new Error(`Failed to fetch fields for ${objectName}`); // Throw error if fields fetch fails
      }

      const data = await response.json(); // Parse response JSON

      const fields = data.fields || []; // Extract fields or default to empty array
      setFieldsData((prev) => ({ ...prev, [objectName]: fields })); // Update fieldsData state with new fields
      return fields; // Return the fetched fields
    } catch (error) {
      console.error(`Error fetching fields for ${objectName}:`, error); // Log error to console
      setError(`Error fetching fields for ${objectName}: ${error.message}`); // Set error message in state
      return []; // Return empty array on error
    }
  };

  // Toggle object selection in Step 1
  const toggleObjectSelection = useCallback((objectName) => {
    setError(''); // Clear any existing error
    if (selectedObjects.includes(objectName)) { // Check if object is already selected
      setSelectedObjects(selectedObjects.filter((obj) => obj !== objectName)); // Remove object from selected list
      const updatedFields = { ...selectedFields }; // Copy current selected fields
      delete updatedFields[objectName]; // Remove fields for the deselected object
      setSelectedFields(updatedFields); // Update selected fields state
    } else {
      setSelectedObjects([...selectedObjects, objectName]); // Add object to selected list
    }
  }, [selectedObjects, selectedFields]); // Dependencies for useCallback

  // Move all objects between available and selected lists
  const moveAllObjects = useCallback((direction) => {
    if (direction === 'right') { // Check if moving all to selected
      const availableObjects = filteredMetadata
        .filter((obj) => !selectedObjects.includes(obj.name)) // Get all unselected objects
        .map((obj) => obj.name); // Map to object names
      setSelectedObjects([...selectedObjects, ...availableObjects]); // Add all to selected list
    } else {
      setSelectedObjects([]); // Clear selected objects
      setSelectedFields({}); // Clear selected fields
    }
  }, [filteredMetadata, selectedObjects]); // Dependencies for useCallback

  // Toggle field selection in Step 2
  const toggleFieldSelection = useCallback((fieldName) => {
    setError(''); // Clear any existing error
    const field = fieldsData[currentObject].find((f) => f.name === fieldName); // Find the field in fields data

    if (field.referenceTo && field.referenceTo.length > 0) { // Check if field has a reference
      const referencedObject = field.referenceTo[0]; // Get the referenced object
      if (!selectedObjects.includes(referencedObject)) { // Check if referenced object is selected
        setError(
          `Cannot select ${field.name} on ${currentObject} because ${referencedObject} object is not selected.` // Set error if referenced object is not selected
        );
        return; // Exit function
      }
    }

    const currentSelected = selectedFields[currentObject] || []; // Get currently selected fields for the object

    if (currentSelected.includes(fieldName)) { // Check if field is already selected
      if (field.required) { // Check if field is required
        setError(`Cannot remove ${field.name} from selected fields because it is required.`); // Set error if required field
        return; // Exit function
      }
      setSelectedFields({
        ...selectedFields,
        [currentObject]: currentSelected.filter((f) => f !== fieldName), // Remove field from selected list
      });
    } else {
      setSelectedFields({
        ...selectedFields,
        [currentObject]: [...currentSelected, fieldName], // Add field to selected list
      });
    }
  }, [fieldsData, currentObject, selectedObjects, selectedFields]); // Dependencies for useCallback

  // Move all fields between available and selected lists
  const moveAllFields = useCallback((direction) => {
    if (!currentObject || !fieldsData[currentObject]) return; // Exit if no current object or fields data

    if (direction === 'right') { // Check if moving all to selected
      const availableFields = filteredFields
        .filter((field) => !(selectedFields[currentObject] || []).includes(field.name)) // Get all unselected fields
        .map((field) => field.name); // Map to field names

      // Check for referenced objects
      const fieldsWithReferences = fieldsData[currentObject]
        .filter((field) => field.referenceTo && field.referenceTo.length > 0) // Filter fields with references
        .filter((field) => availableFields.includes(field.name)) // Filter fields that are available
        .filter((field) => !selectedObjects.includes(field.referenceTo[0])); // Filter fields with unselected referenced objects

      if (fieldsWithReferences.length > 0) { // Check if there are fields with references
        setError(
          `Cannot select ${fieldsWithReferences.map((f) => f.name).join(', ')} because referenced objects are not selected.` // Set error if referenced objects are not selected
        );
        return; // Exit function
      }

      setSelectedFields({
        ...selectedFields,
        [currentObject]: [...(selectedFields[currentObject] || []), ...availableFields], // Add all fields to selected list
      });
    } else {
      // Only remove non-required fields
      const requiredFields = fieldsData[currentObject]
        .filter((field) => field.required) // Filter required fields
        .map((field) => field.name); // Map to field names

      setSelectedFields({
        ...selectedFields,
        [currentObject]: requiredFields, // Keep only required fields in selected list
      });
    }
  }, [currentObject, fieldsData, filteredFields, selectedFields, selectedObjects]); // Dependencies for useCallback

  // Handle navigation from Step 1 to Step 2
  const handleNextStep = async () => {
    setError(''); // Clear any existing error
    if (selectedObjects.length === 0) { // Check if any objects are selected
      setError('Please select at least one object.'); // Set error if no objects selected
      return; // Exit function
    }

    setIsLoading(true); // Set loading state to true
    try {
      const fieldsMap = {}; // Initialize fields map
      const initialSelectedFields = {}; // Initialize selected fields map

      // Fetch fields for all objects in parallel
      const fieldPromises = selectedObjects.map(async (obj) => {
        const fields = await fetchFieldsForObject(obj); // Fetch fields for each object
        return { obj, fields }; // Return object and its fields
      });

      const results = await Promise.all(fieldPromises); // Wait for all field fetches to complete

      // Process the results
      results.forEach(({ obj, fields }) => {
        fieldsMap[obj] = fields; // Add fields to fields map
        const requiredFields = fields.filter((field) => field.required).map((field) => field.name); // Get required fields
        initialSelectedFields[obj] = requiredFields; // Set required fields as initially selected
      });

      setFieldsData(fieldsMap); // Update fields data state
      setCurrentObject(selectedObjects[0]); // Set first selected object as current
      setSelectedFields(initialSelectedFields); // Update selected fields state
      setStep(2); // Move to Step 2
    } catch (error) {
      setError('Error preparing fields: ' + error.message); // Set error if field fetching fails
    } finally {
      setIsLoading(false); // Set loading state to false
    }
  };

  // Handle object dropdown change in Step 2
  const handleObjectChange = useCallback((e) => {
    setCurrentObject(e.target.value); // Update current object based on dropdown selection
    setError(''); // Clear any existing error
  }, []); // Dependencies for useCallback

  // Handle form submission after Step 2
  const handleSubmit = useCallback(() => {
    setError(''); // Clear any existing error
    for (const obj of selectedObjects) { // Iterate through selected objects
      if (!selectedFields[obj] || selectedFields[obj].length === 0) { // Check if fields are selected for the object
        setError(`Please select at least one field for ${obj}.`); // Set error if no fields selected
        return; // Exit function
      }
      const requiredFields = fieldsData[obj]?.filter((field) => field.required) || []; // Get required fields for the object
      const selected = selectedFields[obj] || []; // Get selected fields for the object
      const missingRequired = requiredFields.filter((field) => !selected.includes(field.name)); // Find missing required fields
      if (missingRequired.length > 0) { // Check if any required fields are missing
        setError(
          `Please select all required fields for ${obj}: ${missingRequired
            .map((f) => f.label)
            .join(', ')}` // Set error for missing required fields
        );
        return; // Exit function
      }
    }

    setIsFormNameOpen(true); 
  }, [selectedObjects, selectedFields, fieldsData, navigate]); // Dependencies for useCallback

  // Handle closing the wizard
  const closeWizard = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]); // Dependencies for useCallback

  // Main JSX return statement with comments for major sections
  if (isFormNameOpen) {
    const objectInfo = selectedObjects.map((obj) => {
    const objMetadata = metadata.find((m) => m.name === obj) || {};
    return {
        objectName: obj,
        objectLabel: objMetadata.label || obj,
        fields: (selectedFields[obj] || []).map((fieldName) => {
          const field = fieldsData[obj]?.find((f) => f.name === fieldName) || {};
          return {
            name: fieldName,
            label: field.label || fieldName,
            type: field.type || 'Unknown',
            required: field.required || false,
            referenceTo: field.referenceTo || [],
            values: field.values || []
          };
        }),
      };
    });
    return (
      <FormName
        onClose={() => setIsFormNameOpen(false)}
        fields={[{ id: 'default-header', type: 'header', heading: 'Contact Form', alignment: 'center' }]}
        objectInfo={objectInfo}
      />
    );
  }
  return (
    <div className="wizard-overlay"> {/* Overlay for modal */}
      {isLoading && ( // Loading overlay section
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      <div className="wizard-container"> {/* Wizard container */}
        <div className="wizard-header"> {/* Header section */}
          <h2 className="wizard-title">Create Form Wizard</h2>
          <button
            onClick={closeWizard}
            className="wizard-close"
            aria-label="Close"
          >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 1.00714L8.99286 0L5 3.99286L1.00714 0L0 1.00714L3.99286 5L0 8.99286L1.00714 10L5 6.00714L8.99286 10L10 8.99286L6.00714 5L10 1.00714Z" fill="#5F6165"/>
                </svg>


          </button>
        </div>

        {error && ( // Error message section
          <div className="wizard-error-alert">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="wizard-content"> {/* Main content area */}
          {step === 1 && ( // Step 1: Select Objects
          <div>
            <div className="object-container">
              <div className="title-group">
              <h3 className="wizard-step-title">Step 1: Select Objects</h3>
                <div className="wizard-refresh" onClick={fetchMetadata}>
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.44599 5.51184C3.15162 6.61034 3.18961 7.77145 3.55515 8.84835C3.92069 9.92525 4.59735 10.8696 5.49958 11.5619C6.40181 12.2542 7.48908 12.6635 8.6239 12.7379C9.75871 12.8123 10.8901 12.5485 11.875 11.9798M14.554 8.48784C14.8484 7.38935 14.8104 6.22824 14.4448 5.15134C14.0793 4.07444 13.4026 3.13011 12.5004 2.43779C11.5982 1.74546 10.5109 1.33622 9.37608 1.26183C8.24127 1.18744 7.10988 1.45123 6.12499 2.01984" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M0.75 7.5L3.25 5L5.75 7.5M12.25 6.5L14.75 9L17.25 6.5" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>

                </div>
              </div>

              <div className="wizard-form-group"> {/* Object search section */}
                <div className="wizard-search-container">
                  <input
                    type="text"
                    placeholder="Search objects..."
                    value={objectSearch}
                    onChange={(e) => setObjectSearch(e.target.value)}
                    className="wizard-search-input"
                  />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="wizard-search-icon">
                    <path d="M11 16.5C14.0376 16.5 16.5 14.0376 16.5 11C16.5 7.96243 14.0376 5.5 11 5.5C7.96243 5.5 5.5 7.96243 5.5 11C5.5 14.0376 7.96243 16.5 11 16.5Z" stroke="#5F6165" stroke-width="1.5"/>
                    <path d="M15 15L19 19" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>

              <div className="wizard-dual-list-row"> {/* Object selection layout */}
                <div className="wizard-list-col"> {/* Available objects section */}
                  <div className="wizard-list-title-row">
                    <h4 className="wizard-list-title">Available Objects</h4>
                    <button
                      onClick={() => moveAllObjects('right')}
                      className="wizard-list-add"
                      title="Add all"
                    >
                      <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.61084 1L13.2231 7.62308C13.2747 7.67142 13.3157 7.72981 13.3438 7.79464C13.3718 7.85947 13.3863 7.92936 13.3863 8C13.3863 8.07064 13.3718 8.14054 13.3438 8.20536C13.3157 8.27019 13.2747 8.32858 13.2231 8.37692L6.61084 15" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M1 1L7.62308 7.62308C7.72174 7.72373 7.777 7.85906 7.777 8C7.777 8.14094 7.72174 8.27627 7.62308 8.37692L1 15" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="wizard-listbox">
                    <div className={`${filteredMetadata.length === 0 ? 'wizard-listbox-empty' : ''}`}>
                      <AnimatePresence>
                        {filteredMetadata
                          .filter((obj) => !selectedObjects.includes(obj.name))
                          .map((obj) => (
                            <motion.div
                              key={obj.name}
                              layout
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              transition={{ duration: 0.05 }}
                              className="wizard-listbox-entry"
                            >
                              <div className="flex-grow flex items-center">
                                <div>
                                  <div className="wizard-listbox-entry-label">{obj.label}
                                    <AnimatedTooltip content={`${obj.name}`}>
  <InfoCircleOutlined className="info-icon" aria-label={`API Name for ${obj.label}`} />
</AnimatedTooltip>
                                  </div>
                                  
                                </div>
                              </div>
                              <button
                                onClick={() => toggleObjectSelection(obj.name)}
                                className="wizard-list-add"
                              >
                                <span className="text-2xl">→</span>
                              </button>
                            </motion.div>
                          ))}
                      </AnimatePresence>
                      {filteredMetadata.length === 0 && (
                        <div className="wizard-listbox-empty">
                          No objects available
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="wizard-list-col"> {/* Selected objects section */}
                  <div className="wizard-list-title-row">
                    <h4 className="wizard-list-title">Selected Objects</h4>
                    <button
                      onClick={() => moveAllObjects('left')}
                      className="wizard-list-clear"
                      title="Remove all"
                    >
                     <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8.38916 15L1.77685 8.37692C1.72534 8.32858 1.68429 8.27019 1.65622 8.20536C1.62816 8.14053 1.61368 8.07064 1.61368 8C1.61368 7.92936 1.62816 7.85946 1.65622 7.79464C1.68429 7.72981 1.72534 7.67142 1.77685 7.62308L8.38916 0.999999" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M14 15L7.37692 8.37692C7.27826 8.27627 7.223 8.14094 7.223 8C7.223 7.85906 7.27826 7.72373 7.37692 7.62308L14 0.999999" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="wizard-listbox selected">
                    <div className={`${selectedObjects.length === 0 ? 'wizard-listbox-empty' : ''}`}>
                      <AnimatePresence >
                        {selectedObjects.length > 0 ? (
                          <motion.div layout> {/* This enables layout animation for child positioning */}
                            {selectedObjects.map((objName) => {
                              const obj = metadata.find((o) => o.name === objName);
                              if (!obj) return null;
                              return (
                                <motion.div
                                  key={obj.name}
                                  layout // 👈 Keep layout on the child too
                                  initial={{ opacity: 0, y: 10 }} // 👈 Add custom entrance animation
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 380,
                                    damping: 30,
                                    mass: 0.9,
                                  }}
                                  className="wizard-listbox-entry"
                                >
                                  <button
                                    onClick={() => toggleObjectSelection(obj.name)}
                                    className="wizard-list-clear"
                                  >
                                    <span className="text-2xl">←</span>
                                  </button>
                                  <div className="flex-grow flex justify-end">
                                    <div>
                                      
                                      <div className="wizard-listbox-entry-label">
                                        <AnimatedTooltip content={`${obj.name}`} positionLeft>
                                          <InfoCircleOutlined className="info-icon" aria-label={`API Name for ${obj.label}`} />
                                        </AnimatedTooltip>
                                        {obj.label}
                                      </div>
                                      
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        ) : (
                          <motion.div
                            className="wizard-listbox-empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            Select objects using arrows
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </div>
              </div>
                </div>

              <div className="wizard-steps-nav"> {/* Navigation buttons section */}
                <div className="cancel-button">
                  <div className="cancel-button-border">
                  <button
                    onClick={closeWizard}
                    className="wizard-btn wizard-btn-secondary"
                  >
                    Cancel
                  </button>
                  </div>
                </div>
                <div className={` ${selectedObjects.length === 0 ? 'next-button' : 'next-button-enabled'}`}>
                  <div className="next-button-border">
                <button
                  onClick={handleNextStep}
                  disabled={selectedObjects.length === 0}
                  className="wizard-btn wizard-btn-primary"
                >
                  Next
                  
                </button>
                </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && ( // Step 2: Select Fields
            <div>
              <div className="object-container">
              <div className="title-group">
                <h3 className="wizard-step-title">Step 2: Select Fields</h3>
                <div className="wizard-refresh" onClick={refreshFieldsForCurrentObject}>
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.44599 5.51184C3.15162 6.61034 3.18961 7.77145 3.55515 8.84835C3.92069 9.92525 4.59735 10.8696 5.49958 11.5619C6.40181 12.2542 7.48908 12.6635 8.6239 12.7379C9.75871 12.8123 10.8901 12.5485 11.875 11.9798M14.554 8.48784C14.8484 7.38935 14.8104 6.22824 14.4448 5.15134C14.0793 4.07444 13.4026 3.13011 12.5004 2.43779C11.5982 1.74546 10.5109 1.33622 9.37608 1.26183C8.24127 1.18744 7.10988 1.45123 6.12499 2.01984" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M0.75 7.5L3.25 5L5.75 7.5M12.25 6.5L14.75 9L17.25 6.5" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>

                </div>               
              </div>
              <div className="wizard-form-row">
                <div className="wizard-form-group half-width"> {/* Object dropdown section */}
                  <label className="object-small">
                    Select Object:
                  </label>
                  <Select
                    id="object-select"
                    value={currentObject}
                    onChange={(value) => setCurrentObject(value)}
                    className="dropdown"      // For consistency with your login CSS
                    style={{ width: '100%' }}
                    placeholder="Select an object"
                  >
                    {selectedObjects.map((obj) => (
                      <Option key={obj} value={obj}>
                        {obj}
                      </Option>
                    ))}
                  </Select>
                </div>
                <div className="wizard-form-group half-width"> {/* Field search section */}
                  <div className="wizard-search-container fields-search">
                    <input
                      type="text"
                      placeholder="Search fields..."
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      className="wizard-search-input"
                    />
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="wizard-search-icon">
                      <path d="M11 16.5C14.0376 16.5 16.5 14.0376 16.5 11C16.5 7.96243 14.0376 5.5 11 5.5C7.96243 5.5 5.5 7.96243 5.5 11C5.5 14.0376 7.96243 16.5 11 16.5Z" stroke="#5F6165" stroke-width="1.5"/>
                      <path d="M15 15L19 19" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="wizard-dual-list-row"> {/* Field selection layout */}
                <div className="wizard-list-col"> {/* Available fields section */}
                  <div className="wizard-list-title-row">
                    <h4 className="wizard-list-title">Available Fields</h4>
                    <button
                      onClick={() => moveAllFields('right')}
                      className="wizard-list-add"
                      title="Add all"
                    >
                      <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.61084 1L13.2231 7.62308C13.2747 7.67142 13.3157 7.72981 13.3438 7.79464C13.3718 7.85947 13.3863 7.92936 13.3863 8C13.3863 8.07064 13.3718 8.14054 13.3438 8.20536C13.3157 8.27019 13.2747 8.32858 13.2231 8.37692L6.61084 15" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M1 1L7.62308 7.62308C7.72174 7.72373 7.777 7.85906 7.777 8C7.777 8.14094 7.72174 8.27627 7.62308 8.37692L1 15" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="wizard-listbox">
                    <div className={`${filteredMetadata.length === 0 ? 'wizard-listbox-empty' : ''}`}>
                      {filteredFields.length > 0 ? (
                        <AnimatePresence>
                          {filteredFields
                            .filter(
                              (field) => !(selectedFields[currentObject] || []).includes(field.name)
                            )
                            .map((field) => (
                              <motion.div
                                key={field.name}
                                layout
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                transition={{ duration: 0.05 }}
                                className="wizard-listbox-entry"
                              >
                                <div className="flex-grow flex items-center">
                                  <div>
                                    <div className="wizard-listbox-entry-label">
                                      {field.label}
                                      {field.required && (
                                        <span className="wizard-listbox-entry-required">*</span>
                                      )}
                                     <AnimatedTooltip content={`${field.name}\nType: ${field.type || 'Unknown'}`}>
  <InfoCircleOutlined className="info-icon" aria-label={`API Name and Type for ${field.label}`} />
</AnimatedTooltip>
                                    </div>
                                    
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleFieldSelection(field.name)}
                                  className="wizard-list-add"
                                >
                                  <span className="text-2xl">→</span>
                                </button>
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      ) : (
                        <div className="wizard-listbox-empty">
                          {fieldSearch ? 'No matching fields found' : 'No fields available'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="wizard-list-col"> {/* Selected fields section */}
                  <div className="wizard-list-title-row">
                    <h4 className="wizard-list-title">Selected Fields</h4>
                    <button
                      onClick={() => moveAllFields('left')}
                      className="wizard-list-clear"
                      title="Remove all"
                    >
                     <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8.38916 15L1.77685 8.37692C1.72534 8.32858 1.68429 8.27019 1.65622 8.20536C1.62816 8.14053 1.61368 8.07064 1.61368 8C1.61368 7.92936 1.62816 7.85946 1.65622 7.79464C1.68429 7.72981 1.72534 7.67142 1.77685 7.62308L8.38916 0.999999" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M14 15L7.37692 8.37692C7.27826 8.27627 7.223 8.14094 7.223 8C7.223 7.85906 7.27826 7.72373 7.37692 7.62308L14 0.999999" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="wizard-listbox selected">
                    <div className={`${selectedObjects.length === 0 ? 'wizard-listbox-empty' : ''}`}>
                      {(selectedFields[currentObject] || []).length > 0 ? (
                        <AnimatePresence>
                          {(selectedFields[currentObject] || []).map((fieldName) => {
                            const field = fieldsData[currentObject]?.find(
                              (f) => f.name === fieldName
                            );
                            if (!field) return null;
                            return (
                              <motion.div
                                key={field.name}
                                layout
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                transition={{ duration: 0.05 }}
                                className="wizard-listbox-entry"
                              >
                                <button
                                  onClick={() => toggleFieldSelection(field.name)}
                                  className="wizard-list-clear"
                                >
                                  <span className="text-2xl">←</span>
                                </button>
                                <div className="flex-grow flex justify-end">
                                  <div>
                                    <div className="selected-fields-align">
                                    <div className="wizard-listbox-entry-label-fields">
                                    <AnimatedTooltip content={`${field.name}\nType: ${field.type || 'Unknown'}`} positionLeft>
  <InfoCircleOutlined className="info-icon" aria-label={`API Name and Type for ${field.label}`} />
</AnimatedTooltip>
                                      {field.label}
                                      {field.required && (
                                        <span className="wizard-listbox-entry-required">*</span>
                                      )}
                                    </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      ) : (
                        <div className="wizard-listbox-empty">
                          Select fields using arrows
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div className="wizard-steps-nav"> {/* Navigation buttons section */}
                <div className="cancel-button">
<div className="cancel-button-border">
                <button
                  onClick={() => {
                    setError('');
                    setStep(1);
                  }}
                  className="wizard-btn wizard-btn-secondary"
                >
                  Back
                </button>
                </div>
                </div>
                <div className="next-button-enabled">
                <div className="next-button-border">
                <button
                  onClick={handleSubmit}
                  className="wizard-btn wizard-btn-primary"
                >
                  Finish
                 <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="right-icon">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M9.95147 1.25186C10.4201 0.783233 11.1799 0.783233 11.6485 1.25186C12.0811 1.68444 12.1144 2.36512 11.7484 2.83587L11.6485 2.94892L5.64853 8.94892C5.21595 9.3815 4.53527 9.41477 4.06452 9.04875L3.95147 8.94892L0.351472 5.34892C-0.117157 4.88029 -0.117157 4.12049 0.351472 3.65186C0.784053 3.21928 1.46473 3.18601 1.93548 3.55204L2.04853 3.65186L4.8 6.40239L9.95147 1.25186Z" fill="white"/>
                </svg>

                </button>
                </div>
                </div>
              </div>
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
};

export default React.memo(CreateFormWizard); // Export the memoized component