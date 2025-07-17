import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const InactivityTracker = ({ timeoutDuration = 3600 * 1000, loginPath = '/' }) => {
  const navigate = useNavigate();

  // Function to delete user data from DynamoDB
  const deleteUserData = async (userId, instanceUrl) => {
    try {
        console.log('Deleting user data for userId:', userId, 'instanceUrl:', instanceUrl);
        
      const response = await fetch(process.env.REACT_APP_DELETE_USER_DATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          instanceUrl: instanceUrl ? instanceUrl.replace(/https?:\/\//, '') : '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to delete user data:', data.error || 'Unknown error');
      } else {
        console.log('User data deleted successfully:', data);
      }
    } catch (error) {
      console.error('Error calling delete user data Lambda:', error);
    }
  };

  // Handle session timeout
  const handleTimeout = async () => {
    const userId = sessionStorage.getItem('userId');
    const instanceUrl = sessionStorage.getItem('instanceUrl');

    // Call Lambda to delete user data
    if (userId && instanceUrl) {
      await deleteUserData(userId, instanceUrl);
    }

    // Clear session storage
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('instanceUrl');
    sessionStorage.clear();

    // Redirect to login page
    navigate(loginPath);
  };

  useEffect(() => {
    let timeoutId;

    // Reset the timer on user activity
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleTimeout, timeoutDuration);
    };

    // Events to track for user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Start the timer initially
    resetTimer();

    // Cleanup on component unmount
    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [timeoutDuration, navigate]);

  return null; // This component doesn't render anything
};

export default InactivityTracker;