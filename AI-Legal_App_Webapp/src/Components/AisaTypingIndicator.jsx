import React from 'react';
import { motion } from 'framer-motion';

const AisaTypingIndicator = ({ visible = true, message = "Thinking..." }) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 py-1 select-none"
    >
      <span className="text-[12px] text-slate-500 dark:text-zinc-400 font-semibold leading-none">
        {message}
      </span>
      <div className="flex gap-1 ml-1.5 items-center">
        <span className="w-1.5 h-1.5 bg-[#6D5DFC] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-[#6D5DFC] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-[#6D5DFC] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </motion.div>
  );
};

export default AisaTypingIndicator;
