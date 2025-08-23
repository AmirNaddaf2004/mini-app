const { createCanvas } = require('canvas');

// Helper function to get a random value from a range
const rand = (min, max) => min + Math.random() * (max - min);

// This function calculates the optimal font size to fit the text
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

// Main function to generate the problem card image
function createProblemImage(problem) {
    const { a, op, b, result } = problem;
    const width = 300;
    const height = 80;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background color (can be transparent or styled)
    // For this example, let's keep it transparent to match the frontend card style.
    
    ctx.fillStyle = '#1f2937'; // slate-800
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const problemString = `${a} ${op.replace('*', '×').replace('/', '÷')} ${b} = ${result}`;

    // 1. Calculate the best font size that fits. We leave 20px padding.
    const optimalFontSize = getOptimalFontSize(ctx, problemString, width - 20);

    // 2. Apply the calculated (or a slightly randomized) font size.
    ctx.font = `bold ${rand(optimalFontSize - 1, optimalFontSize + 1)}px monospace`;

    // 3. Draw the text, now guaranteed to fit.
    ctx.fillText(problemString, width / 2, height / 2);

    // Anti-OCR noise lines
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(rand(20, width - 20), rand(20, height - 20));
        ctx.lineTo(rand(20, width - 20), rand(20, height - 20));
        ctx.strokeStyle = `rgba(100, 116, 139, 0.2)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Return the image as a Data URL (base64 encoded PNG)
    return canvas.toDataURL();
}

module.exports = { createProblemImage };