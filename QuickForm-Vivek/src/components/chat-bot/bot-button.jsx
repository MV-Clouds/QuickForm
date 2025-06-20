import { motion } from 'framer-motion';
import { Bot, MessageSquare } from 'lucide-react';

const BotButton = ({ isOpen, setIsOpen , handleActivity }) => {
  return (
    <motion.button
      whileHover={{
        scale: 1.1,
        rotateZ: [0, -2, 2, 0],
        boxShadow: '0 0 30px rgba(99, 102, 241, 0.6)',
        transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
      }}
      whileTap={{
        scale: 0.9,
        rotate: [0, 5, -5, 0],
        transition: { duration: 0.3, ease: 'easeInOut' },
      }}
      onClick={() => {setIsOpen(!isOpen); handleActivity(); }}
      className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl p-5 shadow-xl hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-all duration-300 flex items-center justify-center overflow-hidden group"
      style={{
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Animated gradient background */}
      <motion.span
        className="absolute inset-0 opacity-80"
        style={{
          background: 'linear-gradient(45deg, #6366f1, #8b5cf6, #ec4899)',
          backgroundSize: '200% 200%',
        }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
      />
      
      {/* Subtle noise texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cmVjdCB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3BhdHRlcm4pIi8+PC9zdmc+')] opacity-30" />
      
      {/* Floating orb particles */}
      {[...Array(5)].map((_, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full bg-white`}
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
          }}
          animate={{
            y: [0, (Math.random() - 0.5) * 20],
            x: [0, (Math.random() - 0.5) * 20],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            repeat: Infinity,
            duration: Math.random() * 3 + 2,
            ease: 'easeInOut',
            delay: Math.random() * 2,
          }}
        />
      ))}
      
      {/* Pulsing glow */}
      <motion.span
        className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0, 0.15, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeOut',
        }}
      />
      
      {/* Main icon with floating animation */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={{
          y: [0, -8, 0],
          transition: {
            repeat: Infinity,
            duration: 4,
            ease: 'easeInOut',
          },
        }}
      >
        <Bot className="h-8 w-8 drop-shadow-lg" />
        <motion.div
          className="absolute -bottom-5"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'easeInOut',
          }}
        >
          <MessageSquare className="h-4 w-4 text-white/70" />
        </motion.div>
      </motion.div>
      
      {/* Status indicator */}
      <motion.div
        className="absolute top-2 right-2 h-3 w-3 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"
        animate={{
          scale: [1, 1.2, 1],
          boxShadow: [
            '0 0 0 0 rgba(74, 222, 128, 0.4)',
            '0 0 0 4px rgba(74, 222, 128, 0)',
            '0 0 0 0 rgba(74, 222, 128, 0)',
          ],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeOut',
        }}
      />
      
      {/* Hover border animation */}
      <motion.span
        className="absolute inset-0 rounded-2xl border-2 border-white/30 pointer-events-none"
        animate={{
          borderWidth: [1, 2, 1],
          borderColor: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.2)'],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut',
        }}
      />
    </motion.button>
  );
};

export default BotButton;