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
// Main function to generate the problem card image
function createProblemImage(problem) {
    const { a, op, b, result } = problem;
    const width = 300;
    const height = 80;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background color (can be transparent or styled)
    // For this example, let's keep it transparent to match the frontend card style.

    ctx.fillStyle = "#1f2937"; // slate-800
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let problemString;

    // ▼▼▼ منطق شرطی برای تشخیص نوع سوال ▼▼▼
    if (problem.isTextCaptcha) {
        // --- Render Text CAPTCHA ---
        problemString = problem.text;
        const optimalFontSize = getOptimalFontSizeForText(
            ctx,
            problemString,
            width - 20
        );
        ctx.font = `bold ${optimalFontSize}px "DejaVu Sans"`;
        ctx.fillText(problemString, width / 2, height / 2);
    } else {
        // --- Render Math Problem (including humanCheck comparison) ---
        let { a, op, b, result } = problem;

        // Handle different problem formats
        if (op === "√") {
            problemString = `${op}${a} = ${result}`;
        } else if (problem.isHumanCheck) {
            problemString = `${a} ${op} ${b}`; // For 95 > 42, we don't show "= true"
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

    // Return the image as a Data URL (base64 encoded PNG)
    return canvas.toDataURL();
}

module.exports = { createProblemImage };
