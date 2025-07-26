import { motion } from 'framer-motion';

const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 18.29V3C1 2.46957 1.21071 1.96086 1.58579 1.58579C1.96086 1.21071 2.46957 1 3 1H17C17.5304 1 18.0391 1.21071 18.4142 1.58579C18.7893 1.96086 19 2.46957 19 3V13C19 13.5304 18.7893 14.0391 18.4142 14.4142C18.0391 14.7893 17.5304 15 17 15H5.961C5.66123 15 5.36531 15.0675 5.09511 15.1973C4.82491 15.3271 4.58735 15.516 4.4 15.75L2.069 18.664C1.99143 18.7612 1.88556 18.8319 1.76604 18.8664C1.64652 18.9008 1.51926 18.8972 1.40186 18.8561C1.28446 18.815 1.18273 18.7385 1.11073 18.6371C1.03874 18.5357 1.00005 18.4144 1 18.29Z" stroke="white" strokeWidth="1.5"/>
  </svg>
);

const BotButton = ({ isOpen, setIsOpen, handleActivity }) => {
  return (
    <motion.button
      whileHover={{
        scale: 1.08,
        boxShadow: '0 0 20px #8FDCF1',
        transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] },
      }}
      whileTap={{
        scale: 0.95,
        transition: { duration: 0.2, ease: 'easeInOut' },
      }}
      onClick={() => { setIsOpen(!isOpen); handleActivity && handleActivity(); }}
      className="relative flex items-center justify-center p-4 rounded-full shadow-lg border-none outline-none focus:outline-none"
      style={{
        background: 'linear-gradient(135deg, #008AB0 0%, #8FDCF1 100%)',
        width: 56,
        height: 56,
        cursor: 'pointer',
      }}
    >
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="flex items-center justify-center"
        style={{ width: 36, height: 36 }}
      >
        <MessageIcon />
      </motion.div>
    </motion.button>
  );
};

export default BotButton;