require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { rewardUser } = require("./ontonApi");
const logger = require("./logger");

const path = require("path");
const mathEngine = require("./math_engine.js");
const validateTelegramData = require("./telegramAuth").default;
const jwt = require("jsonwebtoken");

const { User, Score, Reward, sequelize } = require("./DataBase/models");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const allowedOrigins = [
    "https://momis.studio",
    "https://www.momis.studio",
    "https://web.telegram.org",
];

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", allowedOrigins);
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    credentials: true,
    optionsSuccessStatus: 200,
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

class Player {
    constructor(playerId, jwtPayload) {
        this.id = playerId;
        this.jwtPayload = jwtPayload; // اطلاعات کاربر از توکن JWT
        this.score = 0;
        this.top_score = 0;
        this.time_left = 40;
        this.game_active = false;
        this.current_problem = "";
        this.current_answer = null;
        this.timer = null;
        this.should_stop = false;
        this.last_activity = new Date();

        this.currentEventId = null;

        logger.info(`New player created: ${jwtPayload?.userId}`);
    }
}

class MathGame {
    constructor() {
        this.players = {}; // playerId -> Player
        this.userToPlayerMap = {}; // userId -> playerId
        this.total_time = 40;
        this.cleanup_interval = 600000;
        this.startCleanup();
        logger.info("MathGame initialized");
    }

    startCleanup() {
        setInterval(() => {
            try {
                this.cleanupInactivePlayers();
            } catch (e) {
                logger.error(`Cleanup error: ${e.message}`);
            }
        }, this.cleanup_interval);
    }

    cleanupInactivePlayers() {
        const now = new Date();
        Object.keys(this.players).forEach((pid) => {
            try {
                if (
                    now - this.players[pid].last_activity >
                    this.cleanup_interval
                ) {
                    const player = this.players[pid];

                    // حذف از نگاشت کاربر به بازیکن
                    if (player.jwtPayload?.userId) {
                        delete this.userToPlayerMap[player.jwtPayload.userId];
                    }

                    if (player.timer) {
                        player.should_stop = true;
                        clearTimeout(player.timer);
                    }
                    delete this.players[pid];
                    logger.info(`Cleaned up inactive player: ${pid}`);
                }
            } catch (e) {
                logger.error(`Error cleaning player ${pid}: ${e.message}`);
            }
        });
    }

    // backend/Server.js -> داخل کلاس MathGame
    // backend/Server.js -> inside MathGame class

    // Replace the entire runTimer function with this corrected version
    runTimer(playerId) {
        const player = this.players[playerId];
        if (!player) return;

        player.should_stop = false;

        const tick = () => {
            if (!player || player.should_stop || !player.game_active) {
                return;
            }

            player.time_left -= 1;
            player.last_activity = new Date();

            if (player.time_left <= 0) {
                player.game_active = false;
                logger.info(
                    `Player ${playerId} game over - time expired. Triggering final check...`
                );

                // ▼▼▼ THIS IS THE FIX ▼▼▼
                // We get the userId from the player object's jwtPayload.
                if (player.jwtPayload && player.jwtPayload.userId) {
                    this.checkAnswer(player.jwtPayload.userId, null); // Pass null as the answer
                } else {
                    logger.error(
                        `Could not trigger game over for player ${playerId} because jwtPayload is missing.`
                    );
                }
                // ▲▲▲ END OF FIX ▲▲▲

                return;
            }

            player.timer = setTimeout(tick, 1000);
        };

        player.timer = setTimeout(tick, 1000);
    }


// backend/Server.js -> inside the MathGame class

// Replace your entire startGame function with this definitive, corrected version
async startGame(jwtPayload, eventId = null) {
    try {
        const userId = jwtPayload?.userId;
        if (!userId) {
            throw new Error("User ID is missing in JWT payload");
        }

        // --- Step 1 & 2: Get user and their all-time top score ---
        const [user] = await User.findOrCreate({
            where: { telegramId: userId },
            defaults: {
                firstName: jwtPayload.firstName,
                lastName: jwtPayload.lastName,
                username: jwtPayload.username,
                photo_url: jwtPayload.photo_url,
            },
        });

        const topScoreResult = await Score.findOne({
            where: { userTelegramId: userId },
            attributes: [[sequelize.fn("max", sequelize.col("score")), "top_score"]],
            raw: true,
        });
        const top_score = topScoreResult?.top_score || 0;

        // --- Step 3: Create a new player session for this game ---
        const playerId = userId;
        this.players[playerId] = new Player(playerId, jwtPayload);
        this.userToPlayerMap[userId] = playerId;
        
        const player = this.players[playerId];
        
        // --- Step 4: Initialize the player's game state ---
        player.game_active = true;
        player.time_left = this.total_time;
        player.score = 0;
        player.top_score = top_score; // Set the all-time top score
        player.last_activity = new Date();

        // ▼▼▼ THIS IS THE FINAL, CRITICAL FIX ▼▼▼
        // Explicitly set the eventId for the CURRENT game session on the player object.
        // This ensures that when the game ends, we know which event the score belongs to.
        player.currentEventId = eventId;
        // ▲▲▲ END OF FIX ▲▲▲

        const { problem, is_correct } = mathEngine.generate();
        player.current_problem = problem;
        player.current_answer = is_correct;

        this.runTimer(playerId);
        
        // This single log will now correctly show the event ID after it has been set.
        logger.info(`Game started for user ${userId}. Event ID: ${player.currentEventId || 'Free Play'}`);

        return {
            status: "success",
            player_id: playerId,
            problem: problem,
            time_left: player.time_left,
            score: player.score,
            top_score: player.top_score,
            game_active: true,
            user: user.toJSON(),
        };
    } catch (e) {
        logger.error(`Start game error: ${e.message}`, { stack: e.stack });
        return {
            status: "error",
            message: "Failed to start game",
        };
    }
}
    
    async checkAnswer(userId, userAnswer) {
        try {
            const playerId = this.userToPlayerMap[userId];
            if (!playerId || !this.players[playerId]) {
                return {
                    status: "error",
                    message: "Player not found. Start a new game.",
                };
            }

            const player = this.players[playerId];
            player.last_activity = new Date();

            if (!player.game_active) {
                return {
                    status: "game_over",
                    final_score: player.score,
                    top_score: player.top_score,
                    eventId: player.currentEventId, // <-- Add this line
                };
            }

            const is_correct = userAnswer === player.current_answer;

            if (is_correct) {
                // منطق اصلی شما: جایزه زمانی برای پاسخ صحیح
                player.time_left = Math.min(40, player.time_left + 5);
                player.score += 1;
            } else {
                // منطق اصلی شما: جریمه زمانی برای پاسخ غلط
                player.time_left = Math.max(0, player.time_left - 10);
            }

            // فقط زمانی که زمان تمام شود، بازی به پایان می‌رسد
            if (player.time_left <= 0) {
                player.game_active = false;

                // حالا که بازی تمام شده، امتیاز نهایی را در دیتابیس ثبت می‌کنیم
                if (player.score > 0) {
                    // ثبت امتیاز به همراه شناسه رویداد فعلی
                    await Score.create({
                        score: player.score,
                        userTelegramId: userId,
                        eventId: player.currentEventId, // This can be a UUID or null
                    });
                    logger.info(
                        `Saved final score ${
                            player.score
                        } for user ${userId} in event ${
                            player.currentEventId || "Free Play"
                        }`
                    );
                }

                // بالاترین امتیاز را برای ارسال به فرانت‌اند آپدیت می‌کنیم
                player.top_score = Math.max(player.top_score, player.score);

                return {
                    status: "game_over",
                    final_score: player.score,
                    top_score: player.top_score,
                };
            }

            // اگر بازی ادامه دارد، یک سوال جدید تولید کن
            const { problem, is_correct: answer } = mathEngine.generate();
            player.current_problem = problem;
            player.current_answer = answer;

            return {
                status: "continue",
                problem: problem,
                time_left: player.time_left,
                score: player.score,
                feedback: is_correct ? "correct" : "wrong",
                game_active: true,
            };
        } catch (e) {
            logger.error(`Check answer error: ${e.message}`);
            return { status: "error", message: e.message };
        }
    }
}

const gameInstance = new MathGame();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Authentication token required" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            logger.error(`JWT verification failed: ${err.message}`);
            return res.status(403).json({ error: "Invalid or expired token" });
        }

        req.user = decoded; // ذخیره اطلاعات کاربر در درخواست
        next();
    });
};

app.use(express.static(path.join(__dirname, "../frontend/build")));

// API Routes
app.post("/api/telegram-auth", (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) {
            logger.error("[Telegram Auth] No initData provided");
            return res.status(400).json({
                valid: false,
                message: "initData is required",
            });
        }

        const userData = validateTelegramData(initData, process.env.BOT_TOKEN);

        const token = jwt.sign(
            {
                userId: userData.id,
                firstName: userData.first_name,
                lastName: userData.last_name,
                username: userData.username,
                photo_url: userData.photo_url,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" } // انقضا توکن
        );

        logger.info(
            `Telegram authentication successful for user: ${userData.id}`
        );

        return res.json({
            valid: true,
            user: {
                id: userData.id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                username: userData.username,
                language_code: userData.language_code,
                allows_write_to_pm: userData.allows_write_to_pm,
                photo_url: userData.photo_url,
            },
            token: token,
        });
    } catch (error) {
        logger.error("Telegram auth error:", {
            error: error.message,
            stack: error.stack,
        });

        return res.status(401).json({
            valid: false,
            message: "Authentication failed",
        });
    }
});

app.post("/api/start", authenticateToken, async (req, res) => {
    try {
        const user = req.user; // اطلاعات کاربر از توکن

        const { eventId } = req.body; // eventId can be a string or null/undefined

        logger.info(`Start game request for user: ${user.userId}`, { eventId });

        const result = await gameInstance.startGame({
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            photo_url: user.photo_url,
        });

        res.json(result);
    } catch (e) {
        logger.error(`API start error: ${e.message}`, {
            stack: e.stack,
        });

        res.status(500).json({
            status: "error",
            message: "Internal server error",
            ...(process.env.NODE_ENV === "development" && {
                details: e.message,
            }),
        });
    }
});

app.post("/api/answer", authenticateToken, async (req, res) => {
    try {
        const { answer } = req.body;
        const user = req.user; // اطلاعات کاربر از توکن

        if (answer === undefined) {
            return res.status(400).json({
                status: "error",
                message: "Answer is required",
            });
        }

        const result = await gameInstance.checkAnswer(user.userId, answer);

        res.json(result);
    } catch (e) {
        logger.error(`API answer error: ${e.message}`, {
            stack: e.stack,
        });

        res.status(500).json({
            status: "error",
            message: "Internal server error",
            ...(process.env.NODE_ENV === "development" && {
                details: e.message,
            }),
        });
    }
});

app.get("/api/leaderboard", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // ▼▼▼ این تنها بخش اضافه شده به کد شماست ▼▼▼
        const { eventId } = req.query; // دریافت شناسه رویداد از فرانت‌اند

        // ساخت شرط فیلتر به صورت داینامیک
        const whereCondition = {};
        if (eventId && eventId !== "null" && eventId !== "undefined") {
            // اگر شناسه رویداد وجود داشت، بر اساس آن فیلتر کن
            whereCondition.eventId = eventId;
        } else {
            // در غیر این صورت، فقط نتایج بازی آزاد را نشان بده (جایی که eventId برابر با NULL است)
            whereCondition.eventId = null;
        }
        logger.info(`Fetching leaderboard with condition:`, whereCondition);
        // ▲▲▲ پایان بخش اضافه شده ▲▲▲

        // مرحله ۱: بالاترین امتیاز را برای هر کاربر با توجه به شرط جدید پیدا کن
        const topScores = await Score.findAll({
            where: whereCondition, // <--- اعمال فیلتر در اینجا
            attributes: [
                "userTelegramId",
                [sequelize.fn("MAX", sequelize.col("score")), "max_score"],
            ],
            group: ["userTelegramId"],
            order: [[sequelize.fn("MAX", sequelize.col("score")), "DESC"]],
            limit: limit,
            offset: offset,
            raw: true,
        });

        if (topScores.length === 0) {
            return res.json({
                status: "success",
                leaderboard: [],
                meta: { total: 0, limit, offset, has_more: false },
            });
        }

        // مرحله ۲ و ۳ بدون تغییر باقی می‌مانند
        const userIds = topScores.map((s) => s.userTelegramId);
        const users = await User.findAll({
            where: { telegramId: userIds },
            raw: true,
        });

        const userMap = users.reduce((map, user) => {
            map[user.telegramId] = user;
            return map;
        }, {});

        const leaderboard = topScores.map((scoreEntry) => {
            const user = userMap[scoreEntry.userTelegramId];
            return {
                // با اضافه کردن ? جلوی user از بروز خطا در صورت نبودن کاربر جلوگیری می‌کنیم
                telegramId: user?.telegramId,
                username: user?.username,
                firstName: user?.firstName,
                photo_url: user?.photo_url,
                score: scoreEntry.max_score,
            };
        });

        // شمارش کل بازیکنان با توجه به شرط جدید
        const totalCount = await Score.count({
            where: whereCondition, // <--- اعمال فیلتر در اینجا
            distinct: true,
            col: "userTelegramId",
        });

        res.json({
            status: "success",
            leaderboard,
            meta: {
                total: totalCount,
                limit,
                offset,
                has_more: offset + limit < totalCount,
            },
        });
    } catch (e) {
        logger.error(`Leaderboard error: ${e.message}`, { stack: e.stack });
        res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
});

app.get("/api/events", (req, res) => {
    // In a real-world scenario, you would fetch these from a database.
    // For now, we use the values from the .env file as the active event.
    const activeEvents = [];

    if (process.env.ONTON_EVENT_UUID) {
        activeEvents.push({
            id: process.env.ONTON_EVENT_UUID,
            name: "Main Tournament", // You can make this name dynamic later
            description: "Compete for the grand prize in the main event!",
        });
    }
    // You can add more hardcoded events for testing
    // activeEvents.push({ id: 'some-other-uuid', name: 'Weekend Challenge' });

    res.json({
        status: "success",
        events: activeEvents,
    });
});
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
});
