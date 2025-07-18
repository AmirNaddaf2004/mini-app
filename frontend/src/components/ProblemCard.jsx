// frontend/src/components/ProblemCard.jsx

import { motion } from "framer-motion";

/**
 * کارت نمایش سؤال ریاضی
 * @param {{ text: string }} props
 */
export default function ProblemCard({ text }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mx-auto mt-6 p-6 bg-white/80 backdrop-blur rounded-2xl shadow-xl text-4xl font-bold text-center text-slate-800"

      // ▼▼▼ THIS IS THE DEFINITIVE FIX ▼▼▼
      // We apply inline styles to forcefully set the text direction.
      // `direction: 'ltr'` tells the browser the base direction is Left-to-Right.
      // `unicodeBidi: 'bidi-override'` is a powerful rule that forces this direction
      // onto all characters within the element, overriding any default behavior.
      style={{
        direction: 'rtl',
        unicodeBidi: 'bidi-override'
      }}
      // ▲▲▲ END OF FIX ▲▲▲
    >
      {text}
    </motion.div>
  );
}