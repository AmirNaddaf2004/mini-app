// backend/math_engine.js

// --- Helper Functions ---
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randChoice = (arr) => arr[randInt(0, arr.length - 1)];

// --- Problem Generators ---
// Each function is responsible for creating a specific type of math problem.
const problemGenerators = {
    // Basic addition with faster scaling
    addition: (score) => {
        const a = randInt(score + 5, score * 2 + 20);
        const b = randInt(score + 5, score * 2 + 20);
        return { a, op: "+", b, result: a + b };
    },
    // Basic subtraction, always positive result
    subtraction: (score) => {
        let a = randInt(score + 10, score * 2 + 30);
        let b = randInt(score + 10, score * 2 + 30);
        if (a < b) [a, b] = [b, a]; // Swap to ensure a > b
        return { a, op: "-", b, result: a - b };
    },
    // Multiplication with slightly faster scaling
    multiplication: (score) => {
        const maxOperand = 5 + Math.floor(score / 4);
        // حداقل عدد ضرب با امتیاز افزایش پیدا می‌کند
        const minOperand = 2 + Math.floor(score / 10);
        const a = randInt(minOperand, maxOperand);
        const b = randInt(minOperand, Math.min(maxOperand, 15));
        return { a, op: "×", b, result: a * b };
    },
    // Division, always results in a whole number
    division: (score) => {
        const maxDivisor = 4 + Math.floor(score / 6);
        // حداقل مقسوم علیه و خارج قسمت با امتیاز افزایش پیدا می‌کند
        const minDivisor = 2 + Math.floor(score / 15);
        const result = randInt(minDivisor, maxDivisor);
        const b = randInt(minDivisor, maxDivisor);
        const a = b * result;
        return { a, op: "÷", b, result };
    },

    // ▼▼▼ 3. بهبود توان ▼▼▼
    power: (score) => {
        const maxBase = score > 50 ? 12 : 8;
        // در امتیازهای بالا، پایه توان از ۳ شروع می‌شود
        const minBase = score > 40 ? 3 : 2;
        const base = randInt(minBase, maxBase);
        const exponent = randChoice([2, 3]);
        return {
            a: base,
            op: "^",
            b: exponent,
            result: Math.pow(base, exponent),
        };
    },
    // Square root, always a perfect square
    squareRoot: (score) => {
        const maxRoot = 4 + Math.floor(score / 5);
        // حداقل ریشه با امتیاز افزایش پیدا می‌کند
        const minRoot = 2 + Math.floor(score / 8);
        const result = randInt(minRoot, maxRoot);
        const a = result * result;
        return { a, op: "√", b: null, result };
    },
    // Anti-AI/Human verification check
    // Anti-AI/Human verification check (Comparison)
    humanCheck: () => {
        const a = randInt(10, 99);
        const b = randInt(10, 99);
        const isGreaterThan = a > b;
        return { a, op: ">", b, result: isGreaterThan, isHumanCheck: true };
    },

    // ▼▼▼ بخش جدید ▼▼▼
    // Anti-AI/Human verification check (Text CAPTCHA)
    textCaptcha: () => {
        const questions = [
            // --- دسته ۱: مقایسه‌های منطقی ---
            { text: "Is 100 smaller than 10?", correctAnswer: false },
            { text: "Is 58 greater than 85?", correctAnswer: false },
            { text: "Is -10 a positive number?", correctAnswer: false },
            { text: "Is 99 equal to 99?", correctAnswer: true },
            { text: "Is 0.5 less than 1?", correctAnswer: true },

            // --- دسته ۲: مفاهیم زوج، فرد و اول ---
            { text: "Is 7 an odd number?", correctAnswer: true },
            { text: "Is 12 an even number?", correctAnswer: true },
            { text: "Is the result of 3+5 odd?", correctAnswer: false }, // Tests two steps
            { text: "Is 15 a prime number?", correctAnswer: false },

            // --- دسته ۳: مفاهیم پایه‌ای ریاضی ---
            { text: "Does a square have 4 equal sides?", correctAnswer: true },
            { text: "Is Pi (π) exactly 3?", correctAnswer: false },
            { text: "Does a triangle have 3 angles?", correctAnswer: true },

            // --- دسته ۴: شمارش و تشخیص ارقام (چالش برای OCR) ---
            {
                text: "Are there two 7s in the number 717?",
                correctAnswer: true,
            },
            {
                text: "Does the number 1000 have three zeros?",
                correctAnswer: true,
            },

            // --- دسته ۵: سوالات دنباله و الگو ---
            {
                text: "Sequence: 2, 4, 6. Is the next number 8?",
                correctAnswer: true,
            },
            {
                text: "Sequence: 10, 20, 30. Is the next number 35?",
                correctAnswer: false,
            },
            {
                text: "Pattern: 5, 10, 15, 20. Is the next number 25?",
                correctAnswer: true,
            },
            {
                text: "Pattern: 9, 6, 3. Is the next number 0?",
                correctAnswer: true,
            },
        ];
        const selected = randChoice(questions);
        return {
            text: selected.text,
            isTextCaptcha: true, // فلگ بسیار مهم برای شناسایی این نوع سوال
            result: selected.correctAnswer, // پاسخ صحیح (true/false)
        };
    },
};

// --- Difficulty Tiers & Weights ---
// Defines which problems are available at what score and how likely they are to appear.
const getAvailableProblems = (score) => {
    const tiers = [
        { type: "addition", weight: 5 },
        { type: "subtraction", weight: 5 },
    ];

    if (score >= 5) tiers.push({ type: "multiplication", weight: 6 });
    if (score >= 15) tiers.push({ type: "division", weight: 6 });
    if (score >= 25) tiers.push({ type: "power", weight: 4 });
    if (score >= 35) tiers.push({ type: "squareRoot", weight: 4 });

    // Make basic problems less likely as score increases
    if (score > 20) {
        tiers.find((t) => t.type === "addition").weight = 2;
        tiers.find((t) => t.type === "subtraction").weight = 2;
    }

    return tiers;
};

// --- Main Generate Function ---
// --- Main Generate Function ---
function generate(score = 0) {
    let generatorType;
    let problemData;

    // --- Step 1: Decide which type of problem to generate ---
    // ~10% chance for an anti-bot check after score 15
    if (score >= 15 && Math.random() < 0.1) {
        // Randomly choose between the two types of anti-bot checks
        generatorType = randChoice(["humanCheck", "textCaptcha"]);
    } else {
        // Otherwise, choose a math problem based on score and weights
        const availableProblems = getAvailableProblems(score);
        const totalWeight = availableProblems.reduce(
            (sum, p) => sum + p.weight,
            0
        );
        let randomWeight = Math.random() * totalWeight;

        for (const problem of availableProblems) {
            randomWeight -= problem.weight;
            if (randomWeight <= 0) {
                generatorType = problem.type;
                break;
            }
        }
    }

    // --- Step 2: Generate the core problem data ---
    problemData = problemGenerators[generatorType](score);

    // --- Step 3: Format the final output ---
    // If it's any kind of anti-bot check, the logic is simple:
    // The "problem" is the data itself, and "is_correct" is the expected answer.
    if (problemData.isHumanCheck || problemData.isTextCaptcha) {
        return {
            problem: problemData, // Send the full object: { a, op, b, result, isHumanCheck: true } or { text, isTextCaptcha: true, result: ... }
            is_correct: problemData.result, // The correct answer (True/False) is the result calculated by the generator
        };
    }

    // If it's a regular math problem, apply the True/False logic
    const is_correct = Math.random() > 0.4; // 60% chance of being correct
    let final_result;

    if (is_correct) {
        final_result = problemData.result;
    } else {
        // Generate a "close" but wrong answer
        const errorMargin = Math.floor(problemData.result / 10) + randInt(1, 5);
        const delta = randInt(1, Math.max(2, errorMargin));
        final_result =
            problemData.result + (Math.random() < 0.5 ? -delta : delta);

        // Ensure the false result is never negative or the same as the correct one
        if (final_result <= 0) final_result = problemData.result + 1;
        if (final_result === problemData.result) final_result += 1; // 'result' is not defined here, should be problemData.result
    }

    // Return the final math problem object
    const problem_parts = {
        a: problemData.a,
        op: problemData.op,
        b: problemData.b,
        result: final_result,
    };
    return { problem: problem_parts, is_correct };
}
module.exports = { generate };
