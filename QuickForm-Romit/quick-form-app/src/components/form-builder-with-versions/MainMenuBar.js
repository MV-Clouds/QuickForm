import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalesforceData } from '../Context/MetadataContext';

function MainMenuBar({ isSidebarOpen, toggleSidebar, formRecords, selectedVersionId }) {
  const navigate = useNavigate();
  const [submissionCount, setSubmissionCount] = useState(0);
  const {
    userProfile
  } = useSalesforceData();

  // Calculate submission count based on current form data
  useEffect(() => {
    // This would typically come from your API or context
    // For now, setting a placeholder value
    setSubmissionCount(6);
  }, [selectedVersionId, formRecords]);

  const handleMappingClick = () => {
    // Find the selected form version
    try {
      const currentFormRecord = formRecords.find((record) =>
        record.FormVersions.some((version) => version.Id === selectedVersionId)
      );

      const currentVersion = currentFormRecord?.FormVersions.find(
        (version) => version.Id === selectedVersionId
      );

      if (!currentVersion) {
        console.warn('No matching form version found');
        return;
      }

      // Extract values
      const formVersionId = currentVersion.Id;
      console.log('form version ', formVersionId);

      // Navigate
      navigate(`/mapping/${selectedVersionId}`);
    } catch (error) {
      console.log('error in navigate ');

    }

  };

  return (
    <aside
      className={`fixed top-0 left-0 z-20 h-screen transition-all ease-in-out duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'
        } bg-white border-r border-gray-200`}
    >
      <div className="absolute bottom-[115px] -right-[16px] z-20">
        <button
          onClick={toggleSidebar}
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 rounded-md w-8 h-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ease-in-out duration-700 ${isSidebarOpen ? 'rotate-0' : 'rotate-180'
              }`}
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="relative h-full flex flex-col overflow-y-auto">
        {/* Logo Section */}
        <div className="px-4 py-2 border-b border-gray-100">
          <a
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-primary underline-offset-4 hover:underline h-9 px-4 py-2 transition-transform ease-in-out duration-300 mt-4 translate-x-0"
            href="/home"
          >
            <img
              src="/quickform-logo.png"
              alt="Logo Icon"
              className={`${isSidebarOpen ? 'w-12' : 'w-20'}`}
            />
            <h1
              className={`ml-2 font-bold text-lg whitespace-nowrap transition-[transform,opacity] ease-in-out duration-300
                ${isSidebarOpen ? 'translate-x-0 opacity-100' : 'hidden'}`
              }
            >
              <span style={{ color: 'rgb(0, 204, 255)' }}>QUICK </span>
              <span style={{ color: 'rgb(3, 52, 167)' }}>FORM</span>
            </h1>
          </a>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {/* Fields */}
            <li>
              <a
                href="/form-builder"
                className={`flex items-center px-3 py-3 text-sm font-medium transition-colors relative ${window.location.pathname.includes('/form-builder')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {window.location.pathname.includes('/form-builder') && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l"></div>
                )}
                <span className="mr-3">
                  <svg width="24" height="19" viewBox="0 0 24 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.75 9.59961C0.75 5.35723 0.75 3.23548 2.0685 1.91811C3.387 0.600734 5.50763 0.599609 9.75 0.599609H14.25C18.4924 0.599609 20.6141 0.599609 21.9315 1.91811C23.2489 3.23661 23.25 5.35723 23.25 9.59961C23.25 13.842 23.25 15.9637 21.9315 17.2811C20.613 18.5985 18.4924 18.5996 14.25 18.5996H9.75C5.50763 18.5996 3.38587 18.5996 2.0685 17.2811C0.751125 15.9626 0.75 13.842 0.75 9.59961Z" fill="url(#paint0_linear_1736_9075)" fill-opacity="0.8"/>
                    <path d="M8.71875 7.25586V11.9434H8.53125V7.25586H8.71875ZM12.0625 6.73535C12.0732 6.83941 12.0807 6.9532 12.085 7.07812H11.8984C11.8961 7.01182 11.8928 6.94911 11.8887 6.88965L12.0625 6.73535ZM5.36133 6.88867C5.35722 6.94845 5.35391 7.01148 5.35156 7.07812H5.16504C5.16934 6.95285 5.17582 6.83867 5.18652 6.73438L5.36133 6.88867ZM10.584 5.57715C10.7089 5.58144 10.8227 5.58799 10.9268 5.59863L10.7725 5.77344C10.713 5.76937 10.6503 5.76601 10.584 5.76367V5.57715ZM6.66602 5.76367C6.59974 5.76601 6.53698 5.76838 6.47754 5.77246L6.32324 5.59863C6.42728 5.58799 6.54113 5.58144 6.66602 5.57715V5.76367Z" fill="white" stroke="white" stroke-width="1.5"/>
                    <defs>
                    <linearGradient id="paint0_linear_1736_9075" x1="23.25" y1="9.59961" x2="0.75" y2="9.59961" gradientUnits="userSpaceOnUse">
                    <stop offset="0.0480769" stop-color="#0B295E"/>
                    <stop offset="1" stop-color="#1D6D9E"/>
                    </linearGradient>
                    </defs>
                    </svg>
                </span>
                {isSidebarOpen && <span>Fields</span>}
              </a>
            </li>

            {/* Submission */}
            <li>
              <button
                className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => selectedVersionId && navigate(`/submissions/${selectedVersionId}`)}
              >
                <div className="flex items-center">
                  <span className="mr-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5075 20.25H5.25C4.42157 20.25 3.75 19.5784 3.75 18.75V5.25C3.75 4.42157 4.42157 3.75 5.25 3.75H18.75C19.5784 3.75 20.25 4.42157 20.25 5.25V10.5M9.915 16.479L12.6208 19.1848C13.2066 19.7706 14.1564 19.7706 14.7422 19.1848L20.4615 13.4655M7 7H16M7 10H14M7 13H11" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>

                  </span>
                  {isSidebarOpen && <span>Submission</span>}
                </div>
                {isSidebarOpen && (
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                    {submissionCount}
                  </span>
                )}
              </button>
            </li>

            {/* Notification */}
            <li>
              <button
                className="flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => selectedVersionId && navigate(`/notifications/${selectedVersionId}`)}
              >
                <span className="mr-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.7501 9.71V9.005C18.7501 5.136 15.7261 2 12.0001 2C8.27406 2 5.25006 5.136 5.25006 9.005V9.71C5.25127 10.5516 5.01111 11.3758 4.55806 12.085L3.45006 13.81C2.43906 15.385 3.21106 17.526 4.97006 18.024C9.56635 19.3257 14.4338 19.3257 19.0301 18.024C20.7891 17.526 21.5611 15.385 20.5501 13.811L19.4421 12.086C18.9887 11.3769 18.7482 10.5527 18.7491 9.711L18.7501 9.71Z" stroke="#0B0A0A" stroke-width="1.5" />
                    <path d="M7.5 19C8.155 20.748 9.922 22 12 22C14.078 22 15.845 20.748 16.5 19" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" />
                  </svg>

                </span>
                {isSidebarOpen && <span>Notification</span>}
              </button>
            </li>

            {/* Mapping */}
            <li>
              <button
                className="flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={handleMappingClick}
              >
                <span className="mr-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.57122 13.286C6.02588 13.286 6.46192 13.1054 6.78341 12.7839C7.1049 12.4624 7.28551 12.0264 7.28551 11.5717C7.28551 11.1171 7.1049 10.681 6.78341 10.3595C6.46192 10.038 6.02588 9.85742 5.57122 9.85742C5.11657 9.85742 4.68053 10.038 4.35904 10.3595C4.03755 10.681 3.85693 11.1171 3.85693 11.5717C3.85693 12.0264 4.03755 12.4624 4.35904 12.7839C4.68053 13.1054 5.11657 13.286 5.57122 13.286Z" fill="#0B0A0A" stroke="#0B0A0A" stroke-width="1.71429" stroke-linejoin="round" />
                    <path d="M20.143 4.71429C20.3704 4.71429 20.5884 4.62398 20.7491 4.46324C20.9099 4.30249 21.0002 4.08447 21.0002 3.85714C21.0002 3.62982 20.9099 3.4118 20.7491 3.25105C20.5884 3.09031 20.3704 3 20.143 3C19.9157 3 19.6977 3.09031 19.5369 3.25105C19.3762 3.4118 19.2859 3.62982 19.2859 3.85714C19.2859 4.08447 19.3762 4.30249 19.5369 4.46324C19.6977 4.62398 19.9157 4.71429 20.143 4.71429ZM20.143 12.4286C20.3704 12.4286 20.5884 12.3383 20.7491 12.1775C20.9099 12.0168 21.0002 11.7988 21.0002 11.5714C21.0002 11.3441 20.9099 11.1261 20.7491 10.9654C20.5884 10.8046 20.3704 10.7143 20.143 10.7143C19.9157 10.7143 19.6977 10.8046 19.5369 10.9654C19.3762 11.1261 19.2859 11.3441 19.2859 11.5714C19.2859 11.7988 19.3762 12.0168 19.5369 12.1775C19.6977 12.3383 19.9157 12.4286 20.143 12.4286ZM20.143 20.1429C20.3704 20.1429 20.5884 20.0526 20.7491 19.8918C20.9099 19.7311 21.0002 19.5131 21.0002 19.2857C21.0002 19.0584 20.9099 18.8404 20.7491 18.6797C20.5884 18.5189 20.3704 18.4286 20.143 18.4286C19.9157 18.4286 19.6977 18.5189 19.5369 18.6797C19.3762 18.8404 19.2859 19.0584 19.2859 19.2857C19.2859 19.5131 19.3762 19.7311 19.5369 19.8918C19.6977 20.0526 19.9157 20.1429 20.143 20.1429Z" stroke="#0B0A0A" stroke-width="1.71429" stroke-linejoin="round" />
                    <path d="M15.8566 3.85742H10.7137V19.286H15.8566M7.28516 11.5717H15.8566" stroke="#0B0A0A" stroke-width="1.50001" stroke-linecap="round" stroke-linejoin="round" />
                    <circle cx="4.71429" cy="3.85687" r="1.71429" fill="#0B0A0A" />
                    <circle cx="4.71429" cy="19.2866" r="1.71429" fill="#0B0A0A" />
                  </svg>

                </span>
                {isSidebarOpen && <span>Mapping</span>}
              </button>
            </li>

            {/* Conditions */}
            <li>
              <button
                className="flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => selectedVersionId && navigate(`/conditions/${selectedVersionId}`)}
              >
                <span className="mr-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.66675 4V14.6667" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M17.3334 9.33333C18.8062 9.33333 20.0001 8.13943 20.0001 6.66667C20.0001 5.19391 18.8062 4 17.3334 4C15.8607 4 14.6667 5.19391 14.6667 6.66667C14.6667 8.13943 15.8607 9.33333 17.3334 9.33333Z" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M6.66667 19.9993C8.13943 19.9993 9.33333 18.8054 9.33333 17.3327C9.33333 15.8599 8.13943 14.666 6.66667 14.666C5.19391 14.666 4 15.8599 4 17.3327C4 18.8054 5.19391 19.9993 6.66667 19.9993Z" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M17.3333 9.33398C17.3333 11.4557 16.4904 13.4905 14.9901 14.9908C13.4898 16.4911 11.455 17.334 9.33325 17.334" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                </span>
                {isSidebarOpen && <span>Conditions</span>}
              </button>
            </li>

            {/* Thank You */}
            <li>
              <button
                className="flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/thankyou/${selectedVersionId}`)}
              >
                <span className="mr-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.58 0 3.04.41 4.32 1.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {isSidebarOpen && <span>Thank You</span>}
              </button>
            </li>

            {/* Share */}
            <li>
              <button
                className="flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => {/* Handle share functionality */ }}
              >
                <span className="mr-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.90909 15.3631C7.51574 15.3631 8.81818 14.0607 8.81818 12.454C8.81818 10.8474 7.51574 9.54492 5.90909 9.54492C4.30244 9.54492 3 10.8474 3 12.454C3 14.0607 4.30244 15.3631 5.90909 15.3631Z" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M16.091 21.91C17.6976 21.91 19.0001 20.6075 19.0001 19.0009C19.0001 17.3942 17.6976 16.0918 16.091 16.0918C14.4843 16.0918 13.1819 17.3942 13.1819 19.0009C13.1819 20.6075 14.4843 21.91 16.091 21.91Z" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M16.091 8.81818C17.6976 8.81818 19.0001 7.51574 19.0001 5.90909C19.0001 4.30244 17.6976 3 16.091 3C14.4843 3 13.1819 4.30244 13.1819 5.90909C13.1819 7.51574 14.4843 8.81818 16.091 8.81818Z" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M13.6452 7.48242L8.35425 10.8824" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M8.35425 14.0273L13.6452 17.4273" stroke="#0B0A0A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                </span>
                {isSidebarOpen && <span>Share</span>}
              </button>
            </li>
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
          {/* Settings */}
          <button className="flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <span className="mr-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {isSidebarOpen && <span>Settings</span>}
          </button>

          {/* User Profile */}
          <button className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-user"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
              </span>
              {isSidebarOpen && <span className='mr-2'>{userProfile?.user_name || 'Jane Cooper'}</span>}
                {isSidebarOpen && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="9,18 15,12 9,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default MainMenuBar;