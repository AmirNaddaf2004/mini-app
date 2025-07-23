// frontend/src/components/AnswerButtons.jsx
import { motion } from "framer-motion";

export default function AnswerButtons({ onAnswer, disabled }) {
  const baseClasses = "w-32 h-14 rounded-2xl text-xl font-semibold shadow-lg text-white";
  const disabledClasses = "disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex gap-8 mt-8 justify-center">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={`${baseClasses} bg-green-500 hover:bg-green-600 ${disabledClasses}`}
        onClick={() => onAnswer(true)}
        disabled={disabled}
      >
        True
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={`${baseClasses} bg-red-500 hover:bg-red-600 ${disabledClasses}`}
        onClick={() => onAnswer(false)}
        disabled={disabled}
      >
        False
      </motion.button>
    </div>
  );
}