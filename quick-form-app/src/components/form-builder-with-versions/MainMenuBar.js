import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalesforceData } from '../Context/MetadataContext';

function MainMenuBar({ isSidebarOpen, toggleSidebar, formRecords, selectedVersionId, publishLink  }) {
  const navigate = useNavigate();
  const [submissionCount, setSubmissionCount] = useState(0);
  const { userProfile } = useSalesforceData();

  useEffect(() => {
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

      navigate(`/mapping/${selectedVersionId}`);
    } catch (error) {
      console.log('error in navigate');
    }
  };

  const navItems = [
    {
      name: 'Fields',
      path: '/form-builder',
      route: `/form-builder/${selectedVersionId}`,
      onClick: () => selectedVersionId && navigate(`/form-builder/${selectedVersionId}`),
      icon: (
        <svg width="24" height="24"  viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="formIconGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(11, 41, 94, 1)" />
              <stop offset="100%" stopColor="rgba(29, 109, 158, 1)" />
            </linearGradient>
          </defs>
          <path
            d="M0.75 12.5996C0.75 8.35723 0.75 6.23548 2.0685 4.91811C3.387 3.60073 5.50763 3.59961 9.75 3.59961H14.25C18.4924 3.59961 20.6141 3.59961 21.9315 4.91811C23.2489 6.23661 23.25 8.35723 23.25 12.5996C23.25 16.842 23.25 18.9637 21.9315 20.2811C20.613 21.5985 18.4924 21.5996 14.25 21.5996H9.75C5.50763 21.5996 3.38587 21.5996 2.0685 20.2811C0.751125 18.9626 0.75 16.842 0.75 12.5996Z"
            fill={window.location.pathname.includes('/form-builder') ? "url(#formIconGradient)" : "none"}
            stroke={window.location.pathname.includes('/form-builder') ? "url(#formIconGradient)" : "#0B0A0A"}
            strokeWidth="1.5"
          />
          <path
            d="M3.5 12.5996C3.5 9.18385 3.5 7.47597 4.4395 6.53711C5.379 5.59824 7.08563 5.59961 10.5 5.59961H13.5C16.9144 5.59961 18.621 5.59824 19.5605 6.53711C20.5 7.47597 20.5 9.18385 20.5 12.5996C20.5 16.0154 20.5 17.7232 19.5605 18.6621C18.621 19.601 16.9144 19.5996 13.5 19.5996H10.5C7.08563 19.5996 5.379 19.601 4.4395 18.6621C3.5 17.7232 3.5 16.0154 3.5 12.5996Z"
            fill={window.location.pathname.includes('/form-builder') ? "url(#formIconGradient)" : "white"}
            stroke={window.location.pathname.includes('/form-builder') ? "url(#formIconGradient)" : ""}
            strokeWidth="0.5"
          />
          <path
            d="M14.1514 8L14.2197 11.9922L13.5498 11.9648C13.1807 10.748 12.7796 9.89583 12.3467 9.4082C11.9137 8.92057 11.3623 8.67676 10.6924 8.67676C10.5511 8.67676 10.4622 8.7041 10.4258 8.75879C10.3893 8.81348 10.3711 8.97754 10.3711 9.25098V16.3193C10.3711 16.6566 10.4417 16.9027 10.583 17.0576C10.7243 17.2126 10.9567 17.2969 11.2803 17.3105L11.9365 17.3447V18.0693H6.29688V17.3447L6.94629 17.3105C7.26986 17.2969 7.5 17.2148 7.63672 17.0645C7.77799 16.9095 7.84863 16.6611 7.84863 16.3193V9.26465C7.84863 8.97298 7.8304 8.80208 7.79395 8.75195C7.76204 8.70182 7.67318 8.67676 7.52734 8.67676C6.85742 8.67676 6.30599 8.92057 5.87305 9.4082C5.44466 9.89583 5.04362 10.748 4.66992 11.9648L4 11.9922L4.08203 8H14.1514Z"
            fill={window.location.pathname.includes('/form-builder') ? "white" : "#0B0A0A"}
            stroke={window.location.pathname.includes('/form-builder') ? "white" : "#0B0A0A"}
            strokeWidth="0.4"
          />
        </svg>
      ),
    },
    {
      name: 'Submission',
      path: '/submissions',
      route: `/submissions`,
      onClick: () => {/* Handle submission functionality */ },
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="submissionIconGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(11, 41, 94, 1)" />
              <stop offset="100%" stopColor="rgba(29, 109, 158, 1)" />
            </linearGradient>
          </defs>
          <path
            d="M7.5075 20.25H5.25C4.42157 20.25 3.75 19.5784 3.75 18.75V5.25C3.75 4.42157 4.42157 3.75 5.25 3.75H18.75C19.5784 3.75 20.25 4.42157 20.25 5.25V10.5M9.915 16.479L12.6208 19.1848C13.2066 19.7706 14.1564 19.7706 14.7422 19.1848L20.4615 13.4655M7 7H16M7 10H14M7 13H11"
            stroke={window.location.pathname.includes('/submissions') ? "url(#submissionIconGradient)" : "#0B0A0A"}
            fill={window.location.pathname.includes('/submissions') ? "url(#submissionIconGradient)" : ""}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      badge: submissionCount,
    },
    {
      name: 'Notification',
      path: '/notifications',
      route: `/notifications/${selectedVersionId}`,
      onClick: () => selectedVersionId && navigate(`/notifications/${selectedVersionId}`),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="notificationIconGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(11, 41, 94, 1)" />
              <stop offset="100%" stopColor="rgba(29, 109, 158, 1)" />
            </linearGradient>
          </defs>
          <path
            d="M18.7501 9.71V9.005C18.7501 5.136 15.7261 2 12.0001 2C8.27406 2 5.25006 5.136 5.25006 9.005V9.71C5.25127 10.5516 5.01111 11.3758 4.55806 12.085L3.45006 13.81C2.43906 15.385 3.21106 17.526 4.97006 18.024C9.56635 19.3257 14.4338 19.3257 19.0301 18.024C20.7891 17.526 21.5611 15.385 20.5501 13.811L19.4421 12.086C18.9887 11.3769 18.7482 10.5527 18.7491 9.711L18.7501 9.71Z"
            stroke={window.location.pathname.includes('/notifications') ? "url(#notificationIconGradient)" : "#0B0A0A"}
            strokeWidth="1.5"
            fill={window.location.pathname.includes('/notifications') ? "url(#submissionIconGradient)" : ""}
          />
          <path
            d="M7.5 19C8.155 20.748 9.922 22 12 22C14.078 22 15.845 20.748 16.5 19"
            stroke={window.location.pathname.includes('/notifications') ? "url(#notificationIconGradient)" : "#0B0A0A"}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill={window.location.pathname.includes('/notifications') ? "url(#submissionIconGradient)" : ""}
          />
        </svg>
      ),
    },
    {
      name: 'Mapping',
      path: '/mapping',
      route: `/mapping/${selectedVersionId}`,
      onClick: handleMappingClick,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mappingIconGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(11, 41, 94, 1)" />
              <stop offset="100%" stopColor="rgba(29, 109, 158, 1)" />
            </linearGradient>
          </defs>

          {/* Background for active state */}
          {window.location.pathname.includes('/mapping') && (
            <rect
              x="0.75" y="0.75"
              width="22.5" height="22.5"
              rx="3.25"
              fill="url(#mappingIconGradient)"
            />
          )}

          {/* Icon paths with adjusted strokes */}
          <path
            d="M5.571 13.286a1.714 1.714 0 1 0 0-3.428 1.714 1.714 0 0 0 0 3.428z"
            fill={window.location.pathname.includes('/mapping') ? "white" : "#0B0A0A"}
            stroke={window.location.pathname.includes('/mapping') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
          />

          <path
            d="M20.143 4.714a.857.857 0 1 0 0-1.714.857.857 0 0 0 0 1.714zm0 7.715a.857.857 0 1 0 0-1.715.857.857 0 0 0 0 1.715zm0 7.714a.857.857 0 1 0 0-1.714.857.857 0 0 0 0 1.714z"
            stroke={window.location.pathname.includes('/mapping') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Vertical line with adjusted positioning */}
          <path
            d="M15.857 3.857H10.714v15.429h5.143"
            stroke={window.location.pathname.includes('/mapping') ? "white" : "#0B0A0A"}
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          {/* Horizontal line */}
          <path
            d="M7.285 11.572h8.572"
            stroke={window.location.pathname.includes('/mapping') ? "white" : "#0B0A0A"}
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          <circle
            cx="4.714"
            cy="3.857"
            r="1.714"
            fill={window.location.pathname.includes('/mapping') ? "white" : "#0B0A0A"}
          />
          <circle
            cx="4.714"
            cy="19.286"
            r="1.714"
            fill={window.location.pathname.includes('/mapping') ? "white" : "#0B0A0A"}
          />
        </svg>
      ),
    },
    {
      name: 'Conditions',
      path: '/conditions',
      route: `/conditions/${selectedVersionId}`,
      onClick: () => selectedVersionId && navigate(`/conditions/${selectedVersionId}`),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="conditionsIconGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(11, 41, 94, 1)" />
              <stop offset="100%" stopColor="rgba(29, 109, 158, 1)" />
            </linearGradient>

            {/* Mask for the active state background */}
            <mask id="conditionsMask">
              <rect width="24" height="24" fill="white" />
              <path d="M6.667 4v10.667" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M17.333 9.333a2.667 2.667 0 1 0 0-5.333 2.667 2.667 0 0 0 0 5.333z" stroke="black" strokeWidth="1.5" />
              <path d="M6.667 20a2.667 2.667 0 1 0 0-5.333 2.667 2.667 0 0 0 0 5.333z" stroke="black" strokeWidth="1.5" />
              <path d="M17.333 9.333a8 8 0 0 1-8 8" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
            </mask>
          </defs>

          {/* Gradient background (visible only when active) */}
          {window.location.pathname.includes('/conditions') && (
            <rect
              x="1" y="1"
              width="22" height="22"
              rx="3"
              fill="url(#conditionsIconGradient)"
              mask="url(#conditionsMask)"
            />
          )}

          {/* Icon paths */}
          <path
            d="M6.667 4v10.667"
            stroke={window.location.pathname.includes('/conditions') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          <path
            d="M17.333 9.333a2.667 2.667 0 1 0 0-5.333 2.667 2.667 0 0 0 0 5.333z"
            stroke={window.location.pathname.includes('/conditions') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M6.667 20a2.667 2.667 0 1 0 0-5.333 2.667 2.667 0 0 0 0 5.333z"
            stroke={window.location.pathname.includes('/conditions') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M17.333 9.333a8 8 0 0 1-8 8"
            stroke={window.location.pathname.includes('/conditions') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      name: 'Thank You',
      path: '/thankyou',
      route: `/thankyou/${selectedVersionId}`,
      onClick: () => navigate(`/thankyou/${selectedVersionId}`),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="thankyouIconGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(11, 41, 94, 1)" />
              <stop offset="100%" stopColor="rgba(29, 109, 158, 1)" />
            </linearGradient>

            {/* Mask for the active state background */}
            <mask id="thankyouMask">
              <rect width="24" height="24" fill="white" />
              <path d="M11.089 14.103h1.797c.477 0 .934-.189 1.271-.526s.527-.794.527-1.271c0-.477-.189-.934-.526-1.271a1.797 1.797 0 0 0-1.272-.526H10.19a1.8 1.8 0 0 0-1.258.46l-5.034 4.854" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M7.494 19.494l1.438-1.258c.27-.36.719-.54 1.258-.54h3.595c.989 0 1.887-.36 2.517-1.079l4.134-3.955a1.8 1.8 0 0 0 .517-1.243 1.8 1.8 0 0 0-.527-1.271 1.8 1.8 0 0 0-1.243-.517 1.8 1.8 0 0 0-1.271.527l-3.775 3.505M3 15.001l5.393 5.393" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M18.729 9.159a2.7 2.7 0 0 1 .348 2.573 2.7 2.7 0 0 1-1.354 1.354 2.7 2.7 0 0 1-2.573-.348 2.7 2.7 0 0 1-1.354-1.354 2.7 2.7 0 0 1-.348-2.573 2.7 2.7 0 0 1 1.354-1.354 2.7 2.7 0 0 1 2.573.348z" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
            </mask>
          </defs>

          {/* Gradient background (visible only when active) */}
          {window.location.pathname.includes('/thankyou') && (
            <rect
              x="1" y="1"
              width="22" height="22"
              rx="3"
              fill="url(#thankyouIconGradient)"
              mask="url(#thankyouMask)"
            />
          )}

          {/* Icon paths */}
          <path
            d="M11.089 14.103h1.797c.477 0 .934-.189 1.271-.526s.527-.794.527-1.271c0-.477-.189-.934-.526-1.271a1.797 1.797 0 0 0-1.272-.526H10.19a1.8 1.8 0 0 0-1.258.46l-5.034 4.854"
            stroke={window.location.pathname.includes('/thankyou') ? "white" : "#0B0A0A"}
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          <path
            d="M7.494 19.494l1.438-1.258c.27-.36.719-.54 1.258-.54h3.595c.989 0 1.887-.36 2.517-1.079l4.134-3.955a1.8 1.8 0 0 0 .517-1.243 1.8 1.8 0 0 0-.527-1.271 1.8 1.8 0 0 0-1.243-.517 1.8 1.8 0 0 0-1.271.527l-3.775 3.505M3 15.001l5.393 5.393"
            stroke={window.location.pathname.includes('/thankyou') ? "white" : "#0B0A0A"}
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          <path
            d="M18.729 9.159a2.7 2.7 0 0 1 .348 2.573 2.7 2.7 0 0 1-1.354 1.354 2.7 2.7 0 0 1-2.573-.348 2.7 2.7 0 0 1-1.354-1.354 2.7 2.7 0 0 1-.348-2.573 2.7 2.7 0 0 1 1.354-1.354 2.7 2.7 0 0 1 2.573.348z"
            stroke={window.location.pathname.includes('/thankyou') ? "white" : "#0B0A0A"}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      )
    },
    {
      name: 'Share',
      path: '/share',
      route: '/share',
      onClick: () => {
        navigate(`/share/${selectedVersionId}`, { state: { publishLink } });  
      },
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="shareIconGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(11, 41, 94, 1)" />
              <stop offset="100%" stopColor="rgba(29, 109, 158, 1)" />
            </linearGradient>

            {/* Mask for active state background */}
            <mask id="shareMask">
              <rect width="24" height="24" fill="white" />
              <path d="M5.909 15.363a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z" stroke="black" strokeWidth="1.5" />
              <path d="M16.091 21.91a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z" stroke="black" strokeWidth="1.5" />
              <path d="M16.091 8.818a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z" stroke="black" strokeWidth="1.5" />
              <path d="M13.645 7.482l-5.291 3.4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8.354 14.027l5.291 3.4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
            </mask>
          </defs>

          {/* Gradient background (visible only when active) */}
          {window.location.pathname.includes('/share') && (
            <rect
              x="1" y="1"
              width="22" height="22"
              rx="3"
              fill="url(#shareIconGradient)"
              mask="url(#shareMask)"
            />
          )}

          {/* Icon paths */}
          <path
            d="M5.909 15.363a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M16.091 21.91a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M16.091 8.818a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M13.645 7.482l-5.291 3.4"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          <path
            d="M8.354 14.027l5.291 3.4"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      name: 'Prefill',
      path: '/prefill',
      route: '/prefill',
      onClick: () => {
        
          navigate(`/prefill/${selectedVersionId}`);
        
      },
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="shareIconGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(11, 41, 94, 1)" />
              <stop offset="100%" stopColor="rgba(29, 109, 158, 1)" />
            </linearGradient>

            {/* Mask for active state background */}
            <mask id="shareMask">
              <rect width="24" height="24" fill="white" />
              <path d="M5.909 15.363a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z" stroke="black" strokeWidth="1.5" />
              <path d="M16.091 21.91a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z" stroke="black" strokeWidth="1.5" />
              <path d="M16.091 8.818a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z" stroke="black" strokeWidth="1.5" />
              <path d="M13.645 7.482l-5.291 3.4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8.354 14.027l5.291 3.4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
            </mask>
          </defs>

          {/* Gradient background (visible only when active) */}
          {window.location.pathname.includes('/share') && (
            <rect
              x="1" y="1"
              width="22" height="22"
              rx="3"
              fill="url(#shareIconGradient)"
              mask="url(#shareMask)"
            />
          )}

          {/* Icon paths */}
          <path
            d="M5.909 15.363a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M16.091 21.91a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M16.091 8.818a2.909 2.909 0 1 0 0-5.818 2.909 2.909 0 0 0 0 5.818z"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            fill="none"
          />

          <path
            d="M13.645 7.482l-5.291 3.4"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          <path
            d="M8.354 14.027l5.291 3.4"
            stroke={window.location.pathname.includes('/share') ? "white" : "#0B0A0A"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  const buttonVariants = {
    hover: { scale: 1.02, backgroundColor: '#F3F4F6' },
    tap: { scale: 0.95 },
    initial: { scale: 1, backgroundColor: 'transparent' },
  };

  const textVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-20 h-screen transition-all ease-in-out duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'
        } bg-white border-r border-gray-200`}
    >
      <div className="absolute bottom-[115px] -right-[16px] z-20">
        <motion.button
          onClick={toggleSidebar}
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 rounded-md w-8 h-8"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: isSidebarOpen ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <path d="m15 18-6-6 6-6" />
          </motion.svg>
        </motion.button>
      </div>

      <div className="relative h-full flex flex-col overflow-y-auto overflow-x-hidden">
        <div className={`flex border-b border-gray-100 ${isSidebarOpen ? 'px-8 py-4': 'px-1 py-5'}`}>
            <img 
              src={isSidebarOpen ? '/images/quickform-logo.png' : '/images/quickform-only-logo.png'} 
              className={`${isSidebarOpen ? '' : ''}`}
             alt="Quick Form" />
        </div>

        <nav className="flex-1 py-6">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <motion.button
                  className={`flex items-center py-1/2 pl-5 w-full text-sm font-medium transition-colors relative rounded-md ${isSidebarOpen ? 'px-3' : 'px-[0.4rem]'}`}
                  onClick={item.onClick}
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  {window.location.pathname.includes(item.path) && (
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 bg-white rounded-r"
                      style={{
                        background: 'linear-gradient(to right, rgba(11, 41, 94, 1), rgba(37, 127, 184, 1))',
                        width: '6px',
                        height: '100%',
                      }}
                      layoutId="activeIndicator"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  <motion.span
                    className={`flex justify-start p-2 items-center w-full rounded gap-3 ${window.location.pathname.includes(item.path) ? 'bg-gray-100' : ''
                      }`}
                  >
                    {item.icon}
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.span
                          variants={textVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {item.badge && isSidebarOpen && (
                      <motion.span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${window.location.pathname.includes(item.path)
                          ? 'bg-white bg-opacity-20 text-white'
                          : 'bg-gray-200 text-gray-600'
                          }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </motion.span>
                </motion.button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
          <motion.button
            className="flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <span className="mr-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
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
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span
                    className="mr-2"
                    variants={textVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    {userProfile?.user_name || 'Jane Cooper'}
                  </motion.span>
                )}
              </AnimatePresence>
              {isSidebarOpen && (
                <motion.svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <polyline points="9,18 15,12 9,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              )}
            </div>
          </motion.button>
        </div>
      </div>
    </aside>
  );
}

export default MainMenuBar;