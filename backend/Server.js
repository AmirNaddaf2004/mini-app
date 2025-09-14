require("dotenv").config();
const { isUserMember } = require("./bot");
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { rewardUser } = require("./ontonApi");
const logger = require("./logger");
const { createProblemImage } = require("./imageGenerator"); // فرض بر این است که فایل در همان پوشه است

const path = require("path");
const mathEngine = require("./math_engine.js");
const validateTelegramData = require("./telegramAuth").default;
const jwt = require("jsonwebtoken");

const { User, Score, sequelize } = require("./DataBase/models");
const { sequelize2, user_db_sequelize } = require('./DataBase/database');
const db = require("./DataBase/models");

const MaxTime = 10;
const RewardTime = 2;
const PenaltyTime = 6;

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const allowedOrigins = [
    "https://momis.studio",
    "https://www.momis.studio",
    "https://web.telegram.org",
    "https://math-battle.momis.studio",
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
        this.jwtPayload = jwtPayload; 
        this.score = 0;
        this.top_score = 0;
        this.time_left = MaxTime;
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
        this.total_time = MaxTime;
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
    // Replace your entire runTimer function with this definitive, corrected version
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

            // ▼▼▼ THIS IS THE CRITICAL FIX - PART 2 ▼▼▼
            // The backend timer is now the SINGLE SOURCE OF TRUTH for timeouts.
            if (player.time_left < 0) {
                logger.info(
                    `Player ${playerId} server-side timer expired. Triggering final save...`
                );
                // It calls the corrected timeHandler to save the score and end the game.
                this.timeHandler(player.jwtPayload.userId);
                return; // Stop the timer.
            }
            // ▲▲▲ END OF FIX ▲▲▲

            player.timer = setTimeout(tick, 1000);
        };

        player.timer = setTimeout(tick, 1000);
    }
    async startGame(jwtPayload, eventId) {
        try {
            const userId = jwtPayload?.userId;
            if (!userId) {
                throw new Error("User ID is missing in JWT payload");
            }

            // --- Step 1 & 2: Get user and their all-time top score ---
            const [user, created] = await db.User_Momis.findOrCreate({
            where: { telegramId: userData.id },
            defaults: {
                firstName: jwtPayload.first_name,
                lastName: jwtPayload.last_name || "",
                username: jwtPayload.username || "",
                photo_url: jwtPayload.photo_url || null,
            },
            });

            const [user2, created2] = await User.findOrCreate({
            where: { telegramId: userData.id },
            defaults: {
                firstName: jwtPayload.first_name,
                lastName: jwtPayload.last_name || "",
                username: jwtPayload.username || "",
                photo_url: jwtPayload.photo_url || null,
            },
            });

            if (!created && (user.firstName !== jwtPayload.firstName ||
                user.lastName !== jwtPayload.lastName ||
                user.username !== jwtPayload.username ||
                user.photo_url !== jwtPayload.photo_url)){
                user.firstName = jwtPayload.firstName;
                user.lastName = jwtPayload.lastName;
                user.username = jwtPayload.username;
                user.photo_url = jwtPayload.photo_url;
                await user.save();
                console.log(`user ${user.telegramId} updated`);
            }


            const topScoreResult = await Score.findOne({
                where: { userTelegramId: userId },
                attributes: [
                    [sequelize.fn("max", sequelize.col("score")), "top_score"],
                ],
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

            // Explicitly set the eventId for the CURRENT game session on the player object.
            // This ensures that when the game ends, we know which event the score belongs to.
            player.currentEventId = eventId;

            const { problem, is_correct } = mathEngine.generate(0);
            player.current_problem = problem;
            player.current_answer = is_correct;

            const problemImage = createProblemImage(problem);

            this.runTimer(playerId);

            // This single log will now correctly show the event ID after it has been set.
            logger.info(
                `Game started for user ${userId}. Event ID: ${
                    player.currentEventId || "Free Play"
                }`
            );

            return {
                status: "success",
                player_id: playerId,
                problemImage: problemImage,
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

    // Replace your entire timeHandler function with this corrected version
    async timeHandler(userId) {
        try {
            const playerId = this.userToPlayerMap[userId];
            if (
                !playerId ||
                !this.players[playerId] ||
                !this.players[playerId].game_active
            ) {
                const player = this.players[playerId];
                return {
                    status: "game_over",
                    final_score: player ? player.score : 0,
                };
            }

            const player = this.players[playerId];
            player.game_active = false;

            // ▼▼▼ THIS IS THE CRITICAL FIX - PART 1 ▼▼▼
            // Save the score to the database when the timeout happens.
            if (player.score > 0) {
                await Score.create({
                    score: player.score,
                    userTelegramId: userId,
                    eventId: player.currentEventId,
                });
                logger.info(
                    `Saved final score ${
                        player.score
                    } for user ${userId} via TIMEOUT in event ${
                        player.currentEventId || "Free Play"
                    }`
                );
            }
            // ▲▲▲ END OF FIX ▲▲▲

            player.top_score = Math.max(player.top_score, player.score);

            return {
                status: "game_over",
                final_score: player.score,
                top_score: player.top_score,
                eventId: player.currentEventId,
            };
        } catch (e) {
            logger.error(`TimeHandle error: ${e.message}`);
            return { status: "error", message: e.message };
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
                    eventId: player.currentEventId, 
                };
            }

            const is_correct = userAnswer === player.current_answer;

            if (is_correct) {
                player.time_left = Math.min(
                    MaxTime,
                    player.time_left + RewardTime
                );
                player.score += 1;

                // We must restart the backend timer to keep it in sync with the new time.
                // First, stop the old timer.
                clearTimeout(player.timer);
                // Then, start it again.
                this.runTimer(playerId);
            } else {
                player.time_left = Math.max(0, player.time_left - PenaltyTime);
            }

            if (player.time_left <= 0) {
                player.game_active = false;

                if (player.score > 0) {
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

                player.top_score = Math.max(player.top_score, player.score);

                return {
                    status: "game_over",
                    final_score: player.score,
                    top_score: player.top_score,
                };
            } else {
                console.log(player.time_left, "looooooooooolo\n");
            }

            const { problem, is_correct: answer } = mathEngine.generate(
                player.score
            );

            player.current_problem = problem;
            player.current_answer = answer;
            
            const problemImage = createProblemImage(problem);

            return {
                status: "continue",
                problemImage: problemImage,
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

async function getActiveReferredFriendsCount(currentUserId) {
    try {
        const [results] = await user_db_sequelize.query(`
            SELECT
                COUNT(DISTINCT u.telegramId) AS invited_num
            FROM
                momis_users.Users AS u
            WHERE
                u.referrerTelegramId = :currentUserId
                AND (
                  EXISTS (
                      SELECT 1
                      FROM colormemory_db.Scores AS cs
                      WHERE cs.userTelegramId = u.telegramId
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM my_2048_db.Scores AS ms
                      WHERE ms.userTelegramId = u.telegramId
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM momisdb.scores AS mo_s
                      WHERE mo_s.userTelegramId = u.telegramId
                  )
                )
        `, {
            replacements: { currentUserId: currentUserId },
            type: user_db_sequelize.QueryTypes.SELECT,
        });
        const invitedNum = results ? results.invited_num : 0;

        console.log(
            `User ${currentUserId} has invited ${invitedNum} active friends across all games.`
        );
        return invitedNum;
    } catch (error) {
        console.error(
            `Error fetching active referred friends count for user ${currentUserId}:`,
            error
        );
        return 0;
    }
}

app.use(express.static(path.join(__dirname, "../frontend/build")));

// API Routes
app.post("/api/telegram-auth", async (req, res) => {
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

        // --- بخش جدید: بررسی عضویت اجباری ---
        const isMember = await isUserMember(userData.id);
        if (!isMember) {
            logger.info(`Auth blocked for non-member user: ${userData.id}`);
            // کد 403 به معنی "دسترسی ممنوع" است
            return res.status(403).json({
                valid: false,
                message:
                    "To play the game, you must join our channel and group first.",
                membership_required: true, // یک فلگ برای فرانت‌اند تا پیام مناسب را نمایش دهد
            });
        }
        // --- پایان بخش بررسی عضویت ---

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

// Replace your entire /api/start endpoint with this corrected version
app.post("/api/start", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { eventId } = req.body; // Get eventId from the request

        logger.info(`Start game request for user: ${user.userId}`, { eventId });

        // ▼▼▼ THIS IS THE DEFINITIVE FIX ▼▼▼
        // Correctly pass the user payload as the first argument
        // and the eventId as the second argument to the game logic.
        const result = await gameInstance.startGame(user, eventId);
        // ▲▲▲ END OF FIX ▲▲▲

        res.json(result);
    } catch (e) {
        logger.error(`API start error: ${e.message}`, {
            stack: e.stack,
        });
        res.status(500).json({
            status: "error",
            message: "Internal server error",
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

app.post("/api/timeOut", authenticateToken, async (req, res) => {
    try {
        const user = req.user; // اطلاعات کاربر از توکن
        const result = await gameInstance.timeHandler(user.userId);

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

app.get("/api/referral-leaderboard", async (req, res) => {
    logger.info("Fetching referral leaderboard...");
    try {
        const [results] = await user_db_sequelize.query(`
            SELECT
                u.firstName AS firstName,
                u.username AS username,
                COUNT(DISTINCT u2.telegramId) AS referral_count
            FROM momis_users.Users u2
            INNER JOIN momis_users.Users u ON u2.referrerTelegramId = u.telegramId
            WHERE
                u2.referrerTelegramId IS NOT NULL
                AND (
                    EXISTS (
                        SELECT 1
                        FROM colormemory_db.Scores AS cs
                        WHERE cs.userTelegramId = u2.telegramId
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM my_2048_db.Scores AS ms
                        WHERE ms.userTelegramId = u2.telegramId
                    )
                    OR EXISTS (
                        SELECT 1 
                        FROM momisdb.scores AS mo_s
                        WHERE mo_s.userTelegramId = u2.telegramId
                    )
                )
            GROUP BY u2.referrerTelegramId, u.firstName, u.username
            ORDER BY referral_count DESC
            LIMIT 3;
        `);

        res.status(200).json(results);
    } catch (error) {
        logger.error(`Referral leaderboard error: ${error.message}`, {
            stack: error.stack,
        });
        res.status(500).json({
            status: "error",
            message: "Internal server error on referral leaderboard",
        });
    }
});

// اضافه کردن authenticateToken برای شناسایی کاربر فعلی
app.get("/api/leaderboard", authenticateToken, async (req, res) => {
    try {
        // شناسه‌ی کاربر فعلی از توکن گرفته می‌شود
        const currentUserTelegramId = req.user.userId;
        const { eventId } = req.query;

        // ساخت شرط فیلتر، دقیقا مانند کد اصلی شما
        const whereCondition = {};
        if (eventId && eventId !== "null" && eventId !== "undefined") {
            whereCondition.eventId = eventId;
        } else {
            whereCondition.eventId = null;
        }
        logger.info(
            `Fetching leaderboard for user ${currentUserTelegramId} with condition:`,
            whereCondition
        );

        // مرحله ۱: بهترین امتیاز *تمام* کاربران را بر اساس شرط پیدا می‌کنیم (بدون limit)
        const allScores = await Score.findAll({
            where: whereCondition,
            attributes: [
                "userTelegramId",
                [sequelize.fn("MAX", sequelize.col("score")), "max_score"],
            ],
            group: ["userTelegramId"],
            order: [[sequelize.col("max_score"), "DESC"]], // مرتب‌سازی بر اساس بیشترین امتیاز
            raw: true,
        });

        // مرحله ۲: رتبه‌بندی را در سرور محاسبه می‌کنیم
        let rank = 0;
        let lastScore = Infinity;
        const allRanks = allScores.map((entry, index) => {
            if (entry.max_score < lastScore) {
                rank = index + 1; // رتبه برابر با جایگاه در آرایه مرتب‌شده است
                lastScore = entry.max_score;
            }
            return {
                userTelegramId: entry.userTelegramId,
                score: entry.max_score,
                rank: rank, // اضافه کردن رتبه به هر بازیکن
            };
        });

        // مرحله ۳: ۵ نفر برتر و کاربر فعلی را از لیست رتبه‌بندی شده جدا می‌کنیم
        const top5Players = allRanks.slice(0, 5);
        const currentUserData = allRanks.find(
            (p) => p.userTelegramId == currentUserTelegramId
        );

        // مرحله ۴: اطلاعات کامل (نام، عکس و...) را برای کاربران مورد نیاز می‌گیریم
        const userIdsToFetch = [
            ...new Set([
                // با Set از ارسال ID تکراری جلوگیری می‌کنیم
                ...top5Players.map((p) => p.userTelegramId),
                ...(currentUserData ? [currentUserData.userTelegramId] : []), // اگر کاربر فعلی رکوردی داشت، ID او را هم اضافه کن
            ]),
        ];

        const users = await db.User_Momis.findAll({
            where: { telegramId: userIdsToFetch },
            raw: true,
        });

        const userMap = users.reduce((map, user) => {
            map[user.telegramId] = user;
            return map;
        }, {});

        // تابع کمکی برای ترکیب اطلاعات کاربر با رتبه و امتیاز
        const formatPlayer = (playerData) => {
            if (!playerData) return null;
            const userProfile = userMap[playerData.userTelegramId];
            return {
                telegramId: userProfile?.telegramId,
                username: userProfile?.username,
                firstName: userProfile?.firstName,
                photo_url: userProfile?.photo_url,
                score: playerData.score,
                rank: playerData.rank,
            };
        };

        // مرحله ۵: ساخت آبجکت نهایی برای ارسال به فرانت‌اند
        res.json({
            status: "success",
            leaderboard: {
                top: top5Players.map(formatPlayer), // لیست ۵ نفر برتر
                currentUser: formatPlayer(currentUserData), // اطلاعات کاربر فعلی
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

app.get("/api/events", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const activeEvents = [];
    if (process.env.ONTON_EVENT_UUID) {
        activeEvents.push({
            id: process.env.ONTON_EVENT_UUID,
            name: "Main Tournament",
            description: "Compete for the grand prize in the main event!",
        });
    }
    const invitedNum = await getActiveReferredFriendsCount(userId);

    res.json({
        invitedNum: invitedNum,
        status: "success",
        events: activeEvents,
    });
});

// ▼▼▼ THIS IS THE DEFINITIVE FIX - PART 1: BACKEND PROXY ▼▼▼
app.get("/api/avatar", async (req, res) => {
    try {
        const externalUrl = req.query.url;

        // Basic security check: only allow URLs from Telegram's CDN
        if (!externalUrl || !externalUrl.startsWith("https://t.me/")) {
            return res.status(400).send("Invalid URL");
        }

        const response = await fetch(externalUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // Get the content type from the original response (e.g., 'image/jpeg')
        const contentType = response.headers.get("content-type");
        res.setHeader("Content-Type", contentType);

        // Set caching headers to tell the browser to cache the image for 1 day
        res.setHeader("Cache-Control", "public, max-age=86400");

        // Stream the image data directly to the client
        response.body.pipe(res);
    } catch (error) {
        logger.error(`Avatar proxy error: ${error.message}`);
        // Redirect to a default avatar in case of an error
        res.status(404).sendFile(
            path.join(__dirname, "../frontend/build", "default-avatar.png")
        );
    }
});
// ▲▲▲ END OF FIX ▲▲▲

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
});
