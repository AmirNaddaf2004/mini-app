const { createCanvas } = require("canvas");

// Helper function to get a random value from a range
const rand = (min, max) => min + Math.random() * (max - min);

const getOptimalFontSizeForText = (ctx, text, maxWidth) => {
    let fontSize = 28; // Start with a suitable font size for text
    ctx.font = `bold ${fontSize}px "DejaVu Sans"`; // Use a more readable font

    while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
        fontSize--;
        ctx.font = `bold ${fontSize}px "DejaVu Sans"`;
    }
    return fontSize;
};

// تابع قبلی برای فرمول‌های ریاضی
const getOptimalFontSizeForMath = (ctx, text, maxWidth) => {
    let fontSize = 42;
    ctx.font = `bold ${fontSize}px "DejaVu Sans Mono"`;

    while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
        fontSize--;
        ctx.font = `bold ${fontSize}px "DejaVu Sans Mono"`;
    }
    return fontSize;
};
function createProblemImage(problem) {
    const width = 300;
    const height = 80;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1f2937';
    ctx.textBaseline = 'middle'; // Align text vertically to the middle

    // --- 1. Handle Text CAPTCHA ---
    if (problem.isTextCaptcha) {
        ctx.textAlign = 'center';
        const problemString = problem.text;
        const optimalFontSize = getOptimalFontSizeForText(ctx, problemString, width - 20);
        ctx.font = `bold ${optimalFontSize}px "DejaVu Sans"`;
        ctx.fillText(problemString, width / 2, height / 2);

    } else {
        // --- 2. Handle ALL Math Problems ---
        const { a, op, b, result } = problem;

        // ▼▼▼ منطق جدید و اختصاصی برای نمایش توان ▼▼▼
        if (op === '^') {
            ctx.textAlign = 'left'; // Align left for manual positioning
            
            // Define the parts of the expression
            const baseText = String(a);
            const exponentText = String(b);
            const resultText = ` = ${result}`;

            // Calculate the ideal font size based on the full string
            const baseFontSize = getOptimalFontSizeForMath(ctx, `${a}^${b} = ${result}`, width - 20);
            const exponentFontSize = Math.floor(baseFontSize * 0.6); // Make exponent font smaller

            // Measure the width of each part with its specific font
            ctx.font = `bold ${baseFontSize}px "DejaVu Sans Mono"`;
            const baseWidth = ctx.measureText(baseText).width;
            const resultWidth = ctx.measureText(resultText).width;
            
            ctx.font = `bold ${exponentFontSize}px "DejaVu Sans Mono"`;
            const exponentWidth = ctx.measureText(exponentText).width;
            
            // Calculate starting position to center the whole expression
            const totalWidth = baseWidth + exponentWidth + resultWidth;
            let currentX = (width - totalWidth) / 2;
            const y = height / 2;

            // Draw the parts one by one
            ctx.font = `bold ${baseFontSize}px "DejaVu Sans Mono"`;
            ctx.fillText(baseText, currentX, y);
            currentX += baseWidth;

            ctx.font = `bold ${exponentFontSize}px "DejaVu Sans Mono"`;
            ctx.fillText(exponentText, currentX, y - (baseFontSize * 0.4)); // Move exponent up
            currentX += exponentWidth;

            ctx.font = `bold ${baseFontSize}px "DejaVu Sans Mono"`;
            ctx.fillText(resultText, currentX, y);

        } else {
            // --- Standard rendering for all other math problems ---
            ctx.textAlign = 'center';
            let problemString;
            
            if (op === '√') {
                problemString = `${op}${a} = ${result}`;
            } else if (problem.isHumanCheck) {
                problemString = `${a} ${op} ${b}`;
            } else {
                const displayOp = op.replace('*', '×').replace('/', '÷');
                problemString = `${a} ${displayOp} ${b} = ${result}`;
            }
            
            const optimalFontSize = getOptimalFontSizeForMath(ctx, problemString, width - 20);
            ctx.font = `bold ${rand(optimalFontSize - 1, optimalFontSize + 1)}px "DejaVu Sans Mono"`;
            ctx.fillText(problemString, width / 2, height / 2);
        }

module.exports = { createProblemImage };
