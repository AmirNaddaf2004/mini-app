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
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#1f2937";
    ctx.textBaseline = "middle";

    if (problem.isTextCaptcha) {
        ctx.textAlign = "center";
        const problemString = problem.text;
        const optimalFontSize = getOptimalFontSizeForText(
            ctx,
            problemString,
            width - 20
        );
        ctx.font = `bold ${optimalFontSize}px "DejaVu Sans"`;
        ctx.fillText(problemString, width / 2, height / 2);
    } else {
        const { a, op, b, result } = problem;
        if (op === "^") {
            ctx.textAlign = "left";
            const baseText = String(a);
            const exponentText = String(b);
            const resultText = ` = ${result}`;
            const baseFontSize = getOptimalFontSizeForMath(
                ctx,
                `${a}^${b} = ${result}`,
                width - 20
            );
            const exponentFontSize = Math.floor(baseFontSize * 0.6);
            ctx.font = `bold ${baseFontSize}px "DejaVu Sans Mono"`;
            const baseWidth = ctx.measureText(baseText).width;
            const resultWidth = ctx.measureText(resultText).width;
            ctx.font = `bold ${exponentFontSize}px "DejaVu Sans Mono"`;
            const exponentWidth = ctx.measureText(exponentText).width;
            const totalWidth = baseWidth + exponentWidth + resultWidth;
            let currentX = (width - totalWidth) / 2;
            const y = height / 2;
            ctx.font = `bold ${baseFontSize}px "DejaVu Sans Mono"`;
            ctx.fillText(baseText, currentX, y);
            currentX += baseWidth;
            ctx.font = `bold ${exponentFontSize}px "DejaVu Sans Mono"`;
            ctx.fillText(exponentText, currentX, y - baseFontSize * 0.4);
            currentX += exponentWidth;
            ctx.font = `bold ${baseFontSize}px "DejaVu Sans Mono"`;
            ctx.fillText(resultText, currentX, y);
        } else {
            ctx.textAlign = "center";
            let problemString;
            if (op === "√") {
                problemString = `${op}${a} = ${result}`;
            } else if (problem.isHumanCheck) {
                problemString = `${a} ${op} ${b}`;
            } else {
                const displayOp = op.replace("*", "×").replace("/", "÷");
                problemString = `${a} ${displayOp} ${b} = ${result}`;
            }
            const optimalFontSize = getOptimalFontSizeForMath(
                ctx,
                problemString,
                width - 20
            );
            ctx.font = `bold ${rand(
                optimalFontSize - 1,
                optimalFontSize + 1
            )}px "DejaVu Sans Mono"`;
            ctx.fillText(problemString, width / 2, height / 2);
        }
    }

    // Anti-OCR noise lines
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(rand(20, width - 20), rand(20, height - 20));
        ctx.lineTo(rand(20, width - 20), rand(20, height - 20));
        ctx.strokeStyle = `rgba(100, 116, 139, 0.2)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    return canvas.toDataURL();
} // <-- آکولاد تابع اینجا بسته می‌شود

// ✨ خط زیر به اینجا منتقل شد ✨
module.exports = { createProblemImage };
