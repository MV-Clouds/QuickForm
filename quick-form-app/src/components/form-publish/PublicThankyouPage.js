import React from "react";
import { motion } from "framer-motion";

// --- Helper: parse Salesforce JSON safely ---
function safeParse(val) {
  try {
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

// --- In-app social icons ---
const socialIconMap = {
  facebook: (
    <svg width="24" height="24" fill="#4267B2" viewBox="0 0 24 24">
      <path d="M22.675,0h-21.35C0.594,0,0,0.594,0,1.326v21.348C0,23.406,0.594,24,1.325,24h11.495V14.708H9.692v-3.62h3.128V8.413c0-3.1,1.893-4.788,4.659-4.788 1.325,0,2.463,0.099,2.797,0.143v3.24l-1.918,0.001c-1.504,0-1.796,0.715-1.796,1.763v2.313h3.587l-0.467,3.62h-3.12V24h6.116C23.406,24,24,23.406,24,22.674V1.326C24,0.594,23.406,0,22.675,0" />
    </svg>
  ),
  instagram: (
    <svg width="24" height="24" fill="#E1306C" viewBox="0 0 24 24">
      <path d="M7.75,2h8.5C19.683,2,22,4.317,22,7.75v8.5C22,19.683,19.683,22,16.25,22h-8.5C4.317,22,2,19.683,2,16.25v-8.5C2,4.317,4.317,2,7.75,2z M12,6.3c-3.145,0-5.7,2.555-5.7,5.7s2.555,5.7,5.7,5.7s5.7-2.555,5.7-5.7S15.145,6.3,12,6.3z M12,9c1.657,0,3,1.343,3,3s-1.343,3-3,3s-3-1.343-3-3S10.343,9,12,9z M18.5,5.8c-0.686,0-1.242,0.556-1.242,1.242s0.556,1.242,1.242,1.242s1.242-0.556,1.242-1.242S19.186,5.8,18.5,5.8z" />
    </svg>
  ),
  linkedin: (
    <svg width="24" height="24" fill="#0A66C2" viewBox="0 0 24 24">
      <path d="M21,21H17.001v-5.499c0-1.263-0.026-2.887-1.76-2.887c-1.761,0-2.031,1.38-2.031,2.803V21H9v-9h3.844v1.229h0.053c0.536-1.015,1.849-2.086,3.807-2.086c4.073,0,4.822,2.683,4.822,6.168V21zM5.337,7c-1.213,0-2.195-0.983-2.195-2.194S4.124,2.612,5.337,2.612c1.212,0,2.194,0.983,2.194,2.194S6.549,7,5.337,7zM7,21H3.667v-9H7V21z" />
    </svg>
  ),
  message: (
    <svg width="24" height="24" fill="#0078D4" viewBox="0 0 24 24">
      <path d="M21,4H3C1.897,4,1,4.897,1,6v12c0,1.103,0.897,2,2,2h18c1.103,0,2-0.897,2-2V6C23,4.897,22.103,4,21,4z M3,6h18l-9,7.897L3,6z M3,20v-9.162l8.445,7.065c0.367,0.307,0.89,0.307,1.259,0L21,10.838V20H3z" />
    </svg>
  ),
};

export default function ThankYouPage({ thankYouData }) {
  // Parse config fields
  const heading = safeParse(thankYouData.Heading__c);
  const subHeading = safeParse(thankYouData.Sub_Heading__c);
  const image = safeParse(thankYouData.Image_Url__c);
  const actions = safeParse(thankYouData.Actions__c);
  const body = safeParse(thankYouData.Body__c);
  const layout = Array.isArray(body.layout)
    ? [...body.layout].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    : [];

  // Social links
  const socialLinks = (body && body.socialLinks) || {};

  // Find element data by type/id quickly
  const getTitleText = () => heading.text || "";
  const getSubtitleText = () => subHeading.text || "";
  const getDescription = () => thankYouData.Description__c || "";
  const getButtonText = () => actions.buttonText || "";
  const getButtonLink = () => "#";
  const getImageObj = () =>
    (image.images &&
      Array.isArray(image.images) &&
      image.images.find((img) => img && img.url)) ||
    null;
  const backgroundColor = body.backgroundColor || "#ffffff";
  const headingcolor = heading.color || "#000000";
  const subHeadingColor = subHeading.color || "#000000";
  const actioncolor = actions.color || "#000000";
  // Layout bounds (for scaling, make the container large as needed or responsive)
  const canvasWidth = Math.max(
    ...layout.map((e) => (e.x || 0) + (e.width || 0)),
    800
  );
  const canvasHeight = Math.max(
    ...layout.map((e) => (e.y || 0) + (e.height || 0)),
    700
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #e3ecef 0%, #ffffff 80%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <motion.div
        style={{
          // This container has the natural "canvas" size from layout
          width: canvasWidth,
          height: canvasHeight,
          minWidth: 320,
          background: "#fff",
          borderRadius: 32,
          boxShadow: "0 12px 32px rgba(60,90,130,0.12)",
          overflow: "hidden",
          position: "relative",
          backgroundColor: backgroundColor,
        }}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "backOut" }}
      >
        {layout.map((elem, idx) => {
          // Calculate placement/style
          const baseStyle = {
            position: "absolute",
            left: elem.x || 0,
            top: elem.y || 0,
            width: elem.width || 360,
            height: elem.height || 40,
            display: "flex",
            alignItems: "center",
            justifyContent: elem.alignment || "center",
            zIndex: elem.zIndex || 1,
          };

          switch (elem.type) {
            case "image": {
              const imgObj = getImageObj();
              return imgObj ? (
                <motion.img
                  key={elem.id + idx}
                  src={imgObj.url}
                  alt={imgObj.name || "Thank You Image"}
                  style={{
                    ...baseStyle,
                    borderRadius: 18,
                    objectFit: "cover",
                    background: "#f5faff",
                  }}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                />
              ) : null;
            }
            case "title":
              return (
                <motion.h1
                  key={elem.id + idx}
                  style={{
                    ...baseStyle,
                    fontSize: "2.2rem",
                    color: "#1D3358",
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: "-0.5px",
                    color : headingcolor,
                  }}
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.23 }}
                >
                  {getTitleText()}
                </motion.h1>
              );
            case "subtitle":
              return (
                <motion.h2
                  key={elem.id + idx}
                  style={{
                    ...baseStyle,
                    fontSize: "1.13rem",
                    color: "#46648A",
                    fontWeight: 400,
                    margin: 0,
                    lineHeight: 1.3,
                    color: subHeadingColor,
                  }}
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.28 }}
                >
                  {getSubtitleText()}
                </motion.h2>
              );
            case "button":
              return (
                getButtonText() && (
                  <motion.a
                    key={elem.id + idx}
                    href={getButtonLink()}
                    style={{
                      ...baseStyle,
                      color: "white",
                      background: actioncolor,
                      borderRadius: 100,
                      fontWeight: 600,
                      padding: "13px 36px",
                      fontSize: "1.04rem",
                      textDecoration: "none",
                      justifyContent: "center",
                      alignItems: "center",
                      boxShadow: "0 2px 12px #1961c722",
                      cursor: "pointer",

                    }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.31 }}
                  >
                    {getButtonText()}
                  </motion.a>
                )
              );
            case "social":
              return (
                <motion.div
                  key={elem.id + idx}
                  style={{
                    ...baseStyle,
                    gap: 20,
                    background: "transparent",
                  }}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.42 }}
                >
                  {Object.entries(socialLinks).map(
                    ([platform, { enabled, url }]) =>
                      enabled && url ? (
                        <a
                          href={url}
                          key={platform}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            opacity: 0.9,
                            transition: "opacity .22s",
                            display: "flex",
                            alignItems: "center",
                            padding : "8px 12px",
                            borderRadius: 100,
                            background: body.color || "#f5faff",
                          }}
                          aria-label={platform}
                        >
                          {socialIconMap[platform] || <span>{platform}</span>}
                        </a>
                      ) : null
                  )}
                </motion.div>
              );
            default:
              return null;
          }
        })}

      </motion.div>
    </div>
  );
}