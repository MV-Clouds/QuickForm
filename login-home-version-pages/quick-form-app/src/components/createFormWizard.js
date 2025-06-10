import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 }, // Animation variant for hidden state
  visible: { opacity: 1, scale: 1, y: 0 }, // Animation variant for visible state
  exit: { opacity: 0, scale: 0.95, y: -10 }, // Animation variant for exit state
};

const CreateFormWizard = () => {
  const [step, setStep] = useState(1); // State for tracking current step (1 or 2)
  const [selectedObjects, setSelectedObjects] = useState([]); // State for storing selected object names
  const [metadata, setMetadata] = useState([]); // State for storing metadata (list of objects)
  const [fieldsData, setFieldsData] = useState({}); // State for storing fields data for each object
  const [selectedFields, setSelectedFields] = useState({}); // State for storing selected fields for each object
  const [currentObject, setCurrentObject] = useState(''); // State for tracking the currently selected object in Step 2
  const [error, setError] = useState(''); // State for storing error messages
  const [isLoading, setIsLoading] = useState(false); // State for tracking loading status
  const [objectSearch, setObjectSearch] = useState(''); // State for object search input
  const [fieldSearch, setFieldSearch] = useState(''); // State for field search input
  const [accessToken, setAccessToken] = useState(null); // State for storing access token
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

  // Fetch metadata when component mounts
  useEffect(() => {
    const fetchMetadata = async () => {
      setIsLoading(true); // Set loading state to true
      try {
        const userId = sessionStorage.getItem('userId'); // Get user ID from session storage
        const instanceUrl = sessionStorage.getItem('instanceUrl'); // Get instance URL from session storage

        if (!userId || !instanceUrl) { // Check if user is authenticated
          throw new Error('User not authenticated'); // Throw error if user is not authenticated
        }

        const token = await fetchAccessToken(userId, instanceUrl); // Fetch access token
        const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, ''); // Clean instance URL by removing protocol

        const metadataResponse = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, { // Fetch metadata from Lambda
          method: 'POST', // HTTP method
          headers: {
            'Content-Type': 'application/json', // Request content type
            Authorization: `Bearer ${token}`, // Authorization header with token
          },
          body: JSON.stringify({
            userId, // User ID for metadata request
            instanceUrl: cleanedInstanceUrl, // Cleaned instance URL for metadata request
          }),
        });

        if (!metadataResponse.ok) { // Check if response is not OK
          throw new Error('Failed to fetch metadata'); // Throw error if metadata fetch fails
        }
        
        const metadataData = await metadataResponse.json(); // Parse response JSON
        
        if (metadataData.metadata) { // Check if metadata exists in response
          setMetadata(JSON.parse(metadataData.metadata)); // Parse and set metadata in state
        } else {
          setError('No metadata found for this user.'); // Set error if no metadata is found
        }
      } catch (err) {
        console.error('Error fetching metadata:', err); // Log error to console
        setError('Error fetching metadata: ' + err.message); // Set error message in state
      } finally {
        setIsLoading(false); // Set loading state to false
      }
    };

    fetchMetadata(); // Call the fetchMetadata function
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

    navigate('/form-builder'); // Navigate to form builder page on successful submission
  }, [selectedObjects, selectedFields, fieldsData, navigate]); // Dependencies for useCallback

  // Handle closing the wizard
  const closeWizard = useCallback(() => {
    navigate('/home'); // Navigate to home page when wizard is closed
  }, [navigate]); // Dependencies for useCallback

  // Main JSX return statement with comments for major sections
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50"> {/* Overlay for modal */}
      {isLoading && ( // Loading overlay section
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"> {/* Wizard container */}
        <div className="flex justify-between items-center p-6 border-b"> {/* Header section */}
          <h2 className="text-2xl font-bold text-gray-800">Create Form Wizard</h2>
          <button
            onClick={closeWizard}
            className="text-gray-500 hover:text-gray-700 text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && ( // Error message section
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
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

        <div className="flex-grow overflow-auto p-6"> {/* Main content area */}
          {step === 1 && ( // Step 1: Select Objects
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 1: Select Objects</h3>

              <div className="mb-4"> {/* Object search section */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search objects..."
                    value={objectSearch}
                    onChange={(e) => setObjectSearch(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg
                    className="absolute left-3 top-3 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex items-stretch gap-4"> {/* Object selection layout */}
                <div className="flex-1 flex flex-col"> {/* Available objects section */}
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Available Objects</h4>
                    <button
                      onClick={() => moveAllObjects('right')}
                      className="text-gray-500 hover:text-blue-600 p-1"
                      title="Add all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="border rounded-lg overflow-hidden flex-1">
                    <div className="overflow-y-auto" style={{ height: '33vh' }}>
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
                              className="flex items-center p-3 cursor-default hover:bg-gray-50 border-b bg-white"
                            >
                              <div className="flex-grow flex items-center">
                                <div>
                                  <div className="font-medium">{obj.label}</div>
                                  <div className="text-sm text-gray-500">{obj.name}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleObjectSelection(obj.name)}
                                className="text-gray-400 hover:text-blue-600 p-1"
                              >
                                <span className="text-2xl">→</span>
                              </button>
                            </motion.div>
                          ))}
                      </AnimatePresence>
                      {filteredMetadata.length === 0 && (
                        <div className="text-center py-4 text-gray-500 h-full flex items-center justify-center">
                          No objects available
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col"> {/* Selected objects section */}
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Selected Objects</h4>
                    <button
                      onClick={() => moveAllObjects('left')}
                      className="text-gray-500 hover:text-blue-600 p-1"
                      title="Remove all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                  <div className="border rounded-lg overflow-hidden flex-1 bg-blue-50">
                    <div className="overflow-y-auto" style={{ height: '33vh' }}>
                      <AnimatePresence>
                        {selectedObjects.length > 0 ? (
                          selectedObjects.map((objName) => {
                            const obj = metadata.find((o) => o.name === objName);
                            if (!obj) return null;
                            return (
                              <motion.div
                                key={obj.name}
                                layout
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                transition={{ duration: 0.05 }}
                                className="flex items-center p-3 cursor-default border-b border-blue-200 bg-blue-100 hover:bg-blue-200"
                              >
                                <button
                                  onClick={() => toggleObjectSelection(obj.name)}
                                  className="text-blue-400 hover:text-blue-600 p-1"
                                >
                                  <span className="text-2xl">←</span>
                                </button>
                                <div className="flex-grow flex justify-end">
                                  <div>
                                    <div className="font-medium">{obj.label}</div>
                                    <div className="text-sm text-gray-500">{obj.name}</div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })
                        ) : (
                          <motion.div
                            className="text-center py-4 text-gray-500 h-full flex items-center justify-center"
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

              <div className="mt-6 flex justify-end"> {/* Navigation buttons section */}
                <button
                  onClick={handleNextStep}
                  disabled={selectedObjects.length === 0}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    selectedObjects.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } transition-colors`}
                >
                  Next
                  <svg
                    className="w-4 h-4 ml-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {step === 2 && ( // Step 2: Select Fields
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 2: Select Fields</h3>

              <div className="mb-4"> {/* Object dropdown section */}
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Object:
                </label>
                <select
                  value={currentObject}
                  onChange={handleObjectChange}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedObjects.map((obj) => (
                    <option key={obj} value={obj}>
                      {obj}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4"> {/* Field search section */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search fields..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg
                    className="absolute left-3 top-3 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex items-stretch gap-4"> {/* Field selection layout */}
                <div className="flex-1 flex flex-col"> {/* Available fields section */}
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Available Fields</h4>
                    <button
                      onClick={() => moveAllFields('right')}
                      className="text-gray-500 hover:text-blue-600 p-1"
                      title="Add all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="border rounded-lg overflow-hidden flex-1">
                    <div className="overflow-y-auto" style={{ height: '33vh' }}>
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
                                className="flex items-center p-3 cursor-default hover:bg-gray-50 border-b"
                              >
                                <div className="flex-grow flex items-center">
                                  <div>
                                    <div className="font-medium">
                                      {field.label}
                                      {field.required && (
                                        <span className="text-red-500 ml-1">*</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{field.name}</div>
                                    {field.type && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Type: {field.type}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleFieldSelection(field.name)}
                                  className="text-gray-400 hover:text-blue-600 p-1"
                                >
                                  <span className="text-2xl">→</span>
                                </button>
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      ) : (
                        <div className="text-center py-4 text-gray-500 h-full flex items-center justify-center">
                          {fieldSearch ? 'No matching fields found' : 'No fields available'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col"> {/* Selected fields section */}
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Selected Fields</h4>
                    <button
                      onClick={() => moveAllFields('left')}
                      className="text-gray-500 hover:text-blue-600 p-1"
                      title="Remove all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                  <div className="border rounded-lg overflow-hidden flex-1 bg-blue-50">
                    <div className="overflow-y-auto" style={{ height: '33vh' }}>
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
                                className="flex items-center p-3 cursor-default hover:bg-blue-100 border-b border-blue-200"
                              >
                                <button
                                  onClick={() => toggleFieldSelection(field.name)}
                                  className="text-blue-400 hover:text-blue-600 p-1"
                                >
                                  <span className="text-2xl">←</span>
                                </button>
                                <div className="flex-grow flex justify-end">
                                  <div>
                                    <div className="font-medium">
                                      {field.label}
                                      {field.required && (
                                        <span className="text-red-500 ml-1">*</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{field.name}</div>
                                    {field.type && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Type: {field.type}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      ) : (
                        <div className="text-center py-4 text-gray-500 h-full flex items-center justify-center">
                          Select fields using arrows
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between"> {/* Navigation buttons section */}
                <button
                  onClick={() => {
                    setError('');
                    setStep(1);
                  }}
                  className="px-6 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Finish
                  <svg
                    className="w-4 h-4 ml-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-center"> {/* Step indicator section */}
          <div className="flex space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-gray-300'}`}
            ></div>
            <div
              className={`w-3 h-3 rounded-full ${step === 2 ? 'bg-blue-600' : 'bg-gray-300'}`}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CreateFormWizard); // Export the memoized component