import React from 'react';
import './SetupPage.css';
import { motion } from 'framer-motion';

const SetupPage = () => {
    return (
        <div className="full-page-container">
            <div className="full-page-content">
                <div className="content-section">
                    <div className="text-content">
                        <img src={`/images/quickform-logo.png`} alt="QuickForm Logo" className="logo" />

                        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M83.5712 91.6669H16.4285C14.218 91.6664 12.0466 91.0843 10.1323 89.9789C8.21807 88.8735 6.62846 87.2838 5.52318 85.3695C4.41789 83.4551 3.83586 81.2837 3.83557 79.0732C3.83528 76.8627 4.41673 74.6911 5.52151 72.7765L39.0928 14.6303C40.1983 12.7158 41.7882 11.126 43.7028 10.0207C45.6173 8.91539 47.7891 8.3335 49.9998 8.3335C52.2106 8.3335 54.3824 8.91539 56.2969 10.0207C58.2115 11.126 59.8014 12.7158 60.9068 14.6303L94.4782 72.7765C95.583 74.6911 96.1644 76.8627 96.1641 79.0732C96.1638 81.2837 95.5818 83.4551 94.4765 85.3695C93.3712 87.2838 91.7816 88.8735 89.8674 89.9789C87.9531 91.0843 85.7817 91.6664 83.5712 91.6669Z" fill="#FFB92E" />
                            <path d="M50 74.9998C52.3012 74.9998 54.1667 73.1344 54.1667 70.8332C54.1667 68.532 52.3012 66.6665 50 66.6665C47.6989 66.6665 45.8334 68.532 45.8334 70.8332C45.8334 73.1344 47.6989 74.9998 50 74.9998Z" fill="white" />
                            <path d="M50 58.3335C48.895 58.3335 47.8352 57.8945 47.0538 57.1131C46.2724 56.3317 45.8334 55.2719 45.8334 54.1668V37.5002C45.8334 36.3951 46.2724 35.3353 47.0538 34.5539C47.8352 33.7725 48.895 33.3335 50 33.3335C51.1051 33.3335 52.1649 33.7725 52.9463 34.5539C53.7277 35.3353 54.1667 36.3951 54.1667 37.5002V54.1668C54.1667 55.2719 53.7277 56.3317 52.9463 57.1131C52.1649 57.8945 51.1051 58.3335 50 58.3335Z" fill="white" />
                        </svg>

                        <p className='text-heading'>Action Required: Complete Your Setup</p>
                        <p className='text-subheading'>
                            To unlock QuickForm's power and sync data, install our package in Salesforce.
                            This one-time step enables integration and real-time flow.
                        </p>
                        <div className="login-button setup-btn">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.3333 10.6667L20 4M20 4H15.5556M20 4V8.44444M20 13.7778V18.2222C20 18.6937 19.8127 19.1459 19.4793 19.4793C19.1459 19.8127 18.6937 20 18.2222 20H5.77778C5.30628 20 4.8541 19.8127 4.5207 19.4793C4.1873 19.1459 4 18.6937 4 18.2222V5.77778C4 5.30628 4.1873 4.8541 4.5207 4.5207C4.8541 4.1873 5.30628 4 5.77778 4H10.2222" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                            Complete Setup
                        </div>

                        <div className="support-link">
                            <p>Need help? <a href="#">Visit our Support Center</a></p>
                        </div>
                    </div>
                </div>
                <div className="image-section">
                    <motion.img 
                        src={`/images/setup-vector.png`} 
                        alt="Setup illustration" 
                        animate={{
                            y: [0, -12, 0]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default SetupPage;