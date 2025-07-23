import { motion } from "framer-motion";

// This component displays the animated countdown timer.
export default function TimerCircle({ total, left }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    // Calculate the target offset for the circle's stroke based on time left
    const offset = circumference * (1 - left / total);

    // Define the color stops for the gradient transition
    const colors = {
        green: "#10b981", // Green for high time
        yellow: "#f59e0b", // Yellow for medium time
        red: "#ef4444"      // Red for low time
    };

    // Determine the current color based on the time remaining
    const strokeColor = left > 5 ? colors.green : left > 3 ? colors.yellow : colors.red;

    return (
        <svg width="100" height="100" viewBox="0 0 100 100" className="mt-6 select-none">
            {/* Background Circle */}
            <circle
                cx="50"
                cy="50"
                r={radius}
                fill="rgba(255, 255, 255, 0.5)"
                stroke="#e5e7eb"
                strokeWidth="8"
            />
            
            {/* Animated Progress Circle */}
            <motion.circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeLinecap="round"
                transform="rotate(-90 50 50)" // Start the circle from the 12 o'clock position
                
                // ▼▼▼ THIS IS THE DEFINITIVE FIX ▼▼▼
                // Animate both the stroke color and the dash offset simultaneously.
                animate={{ 
                    stroke: strokeColor,
                    strokeDashoffset: offset 
                }}
                
                // Define a smooth, custom transition for both properties.
                transition={{
                    // The offset animation should be linear to represent time passing steadily.
                    strokeDashoffset: { duration: 0.5, ease: "linear" },
                    // The color change has a soft "ease-in-out" transition.
                    stroke: { duration: 0.5, ease: "easeInOut" }
                }}
                // ▲▲▲ END OF FIX ▲▲▲
            />
            
            {/* The number text in the center */}
            <text
                x="50%"
                y="50%"
                dy=".3em" // Center the text vertically
                textAnchor="middle"
                className="font-bold text-2xl fill-slate-800"
            >
                {left}
            </text>
        </svg>
    );
}