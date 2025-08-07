import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

// Helper function to get a random value from a range
const rand = (min, max) => min + Math.random() * (max - min);

export default function ProblemCard({ text }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        // This effect runs whenever the `text` (the problem) changes.
        if (text && typeof text === 'object' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const { a, op, b, result } = text;

            // Get canvas dimensions
            const width = canvas.width;
            const height = canvas.height;

            // Clear the canvas from the previous drawing
            ctx.clearRect(0, 0, width, height);
            
            // --- Anti-OCR (Optical Character Recognition) Techniques ---

            // 1. Set a base font and color
            ctx.fillStyle = '#1f2937'; // slate-800
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 2. Randomize font size slightly for each render
            const baseFontSize = 38;
            ctx.font = `bold ${rand(baseFontSize - 2, baseFontSize + 2)}px monospace`;

            // 3. Assemble the full string and draw it with slight random offset
            const problemString = `${a} ${op} ${b} = ${result}`;
            ctx.fillText(problemString, width / 2 + rand(-3, 3), height / 2 + rand(-3, 3));
            
            // 4. Add some random "noise" lines to make OCR harder
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(rand(20, width - 20), rand(20, height - 20));
                ctx.lineTo(rand(20, width - 20), rand(20, height - 20));
                ctx.strokeStyle = `rgba(100, 116, 139, 0.2)`; // slate-500 with opacity
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    }, [text]); // Dependency array: redraw when `text` changes

    if (!text || typeof text !== 'object') {
        return null;
    }

    return (
        <motion.div
            key={JSON.stringify(text)} // Force re-render animation on new problem
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mx-auto mt-6 p-4 bg-white/80 backdrop-blur rounded-2xl shadow-xl"
        >
            {/* The canvas element where the problem will be drawn */}
            <canvas ref={canvasRef} width="280" height="70" />
        </motion.div>
    );
}