import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AnimatedTooltip.css';

export default function AnimatedTooltip({ children, content, positionLeft = false }) {
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });


   useEffect(() => {
    if (hovered && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();

      // If tooltipRef exists and tooltip is rendered, measure width
      let width;
      if (tooltipRef.current) {
        width = tooltipRef.current.offsetWidth;
      }

      // Calculate vertical center as before
      const top = rect.top + rect.height / 2 + window.scrollY;
      // For horizontal position, we adjust according to dynamic tooltipWidth
      let left;
      if (positionLeft) {
        left = rect.left + window.scrollX - width; // 8px margin
      } else {
        left = rect.right + window.scrollX; // 8px margin
      }
      setTooltipPos({ top, left });
    }
  }, [hovered, positionLeft]);

  return (
    <div
      ref={wrapperRef}
      style={{ display: 'inline-block', position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={0}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-describedby="tooltip"
    >
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.div
            ref={tooltipRef}
            role="tooltip"
            id="tooltip"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`animated-tooltip-overlay${positionLeft ? ' left-side' : ''}`}
            style={{
              position: 'absolute',
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: positionLeft ? 'translateY(-50%) translateX(-8px)' : 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            {content.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
