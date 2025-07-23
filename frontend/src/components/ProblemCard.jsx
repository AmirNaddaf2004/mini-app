// frontend/src/components/ProblemCard.jsx
import { motion } from "framer-motion";

export default function ProblemCard({ text }) {
  if (!text || typeof text !== 'object') {
    return null; // Return null to avoid rendering anything if text is invalid
  }

  const { a, op, b, result } = text;

  return (
    // We add a key to the motion.div to force a re-render on each new problem
    <motion.div
      key={a + op + b + result} // This is the key to the animation
      initial={{ y: -20, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="mx-auto mt-6 p-6 bg-white/80 backdrop-blur rounded-2xl shadow-xl text-4xl font-bold text-center text-slate-800"
    >
      <div className="flex justify-center items-center gap-x-3 sm:gap-x-4 font-mono" dir="ltr">
        <span>{a}</span>
        <span className="text-gray-500">{op}</span>
        <span>{b}</span>
        <span className="text-gray-500">=</span>
        <span>{result}</span>
      </div>
    </motion.div>
  );
}