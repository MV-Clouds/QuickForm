import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Select } from 'antd';
import './SharePage.css';

const { Option } = Select;
const codeTypes = [
  { key: 'lwc', label: 'For LWC' },
  { key: 'aura', label: 'Aura' },
  { key: 'visualforce', label: 'Visualforce' },
];

const embedCodes = {
  lwc: `<iframe src="https://nameapp.app/embed/arifvfxfsfkuovan" style="width: 700px; max-width: 100%; height: 450px" allow="fullscreen" title="Share"></iframe>`,
  aura: '<!-- Your Aura embed code here -->',
  visualforce: '<!-- Your Visualforce embed code here -->',
};

const SharePage = () => {
  const location = useLocation();
  const publishLink = location.state?.publishLink || 'https://forms.quickform.com/t/wrQqTLgaLRus';

  const [selectedCode, setSelectedCode] = useState('lwc');
  const [copiedLink, setCopiedLink] = useState(false); // for copy link button
  const [copiedEmbed, setCopiedEmbed] = useState(false); // for copy embed button

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publishLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCodes[selectedCode]);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      
    }
  };

  const handleChange = (value) => {
    setSelectedCode(value);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent('Check out this form!');
    const url = encodeURIComponent(publishLink);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    openCenteredPopup(twitterUrl, 'Share on Twitter', 600, 600);
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(publishLink);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    openCenteredPopup(facebookUrl, 'Share on Facebook', 600, 600);
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(publishLink);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    openCenteredPopup(linkedInUrl, 'Share on LinkedIn', 600, 600);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Check out this form! ${publishLink}`);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    openCenteredPopup(whatsappUrl, 'Share on WhatsApp', 600, 600);
  };

  const shareOnReddit = () => {
    const title = encodeURIComponent('Check out this form!');
    const url = encodeURIComponent(publishLink);
    const redditUrl = `https://www.reddit.com/submit?url=${url}&title=${title}`;
    openCenteredPopup(redditUrl, 'Share on Reddit', 600, 600);
  };

  const openCenteredPopup = (url, title, width = 600, height = 600) => {
    const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
    const dualScreenTop = window.screenTop ?? window.screenY ?? 0;

    const windowWidth = window.innerWidth
      || document.documentElement.clientWidth
      || (window.screen && window.screen.width) // safer usage
      || 0;
    const windowHeight = window.innerHeight
      || document.documentElement.clientHeight
      || (window.screen && window.screen.height)
      || 0;

    const left = dualScreenLeft + (windowWidth - width) / 2;
    const top = dualScreenTop + (windowHeight - height) / 2;

    const newWindow = window.open(
      url,
      title,
      `scrollbars=yes,width=${width},height=${height},top=${top},left=${left}`
    );

    if (newWindow && newWindow.focus) {
      newWindow.focus();
    }
    return newWindow;
  };



  return (
    <div className="share-wrap">
        <div className="share-container">
        <h2 className="share-title">Share</h2>
        {/* Share Link Section */}
        <div className="share-section">
            <div className="share-label">Form Link</div>
            <div className="share-row">
            <input className="share-input" readOnly value={publishLink} />
            <div className="open-link">
              <button
                className="open-link-button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3333 10.6667L20 4M20 4H15.5556M20 4V8.44444M20 13.7778V18.2222C20 18.6937 19.8127 19.1459 19.4793 19.4793C19.1459 19.8127 18.6937 20 18.2222 20H5.77778C5.30628 20 4.8541 19.8127 4.5207 19.4793C4.1873 19.1459 4 18.6937 4 18.2222V5.77778C4 5.30628 4.1873 4.8541 4.5207 4.5207C4.8541 4.1873 5.30628 4 5.77778 4H10.2222" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
              </button>
            </div>
            
             <button className="share-copy" onClick={handleCopyLink}>
              {copiedLink ? (
                <>
                  <svg className="copy-svg" xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 20 20" aria-hidden="true"><path fill='white' fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16m3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0z" clip-rule="evenodd"/></svg>

                  Copied
                </>
              ) : (
                <>
                  <svg className="copy-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.016 12.2C4.384 11.44 4 10.464 4 9.4C4 6.984 5.976 5 8.4 5H12.4C14.816 5 16.8 6.984 16.8 9.4C16.8 11.816 14.824 13.8 12.4 13.8H10.4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.984 12.1996C19.616 12.9596 20 13.9356 20 14.9996C20 17.4156 18.024 19.3996 15.6 19.3996H11.6C9.18395 19.3996 7.19995 17.4156 7.19995 14.9996C7.19995 12.5836 9.17595 10.5996 11.6 10.5996H13.6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>

                Copy Link
                </>
              )}
            </button>
            </div>
            <div className="share-social-row">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2.08333C0 0.932222 0.933333 0 2.08333 0H7.08333C8.23444 0 9.16667 0.933333 9.16667 2.08333V7.08333C9.16667 8.23444 8.23333 9.16667 7.08333 9.16667H2.08333C1.5308 9.16667 1.0009 8.94717 0.610194 8.55647C0.219493 8.16577 0 7.63587 0 7.08333V2.08333ZM2.08333 1.66667C1.97283 1.66667 1.86685 1.71057 1.78871 1.78871C1.71057 1.86685 1.66667 1.97283 1.66667 2.08333V7.08333C1.66667 7.31333 1.85333 7.5 2.08333 7.5H7.08333C7.19384 7.5 7.29982 7.4561 7.37796 7.37796C7.4561 7.29982 7.5 7.19384 7.5 7.08333V2.08333C7.5 1.97283 7.4561 1.86685 7.37796 1.78871C7.29982 1.71057 7.19384 1.66667 7.08333 1.66667H2.08333ZM10.8333 2.08333C10.8333 0.932222 11.7667 0 12.9167 0H17.9167C19.0667 0 20 0.933333 20 2.08333V7.08333C20 8.23444 19.0667 9.16667 17.9167 9.16667H12.9167C12.3641 9.16667 11.8342 8.94717 11.4435 8.55647C11.0528 8.16577 10.8333 7.63587 10.8333 7.08333V2.08333ZM12.9167 1.66667C12.8062 1.66667 12.7002 1.71057 12.622 1.78871C12.5439 1.86685 12.5 1.97283 12.5 2.08333V7.08333C12.5 7.31333 12.6867 7.5 12.9167 7.5H17.9167C18.0272 7.5 18.1332 7.4561 18.2113 7.37796C18.2894 7.29982 18.3333 7.19384 18.3333 7.08333V2.08333C18.3333 1.97283 18.2894 1.86685 18.2113 1.78871C18.1332 1.71057 18.0272 1.66667 17.9167 1.66667H12.9167ZM3.33333 4.16667C3.33333 3.94565 3.42113 3.73369 3.57741 3.57741C3.73369 3.42113 3.94565 3.33333 4.16667 3.33333H5C5.22101 3.33333 5.43298 3.42113 5.58926 3.57741C5.74554 3.73369 5.83333 3.94565 5.83333 4.16667V5C5.83333 5.22101 5.74554 5.43298 5.58926 5.58926C5.43298 5.74554 5.22101 5.83333 5 5.83333H4.16667C3.94565 5.83333 3.73369 5.74554 3.57741 5.58926C3.42113 5.43298 3.33333 5.22101 3.33333 5V4.16667ZM14.1667 4.16667C14.1667 3.94565 14.2545 3.73369 14.4107 3.57741C14.567 3.42113 14.779 3.33333 15 3.33333H15.8333C16.0543 3.33333 16.2663 3.42113 16.4226 3.57741C16.5789 3.73369 16.6667 3.94565 16.6667 4.16667V5C16.6667 5.22101 16.5789 5.43298 16.4226 5.58926C16.2663 5.74554 16.0543 5.83333 15.8333 5.83333H15C14.779 5.83333 14.567 5.74554 14.4107 5.58926C14.2545 5.43298 14.1667 5.22101 14.1667 5V4.16667ZM0 12.9167C0 11.7656 0.933333 10.8333 2.08333 10.8333H7.08333C8.23444 10.8333 9.16667 11.7667 9.16667 12.9167V17.9167C9.16667 19.0667 8.23333 20 7.08333 20H2.08333C1.5308 20 1.0009 19.7805 0.610194 19.3898C0.219493 18.9991 0 18.4692 0 17.9167V12.9167ZM2.08333 12.5C1.97283 12.5 1.86685 12.5439 1.78871 12.622C1.71057 12.7002 1.66667 12.8062 1.66667 12.9167V17.9167C1.66667 18.1467 1.85333 18.3333 2.08333 18.3333H7.08333C7.19384 18.3333 7.29982 18.2894 7.37796 18.2113C7.4561 18.1332 7.5 18.0272 7.5 17.9167V12.9167C7.5 12.8062 7.4561 12.7002 7.37796 12.622C7.29982 12.5439 7.19384 12.5 7.08333 12.5H2.08333ZM10.8333 11.6667C10.8333 11.4457 10.9211 11.2337 11.0774 11.0774C11.2337 10.9211 11.4457 10.8333 11.6667 10.8333H12.5C12.721 10.8333 12.933 10.9211 13.0893 11.0774C13.2455 11.2337 13.3333 11.4457 13.3333 11.6667V12.5C13.3333 12.721 13.2455 12.933 13.0893 13.0893C12.933 13.2455 12.721 13.3333 12.5 13.3333H11.6667C11.4457 13.3333 11.2337 13.2455 11.0774 13.0893C10.9211 12.933 10.8333 12.721 10.8333 12.5V11.6667ZM17.5 11.6667C17.5 11.4457 17.5878 11.2337 17.7441 11.0774C17.9004 10.9211 18.1123 10.8333 18.3333 10.8333H19.1667C19.3877 10.8333 19.5996 10.9211 19.7559 11.0774C19.9122 11.2337 20 11.4457 20 11.6667V12.5C20 12.721 19.9122 12.933 19.7559 13.0893C19.5996 13.2455 19.3877 13.3333 19.1667 13.3333H18.3333C18.1123 13.3333 17.9004 13.2455 17.7441 13.0893C17.5878 12.933 17.5 12.721 17.5 12.5V11.6667ZM3.33333 15C3.33333 14.779 3.42113 14.567 3.57741 14.4107C3.73369 14.2545 3.94565 14.1667 4.16667 14.1667H5C5.22101 14.1667 5.43298 14.2545 5.58926 14.4107C5.74554 14.567 5.83333 14.779 5.83333 15V15.8333C5.83333 16.0543 5.74554 16.2663 5.58926 16.4226C5.43298 16.5789 5.22101 16.6667 5 16.6667H4.16667C3.94565 16.6667 3.73369 16.5789 3.57741 16.4226C3.42113 16.2663 3.33333 16.0543 3.33333 15.8333V15ZM14.1667 15C14.1667 14.779 14.2545 14.567 14.4107 14.4107C14.567 14.2545 14.779 14.1667 15 14.1667H15.8333C16.0543 14.1667 16.2663 14.2545 16.4226 14.4107C16.5789 14.567 16.6667 14.779 16.6667 15V15.8333C16.6667 16.0543 16.5789 16.2663 16.4226 16.4226C16.2663 16.5789 16.0543 16.6667 15.8333 16.6667H15C14.779 16.6667 14.567 16.5789 14.4107 16.4226C14.2545 16.2663 14.1667 16.0543 14.1667 15.8333V15ZM10.8333 18.3333C10.8333 18.1123 10.9211 17.9004 11.0774 17.7441C11.2337 17.5878 11.4457 17.5 11.6667 17.5H12.5C12.721 17.5 12.933 17.5878 13.0893 17.7441C13.2455 17.9004 13.3333 18.1123 13.3333 18.3333V19.1667C13.3333 19.3877 13.2455 19.5996 13.0893 19.7559C12.933 19.9122 12.721 20 12.5 20H11.6667C11.4457 20 11.2337 19.9122 11.0774 19.7559C10.9211 19.5996 10.8333 19.3877 10.8333 19.1667V18.3333ZM17.5 18.3333C17.5 18.1123 17.5878 17.9004 17.7441 17.7441C17.9004 17.5878 18.1123 17.5 18.3333 17.5H19.1667C19.3877 17.5 19.5996 17.5878 19.7559 17.7441C19.9122 17.9004 20 18.1123 20 18.3333V19.1667C20 19.3877 19.9122 19.5996 19.7559 19.7559C19.5996 19.9122 19.3877 20 19.1667 20H18.3333C18.1123 20 17.9004 19.9122 17.7441 19.7559C17.5878 19.5996 17.5 19.3877 17.5 19.1667V18.3333Z" fill="#5F6165"/>
            </svg>
            <button
              onClick={shareOnTwitter}
              aria-label="Share on Twitter"
              className="social-share-button"
            >
            <svg viewBox="0 0 64 64" width="24" height="24"><circle cx="32" cy="32" r="31" fill="#5F6165"></circle><path d="M48,22.1c-1.2,0.5-2.4,0.9-3.8,1c1.4-0.8,2.4-2.1,2.9-3.6c-1.3,0.8-2.7,1.3-4.2,1.6 C41.7,19.8,40,19,38.2,19c-3.6,0-6.6,2.9-6.6,6.6c0,0.5,0.1,1,0.2,1.5c-5.5-0.3-10.3-2.9-13.5-6.9c-0.6,1-0.9,2.1-0.9,3.3 c0,2.3,1.2,4.3,2.9,5.5c-1.1,0-2.1-0.3-3-0.8c0,0,0,0.1,0,0.1c0,3.2,2.3,5.8,5.3,6.4c-0.6,0.1-1.1,0.2-1.7,0.2c-0.4,0-0.8,0-1.2-0.1 c0.8,2.6,3.3,4.5,6.1,4.6c-2.2,1.8-5.1,2.8-8.2,2.8c-0.5,0-1.1,0-1.6-0.1c2.9,1.9,6.4,2.9,10.1,2.9c12.1,0,18.7-10,18.7-18.7 c0-0.3,0-0.6,0-0.8C46,24.5,47.1,23.4,48,22.1z" fill="#fff"></path></svg>
            </button>
            <button
              onClick={shareOnFacebook}
              aria-label="Share on Facebook"
              className="social-share-button"
            >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#5F6165"/>
              <path d="M16.4689 15.6696L17.002 12.2827H13.6674V10.0857C13.6674 9.15889 14.1323 8.25492 15.6259 8.25492H17.1429V5.37143C17.1429 5.37143 15.7668 5.14258 14.4517 5.14258C11.7042 5.14258 9.91003 6.7651 9.91003 9.70125V12.2827H6.85718V15.6696H9.91003V23.8578C10.5229 23.9517 11.15 23.9997 11.7887 23.9997C12.4274 23.9997 13.0545 23.9517 13.6674 23.8578V15.6696H16.4689Z" fill="white"/>
              </svg>
            </button>
            <button
              onClick={shareOnLinkedIn}
              aria-label="Share on LinkedIn"
              className="social-share-button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="12" fill="#5F6165"/>
              <path d="M9.10162 6.59299C9.10162 7.39403 8.4073 8.0434 7.55081 8.0434C6.69432 8.0434 6 7.39403 6 6.59299C6 5.79195 6.69432 5.14258 7.55081 5.14258C8.4073 5.14258 9.10162 5.79195 9.10162 6.59299Z" fill="white"/>
              <path d="M6.21208 9.10952H8.86303V17.1426H6.21208V9.10952Z" fill="white"/>
              <path d="M13.1311 9.10952H10.4801V17.1426H13.1311C13.1311 17.1426 13.1311 14.6137 13.1311 13.0325C13.1311 12.0834 13.4551 11.1302 14.7482 11.1302C16.2094 11.1302 16.2006 12.3722 16.1938 13.3344C16.1849 14.5921 16.2062 15.8756 16.2062 17.1426H18.8571V12.9029C18.8347 10.1958 18.1293 8.94836 15.8085 8.94836C14.4303 8.94836 13.576 9.57406 13.1311 10.1401V9.10952Z" fill="white"/>
              </svg>
            </button>
            <button
              onClick={shareOnWhatsApp}
              aria-label="Share on WhatsApp"
              className="social-share-button"
            >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.2858 10.9986C21.2858 16.6792 16.6807 21.2843 11.0001 21.2843C8.83335 21.2843 6.82311 20.6144 5.1652 19.4703L1.64942 20.3493L2.57072 16.8944C1.40086 15.2249 0.714355 13.1919 0.714355 10.9986C0.714355 5.31796 5.31943 0.712891 11.0001 0.712891C16.6807 0.712891 21.2858 5.31796 21.2858 10.9986Z" fill="#5F6165"/>
            <path d="M8.00002 5.42778C7.71471 4.85471 7.27702 4.90544 6.83486 4.90544C6.04465 4.90544 4.8125 5.85197 4.8125 7.61355C4.8125 9.05726 5.44867 10.6376 7.59236 13.0017C9.66118 15.2832 12.3795 16.4634 14.6362 16.4233C16.8929 16.3831 17.3572 14.4411 17.3572 13.7853C17.3572 13.4946 17.1768 13.3496 17.0525 13.3102C16.2835 12.9411 14.8651 12.2534 14.5424 12.1242C14.2197 11.995 14.0512 12.1698 13.9464 12.2648C13.6538 12.5437 13.0736 13.3657 12.875 13.5506C12.6764 13.7354 12.3802 13.6419 12.257 13.572C11.8035 13.39 10.5739 12.8431 9.59383 11.893C8.38171 10.718 8.31057 10.3137 8.0822 9.95385C7.89951 9.66597 8.03357 9.48934 8.10047 9.41215C8.36163 9.11081 8.72223 8.64558 8.88395 8.41438C9.04566 8.18319 8.91728 7.83218 8.84025 7.61355C8.50895 6.67331 8.22827 5.88623 8.00002 5.42778Z" fill="white"/>
            </svg>
            </button>
            <button
              onClick={shareOnReddit}
              aria-label="Share on Reddit"
              className="social-share-button"
            >
              <svg viewBox="0 0 64 64" width="24" height="24"><circle cx="32" cy="32" r="31" fill="#5F6165"></circle><path d="m 52.8165,31.942362 c 0,-2.4803 -2.0264,-4.4965 -4.5169,-4.4965 -1.2155,0 -2.3171,0.4862 -3.128,1.2682 -3.077,-2.0247 -7.2403,-3.3133 -11.8507,-3.4782 l 2.5211,-7.9373 6.8272,1.5997 -0.0102,0.0986 c 0,2.0281 1.6575,3.6771 3.6958,3.6771 2.0366,0 3.6924,-1.649 3.6924,-3.6771 0,-2.0281 -1.6575,-3.6788 -3.6924,-3.6788 -1.564,0 -2.8968,0.9758 -3.4357,2.3443 l -7.3593,-1.7255 c -0.3213,-0.0782 -0.6477,0.1071 -0.748,0.4233 L 32,25.212062 c -4.8246,0.0578 -9.1953,1.3566 -12.41,3.4425 -0.8058,-0.7446 -1.8751,-1.2104 -3.0583,-1.2104 -2.4905,0 -4.5152,2.0179 -4.5152,4.4982 0,1.649 0.9061,3.0787 2.2389,3.8607 -0.0884,0.4794 -0.1462,0.9639 -0.1462,1.4569 0,6.6487 8.1736,12.0581 18.2223,12.0581 10.0487,0 18.224,-5.4094 18.224,-12.0581 0,-0.4658 -0.0493,-0.9248 -0.1275,-1.377 1.4144,-0.7599 2.3885,-2.2304 2.3885,-3.9406 z m -29.2808,3.0872 c 0,-1.4756 1.207,-2.6775 2.6894,-2.6775 1.4824,0 2.6877,1.2019 2.6877,2.6775 0,1.4756 -1.2053,2.6758 -2.6877,2.6758 -1.4824,0 -2.6894,-1.2002 -2.6894,-2.6758 z m 15.4037,7.9373 c -1.3549,1.3481 -3.4816,2.0043 -6.5008,2.0043 l -0.0221,-0.0051 -0.0221,0.0051 c -3.0209,0 -5.1476,-0.6562 -6.5008,-2.0043 -0.2465,-0.2448 -0.2465,-0.6443 0,-0.8891 0.2465,-0.2465 0.6477,-0.2465 0.8942,0 1.105,1.0999 2.9393,1.6337 5.6066,1.6337 l 0.0221,0.0051 0.0221,-0.0051 c 2.6673,0 4.5016,-0.5355 5.6066,-1.6354 0.2465,-0.2465 0.6477,-0.2448 0.8942,0 0.2465,0.2465 0.2465,0.6443 0,0.8908 z m -0.3213,-5.2615 c -1.4824,0 -2.6877,-1.2002 -2.6877,-2.6758 0,-1.4756 1.2053,-2.6775 2.6877,-2.6775 1.4824,0 2.6877,1.2019 2.6877,2.6775 0,1.4756 -1.2053,2.6758 -2.6877,2.6758 z" fill="#fff"></path></svg>
            </button>
            </div>
        </div>
        {/* Embed Section */}
        <div className="share-section-embed">
            <div className="share-embed-label">
            Embed your form anywhere. Choose an embed type.
            </div>
            <div className="embed-section">
             <Select
                value={selectedCode}
                onChange={handleChange}
                className="share-select"
              >
                <Option value="lwc">For LWC</Option>
                <Option value="aura">Aura</Option>
                <Option value="visualforce">Visualforce</Option>
              </Select>
              
              <button className="share-copy-embed" onClick={handleCopyEmbed}>
              {copiedEmbed ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 20 20" aria-hidden="true" class="h-5 pr-1"><path fill='white' fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16m3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0z" clip-rule="evenodd"/></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="h-5 pr-1"><path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
              Copy embed code
                </>
              )}
            </button>
            </div>
            <textarea
            className="share-embed-code"
            rows={4}
            value={embedCodes[selectedCode]}
            readOnly
            />
            
        </div>
        </div>
    </div>
  );
};

export default SharePage;
