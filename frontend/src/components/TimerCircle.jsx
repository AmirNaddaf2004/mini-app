// frontend/src/components/TimerCircle.jsx
import { motion } from "framer-motion";

export default function TimerCircle({ total, left }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - left / total);

    // Determine color based on time left
    const strokeColor = left > 5 ? "#10b981" : left > 2 ? "#f59e0b" : "#ef4444";

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
                stroke={strokeColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)" // Start from the top
                style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.5s ease" }}
            />
            {/* Number Text */}
            <text
                x="50%" y="50%"
                dy=".3em" // Center text vertically
                textAnchor="middle"
                className="font-bold text-2xl fill-slate-800"
            >
                {left}
            </text>
        </svg>
    );
}