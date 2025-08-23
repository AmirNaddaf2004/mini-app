import DeviceDetector from "./components/DeviceDetector"; // <-- این خط را اضافه کنید
import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
} from "react";
import ProblemCard from "./components/ProblemCard";
import AnswerButtons from "./components/AnswerButtons";
import TimerCircle from "./components/TimerCircle";
import Leaderboard from "./components/Leaderboard";
import DefaultAvatar from "./assets/default-avatar.png";
import GameLobby from "./components/GameLobby";
import { motion, AnimatePresence } from "framer-motion";

const ROUND_TIME = 15;
const API_BASE = "/api";
const tg = window.Telegram?.WebApp;

function App() {
    const [problem, setProblem] = useState(null);
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState("auth");
    const [finalScore, setFinalScore] = useState(null);
    const [score, setScore] = useState(0);
    const [error, setError] = useState(null);
    const [leaderboardKey, setLeaderboardKey] = useState(Date.now());
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [membershipRequired, setMembershipRequired] = useState(false);

    const [token, setToken] = useState(
        () => localStorage.getItem("jwtToken") || null
    );
    const [userData, setUserData] = useState(() => {
        const saved = localStorage.getItem("userData");
        return saved ? JSON.parse(saved) : null;
    });
    const [gameActive, setGameActive] = useState(false);
    const [currentGameEventId, setCurrentGameEventId] = useState(null);

    const timerId = useRef(null);
    const abortControllerRef = useRef(null);

    const clearResources = useCallback(() => {
        if (timerId.current) clearInterval(timerId.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();

        timerId.current = null;
        abortControllerRef.current = null;
    }, []);

    const handleGameOver = useCallback(
        (finalScore) => {
            clearResources();
            setProblem(null);
            setFinalScore(finalScore);
            setView("board");
            setLeaderboardKey(Date.now());
            setGameActive(false);
        },
        [clearResources]
    );

    const authenticateUser = useCallback(async () => {
        try {
            setAuthLoading(true);
            setError(null);
            setMembershipRequired(false);

            // if (!window.Telegram?.WebApp) {
            //     console.log(
            //         "Running in non-Telegram environment, skipping authentication"
            //     );
            //     setIsAuthenticated(true);
            //     setView("home");
            //     return;
            // }

            const initData = window.Telegram.WebApp.initData || "";
            if (!initData) {
                throw new Error("Telegram authentication data not found");
            }

            const response = await fetch(`${API_BASE}/telegram-auth`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ initData }),
            });

            const data = await response.json();

            if (response.status === 403 && data.membership_required) {
                setMembershipRequired(true); // حالت نمایش پیام عضویت را فعال می‌کنیم
                setView("auth"); // در همین صفحه باقی می‌مانیم
                setError(data.message); // پیام خطا را از سرور می‌گیریم
                return; // از ادامه تابع خارج می‌شویم
            }
            if (!response.ok || !data.valid) {
                throw new Error(data.message || "Authentication failed");
            }

            setToken(data.token);
            setUserData(data.user);
            localStorage.setItem("jwtToken", data.token);
            localStorage.setItem("userData", JSON.stringify(data.user));
            setIsAuthenticated(true);
            setView("lobby");
        } catch (error) {
            console.error("Authentication error:", error);
            setError(error.message);
            setIsAuthenticated(false);
            setView("auth");
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const handleTimeout = useCallback(async () => {
        try {
            // try to display the leaderboard.
            const response = await fetch(`${API_BASE}/timeOut`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, // Pass the auth token
                },
            });

            if (!response.ok) {
                // If the backend call fails, still end the game on the frontend
                console.error("Timeout API call failed");
                handleGameOver(score); // Show leaderboard with the score we had
                return;
            }

            const data = await response.json();
            // Now, call handleGameOver with the CONFIRMED final score from the server
            handleGameOver(data.final_score);
            // ▲▲▲ END OF FIX ▲▲▲
        } catch (error) {
            console.error("Error during timeout handling:", error);
            handleGameOver(score); // Fallback to end the game
        }
    }, [token, score, handleGameOver]); // Added `token` and `score` to dependency array

    const startLocalTimer = useCallback(
        (initialTime) => {
            clearResources();
            setTimeLeft(initialTime);

            timerId.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTimeout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        },
        [clearResources, handleTimeout]
    );

    const submitAnswer = useCallback(
        async (answer) => {
            if (!problem || loading || !token) return;

            try {
                setLoading(true);
                setError(null);
                abortControllerRef.current = new AbortController();

                const response = await fetch(`${API_BASE}/answer`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ answer: Boolean(answer) }),
                    signal: abortControllerRef.current.signal,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.message || "Failed to submit answer"
                    );
                }

                const data = await response.json();

                if (data.status === "continue") {
                    setProblem(data.problemImage);
                    setScore(data.score);
                    startLocalTimer(data.time_left);
                } else {
                    handleGameOver(data.final_score);
                }
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Answer error:", err);
                    setError(err.message || "Failed to submit answer");

                    if (
                        err.message.includes("token") ||
                        err.message.includes("Unauthorized")
                    ) {
                        setIsAuthenticated(false);
                        setView("auth");
                    }
                }
            } finally {
                if (!abortControllerRef.current?.signal.aborted) {
                    setLoading(false);
                }
            }
        },
        [problem, loading, handleGameOver, token, startLocalTimer]
    );

    // MODIFIED: The `startGame` function now accepts `eventId`
    const startGame = useCallback(
        async (eventId) => {
            setCurrentGameEventId(eventId); // شناسه رویداد این دور از بازی را به خاطر بسپار

            // It now takes eventId as an argument
            if (!isAuthenticated || !token) {
                setError("Please authenticate first");
                setView("auth");
                return;
            }

            try {
                setLoading(true);
                setError(null);
                setGameActive(true);

                const abortController = new AbortController();
                abortControllerRef.current = abortController;

                const response = await fetch(`${API_BASE}/start`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    // Send the eventId (which can be null) in the request body
                    body: JSON.stringify({ eventId }),
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                        errorData.message ||
                            `Request failed with status ${response.status}`
                    );
                }

                const data = await response.json();

                if (!data || data.status !== "success") {
                    throw new Error(data?.message || "Invalid server response");
                }

                setProblem(data.problemImage);
                startLocalTimer(data.time_left ?? ROUND_TIME);
                setScore(data.score ?? 0);
                setView("game"); // Set the view to 'game' to start playing
            } catch (err) {
                if (err.name === "AbortError") {
                    console.log("Request was aborted");
                    return;
                }

                console.error("Game start error:", err);
                setError(
                    err.message.includes("Failed to fetch")
                        ? "Could not connect to server. Please check your connection."
                        : err.message
                );
                setGameActive(false);
                setView("lobby"); // On error, go back to the lobby, not 'home'
            } finally {
                if (!abortControllerRef.current?.signal.aborted) {
                    setLoading(false);
                }
            }
        },
        [startLocalTimer, isAuthenticated, token]
    );

    const handleImageError = useCallback((e) => {
        if (e.target.src !== DefaultAvatar) {
            e.target.src = DefaultAvatar;
        }
        e.target.onerror = null;
    }, []);

    // ✨ useEffect اصلی با منطق کاملاً بازنویسی شده و بهینه
    useEffect(() => {
        const initApp = async () => {
            // // اولویت اول: آیا توکن و داده معتبر در حافظه وجود دارد؟
            // const storedToken = localStorage.getItem("jwtToken");
            // const storedUserData = localStorage.getItem("userData");

            // if (storedToken && storedUserData) {
            //     console.log("Authentication from localStorage.");
            //     setToken(storedToken);
            //     setUserData(JSON.parse(storedUserData));
            //     setIsAuthenticated(true);
            //     setView("lobby");
            //     setAuthLoading(false);
            //     return; // <-- پایان فرآیند
            // }

            // اولویت دوم: آیا در محیط تلگرام هستیم و داده برای احراز هویت داریم؟
            if (tg && tg.initData) {
                console.log("Authenticating with Telegram data...");
                // تابع authenticateUser فقط همین یک بار فراخوانی می‌شود
                await authenticateUser();
                return; // <-- پایان فرآیند
            }

            // // حالت بازگشتی: برای محیط تست خارج از تلگرام
            // console.warn("Running in non-Telegram development mode.");
            // setIsAuthenticated(true);
            // setView("lobby");
            // setAuthLoading(false);
        };

        if (tg) {
            tg.ready();
            tg.expand();
        }

        initApp();
    }, [authenticateUser]); // فقط به authenticateUser وابسته است

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userData");
        setToken(null);
        setUserData(null);
        setIsAuthenticated(false);
        setView("auth");
    }, []);

    const authContent = useMemo(() => {
        // اگر view برابر با 'auth' نباشد، چیزی نمایش نده
        if (view !== "auth") return null;

        // محتوای اصلی صفحه با انیمیشن‌ها
        const content = (
            <>
                <motion.h1
                    className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    Math Battle
                </motion.h1>

                {/* اگر خطای عضویت وجود داشت، پیام و دکمه‌های عضویت را نمایش بده */}
                {membershipRequired ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full max-w-xs"
                    >
                        <p className="text-lg text-red-400 mb-4">
                            {error || "Please join our channels to play."}
                        </p>
                        <div className="space-y-3">
                            {/* **مهم:** این لینک‌ها را با مقادیر واقعی خود از فایل .env یا ecosystem.config.js جایگزین کنید */}
                            <a
                                href="https://t.me/MOMIS_studio"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                            >
                                📢 Join Channel
                            </a>
                            <a
                                href="https://t.me/MOMIS_community"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                            >
                                💬 Join Group
                            </a>
                            <button
                                onClick={authenticateUser}
                                className="mt-4 w-full py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                            >
                                ✅ I've Joined, Try Again
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    // در غیر این صورت، حالت عادی ورود را نمایش بده
                    <>
                        <motion.p
                            className="text-lg text-gray-300 mb-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            Ready to challenge your mind?
                        </motion.p>

                        {authLoading ? (
                            <p className="text-lg text-gray-400 animate-pulse">
                                Connecting...
                            </p>
                        ) : (
                            <motion.button
                                onClick={authenticateUser}
                                className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xl font-bold shadow-lg hover:bg-blue-700 transition-all duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Login with Telegram
                            </motion.button>
                        )}
                    </>
                )}
                {/* نمایش خطاهای عمومی دیگر */}
                {!membershipRequired && error && (
                    <p className="text-red-400 mt-4">{error}</p>
                )}
            </>
        );

        return (
            <div className="flex flex-col items-center justify-center text-center h-screen px-4">
                {content}
            </div>
        );
    }, [view, authLoading, error, authenticateUser, membershipRequired]);

    // NEW: This content will render the Game Lobby
    const lobbyContent = useMemo(() => {
        if (view !== "lobby") return null;

        // Pass the necessary user data and functions to the lobby component
        return (
            <GameLobby
                onGameStart={startGame}
                userData={userData}
                onLogout={handleLogout}
                onImageError={handleImageError}
            />
        );
    }, [view, startGame, userData, handleLogout, handleImageError]);
    // محتوای بازی
    const gameContent = useMemo(() => {
        if (view !== "game") return null;

        return problem ? (
            <div className="flex flex-col items-center gap-6 w-full max-w-md">
                <div className="flex justify-between w-full">
                    <p className="text-2xl font-bold">Score: {score}</p>
                    {userData && (
                        <div className="flex items-center gap-2">
                            <img
                                src={
                                    userData.photo_url
                                        ? `/api/avatar?url=${encodeURIComponent(
                                              userData.photo_url
                                          )}`
                                        : DefaultAvatar
                                }
                                alt="Profile"
                                className="w-12 h-12 rounded-full"
                                onError={handleImageError}
                            />
                            <span>{userData.first_name}</span>
                        </div>
                    )}
                </div>

                <ProblemCard imageData={problem} />
                <TimerCircle total={ROUND_TIME} left={timeLeft} />
                <AnswerButtons
                    onAnswer={submitAnswer}
                    disabled={loading || !gameActive}
                />
            </div>
        ) : (
            <button
                onClick={GameLobby}
                disabled={loading}
                className={`px-8 py-4 bg-white text-indigo-600 rounded-2xl text-2xl font-bold shadow-xl transition-transform ${
                    loading ? "opacity-50" : "hover:scale-105"
                }`}
            >
                {loading ? "Loading..." : "Start Game"}
            </button>
        );
    }, [
        view,
        problem,
        score,
        timeLeft,
        loading,
        submitAnswer,
        handleImageError,
        userData,
        gameActive,
    ]);

    const leaderboardContent = useMemo(
        () =>
            view === "board" && (
                <Leaderboard
                    key={leaderboardKey}
                    API_BASE={API_BASE}
                    finalScore={finalScore}
                    onReplay={() => startGame(currentGameEventId)}
                    onHome={() => setView("lobby")}
                    userData={userData}
                    eventId={currentGameEventId} // شناسه رویداد ذخیره شده را به لیدربورد پاس بده
                />
            ),
        [
            view,
            startGame,
            leaderboardKey,
            finalScore,
            userData,
            currentGameEventId,
        ]
    );

    return (
        // Layer 1: The main container. It's 'relative' so we can position the logo inside it.
        // It only handles the background gradient.
        <div className="relative min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
            {/* The Logo is now a direct child of the background layer. */}
            {/* It stays in the corner with a low z-index, acting as a watermark. */}
            <img
                src={`${process.env.PUBLIC_URL}/teamlogo.png?v=2`}
                alt="Team Logo"
                className="absolute bottom-4 right-4 w-12 opacity-50 pointer-events-none z-0"
            />

            {/* Layer 2: The Content container. */}
            {/* This container holds ALL your interactive components. */}
            {/* It's centered and has a higher z-index to ensure it always sits ON TOP of the logo. */}
            <div className="relative min-h-screen flex flex-col items-center justify-center text-white p-4 z-10">
                <DeviceDetector>
                    {/* Error display */}
                    {error && (
                        <div
                            className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg z-50 max-w-md text-center animate-fade-in"
                            role="alert"
                        >
                            {error}
                            <button
                                onClick={() => setError(null)}
                                className="ml-2 text-white hover:text-gray-200"
                                aria-label="Close error message"
                            >
                                &times;
                            </button>
                        </div>
                    )}

                    {/* All your app views are safely inside this top layer */}
                    {authContent}
                    {lobbyContent}
                    {gameContent}
                    {leaderboardContent}
                </DeviceDetector>
            </div>
        </div>
    );
}

export default React.memo(App);
