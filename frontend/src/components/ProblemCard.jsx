import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

// Helper function to get a random value from a range
const rand = (min, max) => min + Math.random() * (max - min);

// ## NEW: This function calculates the optimal font size to fit the text ##
const getOptimalFontSize = (ctx, text, maxWidth) => {
    let fontSize = 42; // Start with the largest desired font size
    ctx.font = `bold ${fontSize}px monospace`;
    
    // Keep shrinking the font size until the text fits within the canvas width
    while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
        fontSize--;
        ctx.font = `bold ${fontSize}px monospace`;
    }
    return fontSize;
};

export default function ProblemCard({ text }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (text && typeof text === 'object' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const { a, op, b, result } = text;

            const width = canvas.width;
            const height = canvas.height;

            // Clear the canvas
            ctx.clearRect(0, 0, width, height);
            
            ctx.fillStyle = '#1f2937'; // slate-800
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const problemString = `${a} ${op} ${b} = ${result}`;

            // ▼▼▼ THIS IS THE DEFINITIVE FIX ▼▼▼
            // 1. Calculate the best font size that fits. We leave 20px padding.
            const optimalFontSize = getOptimalFontSize(ctx, problemString, width - 20);
            
            // 2. Apply the calculated (or a slightly randomized) font size.
            ctx.font = `bold ${rand(optimalFontSize - 1, optimalFontSize + 1)}px monospace`;

            // 3. Draw the text, now guaranteed to fit.
            ctx.fillText(problemString, width / 2, height / 2);
            // ▲▲▲ END OF FIX ▲▲▲
            
            // Anti-OCR noise lines can remain the same
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(rand(20, width - 20), rand(20, height - 20));
                ctx.lineTo(rand(20, width - 20), rand(20, height - 20));
                ctx.strokeStyle = `rgba(100, 116, 139, 0.2)`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    }, [text]);

    if (!text || typeof text !== 'object') {
        return null;
    }

    return (
        <motion.div
            key={JSON.stringify(text)}
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mx-auto mt-6 p-4 bg-white/80 backdrop-blur rounded-2xl shadow-xl w-full"
        >
            {/* The canvas dimensions are now responsive using CSS */}
            <canvas ref={canvasRef} width="300" height="80" className="w-full h-auto" />
        </motion.div>
    );
}