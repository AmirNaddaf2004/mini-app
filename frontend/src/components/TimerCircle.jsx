import { motion } from "framer-motion";

export default function TimerCircle({ total, left }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    // The target offset value for the circle's stroke
    const offset = circumference * (1 - left / total);

    // The logic to determine the color remains the same
    const strokeColor = left > 5 ? "#10b981" : left > 3 ? "#f59e0b" : "#ef4444";

    return (
        <svg width="100" height="100" viewBox="0 0 100 100" className="mt-6 select-none">
            {/* Background Circle */}
            <circle
                cx="50" cy="50" r={radius}
                fill="rgba(255, 255, 255, 0.5)" stroke="#e5e7eb" strokeWidth="8"
            />
            {/* Progress Circle */}
            <motion.circle
                cx="50" cy="50" r={radius}
                fill="none"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeLinecap="round"
                transform="rotate(-90 50 50)" // Start the circle from the top
                
                // ▼▼▼ THIS IS THE DEFINITIVE FIX ▼▼▼
                // We tell framer-motion to animate BOTH the stroke color AND the offset.
                animate={{ 
                    stroke: strokeColor,
                    strokeDashoffset: offset 
                }}
                
                // We define a smooth, linear transition for the timer's movement.
                transition={{
                    strokeDashoffset: { duration: 0.8, ease: "linear" },
                    stroke: { duration: 0.5, ease: "easeInOut" }
                }}
                // ▲▲▲ END OF FIX ▲▲▲
            />
            {/* Number Text */}
            <text
                x="50%" y="50%"
                dy=".3em" // Center the text vertically
                textAnchor="middle"
                className="font-bold text-2xl fill-slate-800"
            >
                {left}
            </text>
        </svg>
    );
}