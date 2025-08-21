import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './SharePage.css';
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from 'framer-motion';


const SharePage = ({ publishLink, noPublishLink = false, onPublish }) => {

  const [copiedLink, setCopiedLink] = useState(false); // for copy link button
  const [copiedEmbed, setCopiedEmbed] = useState(false); // for copy embed button
  const [qrVisible, setQrVisible] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  const [facebookHover, setFacebookHover] = useState(false);
  const [linkedInHover, setLinkedInHover] = useState(false);
  const [whatsappHover, setWhatsappHover] = useState(false);
  const [redditHover, setRedditHover] = useState(false);
  const [qrHover, setQrHover] = useState(false);
  const [twitterHover, setTwitterHover] = useState(false);
  const [selectedTab, setSelectedTab] = useState('html'); // or 'css'

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
      const textToCopy = selectedTab === 'html' ? embedHtmlCode(publishLink) : embedCssCode;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      // Optional error handling
    }
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

  // Opens QR Popup
  const handleShowQr = () => setQrVisible(true);

  // Closes QR Popup
  const handleCloseQr = () => setQrVisible(false);

  // Downloads the QR code as PNG
  const handleDownloadQr = () => {
    const canvas = document.getElementById('share-qr-canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = 'qr-code.png';
      link.click();
    }
  };

  // Copies the QR code as an image to clipboard (modern browsers)
  const handleCopyQr = async () => {
    const canvas = document.getElementById('share-qr-canvas');
    if (canvas) {
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({ 'image/png': blob })
          ]);
           setCopiedQr(true);
          setTimeout(() => setCopiedQr(false), 2000);
        } catch {
          
        }
      }, 'image/png');
    }
  };

  const embedHtmlCode = (publishLink) => `<div class="custom-form-wrapper">
  <iframe
    src="${publishLink}"
    class="custom-form-iframe"
    allowfullscreen
    title="Shared Form"
  ></iframe>
</div>`;

  const embedCssCode = `/* Embed CSS to add to your stylesheet */
  .custom-form-wrapper {
    max-width: 700px;
    width: 100%;
    margin: 0 auto;
    padding: 10px;
    box-sizing: border-box;
    border: 2px solid #8fdcf1;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .custom-form-iframe {
    width: 100%;
    height: 450px;
    border: none;
    border-radius: 6px;
    display: block;
  }
  `;




  return (
    <motion.div 
      className="share-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
    <div className="share-container">
          {noPublishLink && (
        <>
          <div className="no-publish-link-modal">
            <p className='no-publish-title'>Publish your form and start collecting responses!</p>
            <p className='no-publish-content'>You're one click away from going live</p>
            <div className='button-container'>
              <button className="login-button" onClick={onPublish}>
                <div className='button-text-container'>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.35031 7.64885L5.76031 8.11885C6.69231 8.42885 7.15731 8.58485 7.49131 8.91885C7.82531 9.25285 7.98131 9.71885 8.29131 10.6489L8.76131 12.0589C9.54531 14.4129 9.93731 15.5889 10.6583 15.5889C11.3783 15.5889 11.7713 14.4129 12.5553 12.0589L15.3933 3.54685C15.9453 1.89085 16.2213 1.06285 15.7843 0.625853C15.3473 0.188853 14.5193 0.464853 12.8643 1.01585L4.34931 3.85585C1.99831 4.63885 0.820312 5.03085 0.820312 5.75185C0.820312 6.47285 1.99731 6.86485 4.35031 7.64885Z" fill="white"></path><path d="M6.1841 9.59379L4.1221 8.90679C3.97781 8.85869 3.82445 8.84414 3.67369 8.86424C3.52293 8.88434 3.37874 8.93857 3.2521 9.02279L2.1621 9.74879C2.03307 9.83476 1.9318 9.95636 1.87061 10.0988C1.80941 10.2413 1.79094 10.3985 1.81742 10.5512C1.84391 10.704 1.91421 10.8458 2.01979 10.9593C2.12537 11.0729 2.26166 11.1533 2.4121 11.1908L4.3671 11.6788C4.45508 11.7008 4.53542 11.7462 4.59954 11.8103C4.66366 11.8745 4.70914 11.9548 4.7311 12.0428L5.2191 13.9978C5.25661 14.1482 5.33703 14.2845 5.45058 14.3901C5.56413 14.4957 5.7059 14.566 5.85867 14.5925C6.01144 14.619 6.16861 14.6005 6.31107 14.5393C6.45353 14.4781 6.57513 14.3768 6.6611 14.2478L7.3871 13.1578C7.47132 13.0311 7.52555 12.887 7.54565 12.7362C7.56575 12.5854 7.5512 12.4321 7.5031 12.2878L6.8161 10.2258C6.76699 10.0786 6.68433 9.94494 6.57464 9.83525C6.46495 9.72556 6.33124 9.6429 6.1841 9.59379Z" fill="white"></path></svg>

                <span className='publish-text'>Publish</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
      <div className={`main-share-content${noPublishLink ? ' blurred' : ''}`}>
        <h2 className="share-title">Share</h2>
        {/* Share Link Section */}
        <div className="share-section">
            <div className="share-label">Form Link</div>
            <div className="share-row">
            <input className="share-input" readOnly value={publishLink} />
            <motion.div className="open-link"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <motion.button
                className="open-link-button"
                onClick={() => window.open(publishLink, '_blank', 'noopener,noreferrer')}
                aria-label="Open public link"
                type="button"
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <svg className="redirect-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3333 10.6667L20 4M20 4H15.5556M20 4V8.44444M20 13.7778V18.2222C20 18.6937 19.8127 19.1459 19.4793 19.4793C19.1459 19.8127 18.6937 20 18.2222 20H5.77778C5.30628 20 4.8541 19.8127 4.5207 19.4793C4.1873 19.1459 4 18.6937 4 18.2222V5.77778C4 5.30628 4.1873 4.8541 4.5207 4.5207C4.8541 4.1873 5.30628 4 5.77778 4H10.2222" stroke="#5F6165" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
              </motion.button>
            </motion.div>
            
             <motion.button className="share-copy" onClick={handleCopyLink}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
             >
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
            </motion.button>
            </div>
            <div className="share-social-row">
              <div className="qr"
                  onClick={handleShowQr}
                  role="button"
                  aria-label="Show QR for Form Link"
                  onMouseEnter={() => setQrHover(true)}
                  onMouseLeave={() => setQrHover(false)}>
                  
                <motion.button
                  className="social-share-button"
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                {qrHover ? (
                  
                  <svg className="hover-svg" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2.08333C0 0.932222 0.933333 0 2.08333 0H7.08333C8.23444 0 9.16667 0.933333 9.16667 2.08333V7.08333C9.16667 8.23444 8.23333 9.16667 7.08333 9.16667H2.08333C1.5308 9.16667 1.0009 8.94717 0.610194 8.55647C0.219493 8.16577 0 7.63587 0 7.08333V2.08333ZM2.08333 1.66667C1.97283 1.66667 1.86685 1.71057 1.78871 1.78871C1.71057 1.86685 1.66667 1.97283 1.66667 2.08333V7.08333C1.66667 7.31333 1.85333 7.5 2.08333 7.5H7.08333C7.19384 7.5 7.29982 7.4561 7.37796 7.37796C7.4561 7.29982 7.5 7.19384 7.5 7.08333V2.08333C7.5 1.97283 7.4561 1.86685 7.37796 1.78871C7.29982 1.71057 7.19384 1.66667 7.08333 1.66667H2.08333ZM10.8333 2.08333C10.8333 0.932222 11.7667 0 12.9167 0H17.9167C19.0667 0 20 0.933333 20 2.08333V7.08333C20 8.23444 19.0667 9.16667 17.9167 9.16667H12.9167C12.3641 9.16667 11.8342 8.94717 11.4435 8.55647C11.0528 8.16577 10.8333 7.63587 10.8333 7.08333V2.08333ZM12.9167 1.66667C12.8062 1.66667 12.7002 1.71057 12.622 1.78871C12.5439 1.86685 12.5 1.97283 12.5 2.08333V7.08333C12.5 7.31333 12.6867 7.5 12.9167 7.5H17.9167C18.0272 7.5 18.1332 7.4561 18.2113 7.37796C18.2894 7.29982 18.3333 7.19384 18.3333 7.08333V2.08333C18.3333 1.97283 18.2894 1.86685 18.2113 1.78871C18.1332 1.71057 18.0272 1.66667 17.9167 1.66667H12.9167ZM3.33333 4.16667C3.33333 3.94565 3.42113 3.73369 3.57741 3.57741C3.73369 3.42113 3.94565 3.33333 4.16667 3.33333H5C5.22101 3.33333 5.43298 3.42113 5.58926 3.57741C5.74554 3.73369 5.83333 3.94565 5.83333 4.16667V5C5.83333 5.22101 5.74554 5.43298 5.58926 5.58926C5.43298 5.74554 5.22101 5.83333 5 5.83333H4.16667C3.94565 5.83333 3.73369 5.74554 3.57741 5.58926C3.42113 5.43298 3.33333 5.22101 3.33333 5V4.16667ZM14.1667 4.16667C14.1667 3.94565 14.2545 3.73369 14.4107 3.57741C14.567 3.42113 14.779 3.33333 15 3.33333H15.8333C16.0543 3.33333 16.2663 3.42113 16.4226 3.57741C16.5789 3.73369 16.6667 3.94565 16.6667 4.16667V5C16.6667 5.22101 16.5789 5.43298 16.4226 5.58926C16.2663 5.74554 16.0543 5.83333 15.8333 5.83333H15C14.779 5.83333 14.567 5.74554 14.4107 5.58926C14.2545 5.43298 14.1667 5.22101 14.1667 5V4.16667ZM0 12.9167C0 11.7656 0.933333 10.8333 2.08333 10.8333H7.08333C8.23444 10.8333 9.16667 11.7667 9.16667 12.9167V17.9167C9.16667 19.0667 8.23333 20 7.08333 20H2.08333C1.5308 20 1.0009 19.7805 0.610194 19.3898C0.219493 18.9991 0 18.4692 0 17.9167V12.9167ZM2.08333 12.5C1.97283 12.5 1.86685 12.5439 1.78871 12.622C1.71057 12.7002 1.66667 12.8062 1.66667 12.9167V17.9167C1.66667 18.1467 1.85333 18.3333 2.08333 18.3333H7.08333C7.19384 18.3333 7.29982 18.2894 7.37796 18.2113C7.4561 18.1332 7.5 18.0272 7.5 17.9167V12.9167C7.5 12.8062 7.4561 12.7002 7.37796 12.622C7.29982 12.5439 7.19384 12.5 7.08333 12.5H2.08333ZM10.8333 11.6667C10.8333 11.4457 10.9211 11.2337 11.0774 11.0774C11.2337 10.9211 11.4457 10.8333 11.6667 10.8333H12.5C12.721 10.8333 12.933 10.9211 13.0893 11.0774C13.2455 11.2337 13.3333 11.4457 13.3333 11.6667V12.5C13.3333 12.721 13.2455 12.933 13.0893 13.0893C12.933 13.2455 12.721 13.3333 12.5 13.3333H11.6667C11.4457 13.3333 11.2337 13.2455 11.0774 13.0893C10.9211 12.933 10.8333 12.721 10.8333 12.5V11.6667ZM17.5 11.6667C17.5 11.4457 17.5878 11.2337 17.7441 11.0774C17.9004 10.9211 18.1123 10.8333 18.3333 10.8333H19.1667C19.3877 10.8333 19.5996 10.9211 19.7559 11.0774C19.9122 11.2337 20 11.4457 20 11.6667V12.5C20 12.721 19.9122 12.933 19.7559 13.0893C19.5996 13.2455 19.3877 13.3333 19.1667 13.3333H18.3333C18.1123 13.3333 17.9004 13.2455 17.7441 13.0893C17.5878 12.933 17.5 12.721 17.5 12.5V11.6667ZM3.33333 15C3.33333 14.779 3.42113 14.567 3.57741 14.4107C3.73369 14.2545 3.94565 14.1667 4.16667 14.1667H5C5.22101 14.1667 5.43298 14.2545 5.58926 14.4107C5.74554 14.567 5.83333 14.779 5.83333 15V15.8333C5.83333 16.0543 5.74554 16.2663 5.58926 16.4226C5.43298 16.5789 5.22101 16.6667 5 16.6667H4.16667C3.94565 16.6667 3.73369 16.5789 3.57741 16.4226C3.42113 16.2663 3.33333 16.0543 3.33333 15.8333V15ZM14.1667 15C14.1667 14.779 14.2545 14.567 14.4107 14.4107C14.567 14.2545 14.779 14.1667 15 14.1667H15.8333C16.0543 14.1667 16.2663 14.2545 16.4226 14.4107C16.5789 14.567 16.6667 14.779 16.6667 15V15.8333C16.6667 16.0543 16.5789 16.2663 16.4226 16.4226C16.2663 16.5789 16.0543 16.6667 15.8333 16.6667H15C14.779 16.6667 14.567 16.5789 14.4107 16.4226C14.2545 16.2663 14.1667 16.0543 14.1667 15.8333V15ZM10.8333 18.3333C10.8333 18.1123 10.9211 17.9004 11.0774 17.7441C11.2337 17.5878 11.4457 17.5 11.6667 17.5H12.5C12.721 17.5 12.933 17.5878 13.0893 17.7441C13.2455 17.9004 13.3333 18.1123 13.3333 18.3333V19.1667C13.3333 19.3877 13.2455 19.5996 13.0893 19.7559C12.933 19.9122 12.721 20 12.5 20H11.6667C11.4457 20 11.2337 19.9122 11.0774 19.7559C10.9211 19.5996 10.8333 19.3877 10.8333 19.1667V18.3333ZM17.5 18.3333C17.5 18.1123 17.5878 17.9004 17.7441 17.7441C17.9004 17.5878 18.1123 17.5 18.3333 17.5H19.1667C19.3877 17.5 19.5996 17.5878 19.7559 17.7441C19.9122 17.9004 20 18.1123 20 18.3333V19.1667C20 19.3877 19.9122 19.5996 19.7559 19.7559C19.5996 19.9122 19.3877 20 19.1667 20H18.3333C18.1123 20 17.9004 19.9122 17.7441 19.7559C17.5878 19.5996 17.5 19.3877 17.5 19.1667V18.3333Z" fill="black"/>
                  </svg>


                ) : (
                  // Your current SVG
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2.08333C0 0.932222 0.933333 0 2.08333 0H7.08333C8.23444 0 9.16667 0.933333 9.16667 2.08333V7.08333C9.16667 8.23444 8.23333 9.16667 7.08333 9.16667H2.08333C1.5308 9.16667 1.0009 8.94717 0.610194 8.55647C0.219493 8.16577 0 7.63587 0 7.08333V2.08333ZM2.08333 1.66667C1.97283 1.66667 1.86685 1.71057 1.78871 1.78871C1.71057 1.86685 1.66667 1.97283 1.66667 2.08333V7.08333C1.66667 7.31333 1.85333 7.5 2.08333 7.5H7.08333C7.19384 7.5 7.29982 7.4561 7.37796 7.37796C7.4561 7.29982 7.5 7.19384 7.5 7.08333V2.08333C7.5 1.97283 7.4561 1.86685 7.37796 1.78871C7.29982 1.71057 7.19384 1.66667 7.08333 1.66667H2.08333ZM10.8333 2.08333C10.8333 0.932222 11.7667 0 12.9167 0H17.9167C19.0667 0 20 0.933333 20 2.08333V7.08333C20 8.23444 19.0667 9.16667 17.9167 9.16667H12.9167C12.3641 9.16667 11.8342 8.94717 11.4435 8.55647C11.0528 8.16577 10.8333 7.63587 10.8333 7.08333V2.08333ZM12.9167 1.66667C12.8062 1.66667 12.7002 1.71057 12.622 1.78871C12.5439 1.86685 12.5 1.97283 12.5 2.08333V7.08333C12.5 7.31333 12.6867 7.5 12.9167 7.5H17.9167C18.0272 7.5 18.1332 7.4561 18.2113 7.37796C18.2894 7.29982 18.3333 7.19384 18.3333 7.08333V2.08333C18.3333 1.97283 18.2894 1.86685 18.2113 1.78871C18.1332 1.71057 18.0272 1.66667 17.9167 1.66667H12.9167ZM3.33333 4.16667C3.33333 3.94565 3.42113 3.73369 3.57741 3.57741C3.73369 3.42113 3.94565 3.33333 4.16667 3.33333H5C5.22101 3.33333 5.43298 3.42113 5.58926 3.57741C5.74554 3.73369 5.83333 3.94565 5.83333 4.16667V5C5.83333 5.22101 5.74554 5.43298 5.58926 5.58926C5.43298 5.74554 5.22101 5.83333 5 5.83333H4.16667C3.94565 5.83333 3.73369 5.74554 3.57741 5.58926C3.42113 5.43298 3.33333 5.22101 3.33333 5V4.16667ZM14.1667 4.16667C14.1667 3.94565 14.2545 3.73369 14.4107 3.57741C14.567 3.42113 14.779 3.33333 15 3.33333H15.8333C16.0543 3.33333 16.2663 3.42113 16.4226 3.57741C16.5789 3.73369 16.6667 3.94565 16.6667 4.16667V5C16.6667 5.22101 16.5789 5.43298 16.4226 5.58926C16.2663 5.74554 16.0543 5.83333 15.8333 5.83333H15C14.779 5.83333 14.567 5.74554 14.4107 5.58926C14.2545 5.43298 14.1667 5.22101 14.1667 5V4.16667ZM0 12.9167C0 11.7656 0.933333 10.8333 2.08333 10.8333H7.08333C8.23444 10.8333 9.16667 11.7667 9.16667 12.9167V17.9167C9.16667 19.0667 8.23333 20 7.08333 20H2.08333C1.5308 20 1.0009 19.7805 0.610194 19.3898C0.219493 18.9991 0 18.4692 0 17.9167V12.9167ZM2.08333 12.5C1.97283 12.5 1.86685 12.5439 1.78871 12.622C1.71057 12.7002 1.66667 12.8062 1.66667 12.9167V17.9167C1.66667 18.1467 1.85333 18.3333 2.08333 18.3333H7.08333C7.19384 18.3333 7.29982 18.2894 7.37796 18.2113C7.4561 18.1332 7.5 18.0272 7.5 17.9167V12.9167C7.5 12.8062 7.4561 12.7002 7.37796 12.622C7.29982 12.5439 7.19384 12.5 7.08333 12.5H2.08333ZM10.8333 11.6667C10.8333 11.4457 10.9211 11.2337 11.0774 11.0774C11.2337 10.9211 11.4457 10.8333 11.6667 10.8333H12.5C12.721 10.8333 12.933 10.9211 13.0893 11.0774C13.2455 11.2337 13.3333 11.4457 13.3333 11.6667V12.5C13.3333 12.721 13.2455 12.933 13.0893 13.0893C12.933 13.2455 12.721 13.3333 12.5 13.3333H11.6667C11.4457 13.3333 11.2337 13.2455 11.0774 13.0893C10.9211 12.933 10.8333 12.721 10.8333 12.5V11.6667ZM17.5 11.6667C17.5 11.4457 17.5878 11.2337 17.7441 11.0774C17.9004 10.9211 18.1123 10.8333 18.3333 10.8333H19.1667C19.3877 10.8333 19.5996 10.9211 19.7559 11.0774C19.9122 11.2337 20 11.4457 20 11.6667V12.5C20 12.721 19.9122 12.933 19.7559 13.0893C19.5996 13.2455 19.3877 13.3333 19.1667 13.3333H18.3333C18.1123 13.3333 17.9004 13.2455 17.7441 13.0893C17.5878 12.933 17.5 12.721 17.5 12.5V11.6667ZM3.33333 15C3.33333 14.779 3.42113 14.567 3.57741 14.4107C3.73369 14.2545 3.94565 14.1667 4.16667 14.1667H5C5.22101 14.1667 5.43298 14.2545 5.58926 14.4107C5.74554 14.567 5.83333 14.779 5.83333 15V15.8333C5.83333 16.0543 5.74554 16.2663 5.58926 16.4226C5.43298 16.5789 5.22101 16.6667 5 16.6667H4.16667C3.94565 16.6667 3.73369 16.5789 3.57741 16.4226C3.42113 16.2663 3.33333 16.0543 3.33333 15.8333V15ZM14.1667 15C14.1667 14.779 14.2545 14.567 14.4107 14.4107C14.567 14.2545 14.779 14.1667 15 14.1667H15.8333C16.0543 14.1667 16.2663 14.2545 16.4226 14.4107C16.5789 14.567 16.6667 14.779 16.6667 15V15.8333C16.6667 16.0543 16.5789 16.2663 16.4226 16.4226C16.2663 16.5789 16.0543 16.6667 15.8333 16.6667H15C14.779 16.6667 14.567 16.5789 14.4107 16.4226C14.2545 16.2663 14.1667 16.0543 14.1667 15.8333V15ZM10.8333 18.3333C10.8333 18.1123 10.9211 17.9004 11.0774 17.7441C11.2337 17.5878 11.4457 17.5 11.6667 17.5H12.5C12.721 17.5 12.933 17.5878 13.0893 17.7441C13.2455 17.9004 13.3333 18.1123 13.3333 18.3333V19.1667C13.3333 19.3877 13.2455 19.5996 13.0893 19.7559C12.933 19.9122 12.721 20 12.5 20H11.6667C11.4457 20 11.2337 19.9122 11.0774 19.7559C10.9211 19.5996 10.8333 19.3877 10.8333 19.1667V18.3333ZM17.5 18.3333C17.5 18.1123 17.5878 17.9004 17.7441 17.7441C17.9004 17.5878 18.1123 17.5 18.3333 17.5H19.1667C19.3877 17.5 19.5996 17.5878 19.7559 17.7441C19.9122 17.9004 20 18.1123 20 18.3333V19.1667C20 19.3877 19.9122 19.5996 19.7559 19.7559C19.5996 19.9122 19.3877 20 19.1667 20H18.3333C18.1123 20 17.9004 19.9122 17.7441 19.7559C17.5878 19.5996 17.5 19.3877 17.5 19.1667V18.3333Z" fill="#5F6165"/>
                  </svg>
                )}
                </motion.button>
              </div>
            <div
            className="twitter"
            onClick={shareOnTwitter}
            aria-label="Share on Twitter"
            onMouseEnter={() => setTwitterHover(true)}
            onMouseLeave={() => setTwitterHover(false)}
            role="button"
            >
            <motion.button
              className="social-share-button"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
            {twitterHover ? (
              // Hover: Twitter blue circle, white bird
             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_2056_15338)">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M13.2879 19.1673L8.66337 12.5757L2.87405 19.1673H0.424805L7.57674 11.0266L0.424805 0.833984H6.71309L11.0717 7.0465L16.5327 0.833984H18.982L12.1619 8.59772L19.5762 19.1673H13.2879ZM16.0154 17.309H14.3665L3.93176 2.69232H5.58092L9.7601 8.54495L10.4828 9.56054L16.0154 17.309Z" fill="#242E36"/>
            </g>
            <defs>
            <clipPath id="clip0_2056_15338">
            <rect width="20" height="20" fill="white"/>
            </clipPath>
            </defs>
            </svg>


            ) : (
             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clip-path="url(#clip0_2056_15340)">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M13.2879 19.1673L8.66337 12.5757L2.87405 19.1673H0.424805L7.57674 11.0266L0.424805 0.833984H6.71309L11.0717 7.0465L16.5327 0.833984H18.982L12.1619 8.59772L19.5762 19.1673H13.2879ZM16.0154 17.309H14.3665L3.93176 2.69232H5.58092L9.7601 8.54495L10.4828 9.56054L16.0154 17.309Z" fill="#5F6165"/>
              </g>
              <defs>
              <clipPath id="clip0_2056_15340">
              <rect width="20" height="20" fill="white"/>
              </clipPath>
              </defs>
              </svg>


            )}
            </motion.button>
            </div>
            <div
              onClick={shareOnFacebook}
              aria-label="Share on Facebook"
              onMouseEnter={() => setFacebookHover(true)}
              onMouseLeave={() => setFacebookHover(false)}
              role="button"
              className="fb"
            >
            <motion.button
              className="social-share-button"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {facebookHover ? (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="url(#paint0_linear_773_12823)"/>
              <path d="M16.4687 15.6696L17.0017 12.2827H13.6671V10.0857C13.6671 9.15889 14.1321 8.25492 15.6256 8.25492H17.1426V5.37143C17.1426 5.37143 15.7665 5.14258 14.4514 5.14258C11.7039 5.14258 9.90979 6.7651 9.90979 9.70125V12.2827H6.85693V15.6696H9.90979V23.8578C10.5227 23.9517 11.1497 23.9997 11.7885 23.9997C12.4272 23.9997 13.0542 23.9517 13.6671 23.8578V15.6696H16.4687Z" fill="white"/>
              <defs>
              <linearGradient id="paint0_linear_773_12823" x1="12" y1="0" x2="12" y2="23.9288" gradientUnits="userSpaceOnUse">
              <stop stop-color="#18ACFE"/>
              <stop offset="1" stop-color="#0163E0"/>
              </linearGradient>
              </defs>
              </svg>

              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#5F6165"/>
                <path d="M16.4687 15.6696L17.0017 12.2827H13.6671V10.0857C13.6671 9.15889 14.1321 8.25492 15.6256 8.25492H17.1426V5.37143C17.1426 5.37143 15.7665 5.14258 14.4514 5.14258C11.7039 5.14258 9.90979 6.7651 9.90979 9.70125V12.2827H6.85693V15.6696H9.90979V23.8578C10.5227 23.9517 11.1497 23.9997 11.7885 23.9997C12.4272 23.9997 13.0542 23.9517 13.6671 23.8578V15.6696H16.4687Z" fill="white"/>
                </svg>
              )}
            </motion.button>
            </div>
            <div
              onClick={shareOnLinkedIn}
              aria-label="Share on LinkedIn"
              onMouseEnter={() => setLinkedInHover(true)}
              onMouseLeave={() => setLinkedInHover(false)}
              role="button"
              className="linkedin"
              >
            <motion.button
              className="social-share-button"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
             {linkedInHover ? (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="12" fill="#1275B1"/>
            <path d="M9.10162 6.59299C9.10162 7.39403 8.4073 8.0434 7.55081 8.0434C6.69432 8.0434 6 7.39403 6 6.59299C6 5.79195 6.69432 5.14258 7.55081 5.14258C8.4073 5.14258 9.10162 5.79195 9.10162 6.59299Z" fill="white"/>
            <path d="M6.21208 9.10952H8.86303V17.1426H6.21208V9.10952Z" fill="white"/>
            <path d="M13.1311 9.10952H10.4801V17.1426H13.1311C13.1311 17.1426 13.1311 14.6137 13.1311 13.0325C13.1311 12.0834 13.4551 11.1302 14.7482 11.1302C16.2094 11.1302 16.2006 12.3722 16.1938 13.3344C16.1849 14.5921 16.2062 15.8756 16.2062 17.1426H18.8571V12.9029C18.8347 10.1958 18.1293 8.94836 15.8085 8.94836C14.4303 8.94836 13.576 9.57406 13.1311 10.1401V9.10952Z" fill="white"/>
            </svg>

            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="12" fill="#5F6165"/>
              <path d="M9.10162 6.59299C9.10162 7.39403 8.4073 8.0434 7.55081 8.0434C6.69432 8.0434 6 7.39403 6 6.59299C6 5.79195 6.69432 5.14258 7.55081 5.14258C8.4073 5.14258 9.10162 5.79195 9.10162 6.59299Z" fill="white"/>
              <path d="M6.21208 9.10952H8.86303V17.1426H6.21208V9.10952Z" fill="white"/>
              <path d="M13.1311 9.10952H10.4801V17.1426H13.1311C13.1311 17.1426 13.1311 14.6137 13.1311 13.0325C13.1311 12.0834 13.4551 11.1302 14.7482 11.1302C16.2094 11.1302 16.2006 12.3722 16.1938 13.3344C16.1849 14.5921 16.2062 15.8756 16.2062 17.1426H18.8571V12.9029C18.8347 10.1958 18.1293 8.94836 15.8085 8.94836C14.4303 8.94836 13.576 9.57406 13.1311 10.1401V9.10952Z" fill="white"/>
              </svg>


            )}
            </motion.button>
            </div>
            <div
              onClick={shareOnWhatsApp}
              aria-label="Share on WhatsApp"
              onMouseEnter={() => setWhatsappHover(true)}
              onMouseLeave={() => setWhatsappHover(false)}
              role="button"
              className="wp"
            >
            <motion.button
              className="social-share-button"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
            {whatsappHover ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 11.9961C24 18.6235 18.6274 23.9961 12 23.9961C9.47217 23.9961 7.12689 23.2145 5.19266 21.8797L1.09091 22.9052L2.16576 18.8745C0.800924 16.9268 0 14.555 0 11.9961C0 5.36868 5.37258 -0.00390625 12 -0.00390625C18.6274 -0.00390625 24 5.36868 24 11.9961Z" fill="#53CB60"/>
              <path d="M9.00002 6.42582C8.71471 5.85276 8.27702 5.90349 7.83486 5.90349C7.04465 5.90349 5.8125 6.85002 5.8125 8.6116C5.8125 10.0553 6.44867 11.6357 8.59236 13.9997C10.6612 16.2812 13.3795 17.4615 15.6362 17.4213C17.8929 17.3811 18.3572 15.4392 18.3572 14.7833C18.3572 14.4927 18.1768 14.3476 18.0525 14.3082C17.2835 13.9392 15.8651 13.2515 15.5424 13.1223C15.2197 12.9931 15.0512 13.1678 14.9464 13.2629C14.6538 13.5418 14.0736 14.3637 13.875 14.5486C13.6764 14.7335 13.3802 14.6399 13.257 14.57C12.8035 14.3881 11.5739 13.8411 10.5938 12.891C9.38171 11.716 9.31057 11.3118 9.0822 10.9519C8.89951 10.664 9.03357 10.4874 9.10047 10.4102C9.36163 10.1089 9.72223 9.64363 9.88395 9.41243C10.0457 9.18124 9.91728 8.83022 9.84025 8.6116C9.50895 7.67136 9.22827 6.88428 9.00002 6.42582Z" fill="white"/>
              </svg>


            ) : (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 11.998C24 18.6255 18.6274 23.998 12 23.998C9.47217 23.998 7.12689 23.2164 5.19266 21.8817L1.09091 22.9071L2.16576 18.8765C0.800924 16.9287 0 14.5569 0 11.998C0 5.37063 5.37258 -0.00195312 12 -0.00195312C18.6274 -0.00195312 24 5.37063 24 11.998Z" fill="#5F6165"/>
            <path d="M9.00002 6.42778C8.71471 5.85471 8.27702 5.90544 7.83486 5.90544C7.04465 5.90544 5.8125 6.85197 5.8125 8.61355C5.8125 10.0573 6.44867 11.6376 8.59236 14.0017C10.6612 16.2832 13.3795 17.4634 15.6362 17.4233C17.8929 17.3831 18.3572 15.4411 18.3572 14.7853C18.3572 14.4946 18.1768 14.3496 18.0525 14.3102C17.2835 13.9411 15.8651 13.2534 15.5424 13.1242C15.2197 12.995 15.0512 13.1698 14.9464 13.2648C14.6538 13.5437 14.0736 14.3657 13.875 14.5506C13.6764 14.7354 13.3802 14.6419 13.257 14.572C12.8035 14.39 11.5739 13.8431 10.5938 12.893C9.38171 11.718 9.31057 11.3137 9.0822 10.9539C8.89951 10.666 9.03357 10.4893 9.10047 10.4122C9.36163 10.1108 9.72223 9.64558 9.88395 9.41438C10.0457 9.18319 9.91728 8.83218 9.84025 8.61355C9.50895 7.67331 9.22827 6.88623 9.00002 6.42778Z" fill="white"/>
            </svg>


            )}
            </motion.button>
            </div>
            <div
            className="reddit"
            onClick={shareOnReddit}
            aria-label="Share on Reddit"
            onMouseEnter={() => setRedditHover(true)}
            onMouseLeave={() => setRedditHover(false)}
            >
            <motion.button
              className="social-share-button"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
            {redditHover ? (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#FF4500"/>
            <path d="M20.0002 12.0003C20.0002 11.0319 19.2143 10.2459 18.2459 10.2459C17.7687 10.2459 17.3476 10.4284 17.0388 10.7371C15.8459 9.88098 14.1897 9.31958 12.3652 9.2494L13.1652 5.50204L15.7617 6.0494C15.7897 6.70905 16.3371 7.24239 17.0108 7.24239C17.6985 7.24239 18.2599 6.68098 18.2599 5.99326C18.2599 5.30555 17.6985 4.74414 17.0108 4.74414C16.5195 4.74414 16.0985 5.02484 15.902 5.4459L12.9967 4.82835C12.9125 4.81432 12.8283 4.82835 12.7581 4.87046C12.688 4.91256 12.6459 4.98274 12.6178 5.06695L11.7336 9.2494C9.86692 9.30554 8.19674 9.85291 6.98972 10.7371C6.68095 10.4424 6.24586 10.2459 5.78271 10.2459C4.81429 10.2459 4.02832 11.0319 4.02832 12.0003C4.02832 12.7161 4.44937 13.3196 5.06692 13.6003C5.03885 13.7687 5.02481 13.9512 5.02481 14.1336C5.02481 16.8284 8.15464 19.0038 12.0283 19.0038C15.902 19.0038 19.0318 16.8284 19.0318 14.1336C19.0318 13.9512 19.0178 13.7827 18.9897 13.6143C19.5652 13.3336 20.0002 12.7161 20.0002 12.0003ZM8.00025 13.2494C8.00025 12.5617 8.56165 12.0003 9.24937 12.0003C9.93709 12.0003 10.4985 12.5617 10.4985 13.2494C10.4985 13.9371 9.93709 14.4985 9.24937 14.4985C8.56165 14.4985 8.00025 13.9371 8.00025 13.2494ZM14.9757 16.5477C14.1195 17.4038 12.4915 17.4599 12.0143 17.4599C11.5371 17.4599 9.89499 17.3898 9.05288 16.5477C8.92657 16.4213 8.92657 16.2108 9.05288 16.0845C9.1792 15.9582 9.38972 15.9582 9.51604 16.0845C10.0494 16.6178 11.2003 16.8143 12.0283 16.8143C12.8564 16.8143 13.9932 16.6178 14.5406 16.0845C14.6669 15.9582 14.8774 15.9582 15.0038 16.0845C15.102 16.2248 15.102 16.4213 14.9757 16.5477ZM14.7511 14.4985C14.0634 14.4985 13.502 13.9371 13.502 13.2494C13.502 12.5617 14.0634 12.0003 14.7511 12.0003C15.4388 12.0003 16.0002 12.5617 16.0002 13.2494C16.0002 13.9371 15.4388 14.4985 14.7511 14.4985Z" fill="white"/>
            </svg>
            ) : (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#5F6165"/>
              <path d="M20.0002 12.0003C20.0002 11.0319 19.2143 10.2459 18.2459 10.2459C17.7687 10.2459 17.3476 10.4284 17.0388 10.7371C15.8459 9.88098 14.1897 9.31958 12.3652 9.2494L13.1652 5.50204L15.7617 6.0494C15.7897 6.70905 16.3371 7.24239 17.0108 7.24239C17.6985 7.24239 18.2599 6.68098 18.2599 5.99326C18.2599 5.30555 17.6985 4.74414 17.0108 4.74414C16.5195 4.74414 16.0985 5.02484 15.902 5.4459L12.9967 4.82835C12.9125 4.81432 12.8283 4.82835 12.7581 4.87046C12.688 4.91256 12.6459 4.98274 12.6178 5.06695L11.7336 9.2494C9.86692 9.30554 8.19674 9.85291 6.98972 10.7371C6.68095 10.4424 6.24586 10.2459 5.78271 10.2459C4.81429 10.2459 4.02832 11.0319 4.02832 12.0003C4.02832 12.7161 4.44937 13.3196 5.06692 13.6003C5.03885 13.7687 5.02481 13.9512 5.02481 14.1336C5.02481 16.8284 8.15464 19.0038 12.0283 19.0038C15.902 19.0038 19.0318 16.8284 19.0318 14.1336C19.0318 13.9512 19.0178 13.7827 18.9897 13.6143C19.5652 13.3336 20.0002 12.7161 20.0002 12.0003ZM8.00025 13.2494C8.00025 12.5617 8.56165 12.0003 9.24937 12.0003C9.93709 12.0003 10.4985 12.5617 10.4985 13.2494C10.4985 13.9371 9.93709 14.4985 9.24937 14.4985C8.56165 14.4985 8.00025 13.9371 8.00025 13.2494ZM14.9757 16.5477C14.1195 17.4038 12.4915 17.4599 12.0143 17.4599C11.5371 17.4599 9.89499 17.3898 9.05288 16.5477C8.92657 16.4213 8.92657 16.2108 9.05288 16.0845C9.1792 15.9582 9.38972 15.9582 9.51604 16.0845C10.0494 16.6178 11.2003 16.8143 12.0283 16.8143C12.8564 16.8143 13.9932 16.6178 14.5406 16.0845C14.6669 15.9582 14.8774 15.9582 15.0038 16.0845C15.102 16.2248 15.102 16.4213 14.9757 16.5477ZM14.7511 14.4985C14.0634 14.4985 13.502 13.9371 13.502 13.2494C13.502 12.5617 14.0634 12.0003 14.7511 12.0003C15.4388 12.0003 16.0002 12.5617 16.0002 13.2494C16.0002 13.9371 15.4388 14.4985 14.7511 14.4985Z" fill="white"/>
              </svg>
            )}  
            </motion.button>
            </div>
            </div>
        </div>
        {/* Embed Section */}
        <div className="share-section-embed">
            <div className="share-embed-label">
            Embed your form anywhere using the following IFrame:
            </div>
            <div className="embed-section">
              <div className="tabs">
              {['html', 'css'].map((tab) => (
                <motion.button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  initial={false}
                  animate={selectedTab === tab ? "selected" : "rest"}
                  whileHover="hover"
                  variants={{
                    rest: { background: 'transparent' , color: '#0B0A0A', fontWeight: 500, borderBottom: '2px solid #E4E7EC' },
                    selected: { background: 'linear-gradient(0deg, rgba(0, 138, 176, 0.12) 0%, rgba(143, 220, 241, 0) 100%)' , color: '#0B0A0A', fontWeight: 700, borderBottom: '2px solid #028AB0' },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15
                  }}
                  className="tab-button"
                >
                  {tab.toUpperCase()}
                </motion.button>
              ))}
            </div>
              <motion.button className="share-copy-embed" onClick={handleCopyEmbed}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
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
            </motion.button>
            </div>
            <AnimatePresence mode="wait">
              <motion.textarea
                key={selectedTab}
                className="share-embed-code"
                rows={4}
                value={selectedTab === 'html' ? embedHtmlCode(publishLink) : embedCssCode}
                readOnly
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              />
            </AnimatePresence>
            </div>
        </div>
        
        </div>
        <AnimatePresence>
        {qrVisible && (
          <motion.div className="formdetails-modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div className="formdetails-modal-box"
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ duration: 0.25 }}
            >
              <div className="formdetails-modal-header">
                <div className="formdetails-modal-title">Share Form via QR</div>
                <motion.button
                  onClick={handleCloseQr}
                  className="formdetails-modal-close"
                  aria-label="Close"
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {/* Close Icon SVG */}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 1.00714L8.99286 0L5 3.99286L1.00714 0L0 1.00714L3.99286 5L0 8.99286L1.00714 10L5 6.00714L8.99286 10L10 8.99286L6.00714 5L10 1.00714Z"
                      fill="#5F6165"
                    />
                  </svg>
                </motion.button>
              </div>

              {/* Divider */}
              <hr className="formdetails-modal-divider"/>

              <div className="form-container qr-modal-content">
                <QRCodeCanvas
                  id="share-qr-canvas"
                  value={publishLink}
                  size={300}
                  includeMargin
                  className="qr-canvas"
                />
              </div>

              {/* Divider */}
              <hr className="formdetails-modal-divider"/>

              <div className="formdetails-modal-actions qr-modal-actions">
                <motion.button onClick={handleCopyQr} className="qr-buttons"
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {copiedQr ? (
                    <>
                      <svg className="copy-svg" xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 20 20" aria-hidden="true">
                        <path fill='white' fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16m3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0z" clipRule="evenodd"/>
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                    <svg className="copy-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.5553 4H4.88867V15.5556" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M8.44434 7.55554H19.111V18.2222C19.111 18.6937 18.9237 19.1459 18.5903 19.4793C18.2569 19.8127 17.8047 20 17.3332 20H10.2221C9.75062 20 9.29843 19.8127 8.96504 19.4793C8.63164 19.1459 8.44434 18.6937 8.44434 18.2222V7.55554Z" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>

                      Copy
                    </>
                  )}
                </motion.button>

                <motion.button onClick={handleDownloadQr} className="qr-buttons"
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <svg className='copy-svg' width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16.004V17C4 17.7956 4.31607 18.5587 4.87868 19.1213C5.44129 19.6839 6.20435 20 7 20H17C17.7956 20 18.5587 19.6839 19.1213 19.1213C19.6839 18.5587 20 17.7956 20 17V16M12 4.5V15.5M12 15.5L15.5 12M12 15.5L8.5 12" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>

                  Download
                </motion.button>
              </div>
            </motion.div>
          
          </motion.div>
        )}
        
        </AnimatePresence>


    </motion.div>
    
  );
};

export default SharePage;