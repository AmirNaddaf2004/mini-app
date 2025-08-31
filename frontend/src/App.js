import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
} from "react";
// import DeviceDetector from "./components/DeviceDetector"; // <-- کامنت شد
import ProblemCard from "./components/ProblemCard";
import AnswerButtons from "./components/AnswerButtons";
import TimerCircle from "./components/TimerCircle";
import Leaderboard from "./components/Leaderboard";
import DefaultAvatar from "./assets/default-avatar.png";
import GameLobby from "./components/GameLobby";
import { motion, AnimatePresence } from "framer-motion";

const ROUND_TIME = 10;
const API_BASE = "/api";
const tg = window.Telegram?.WebApp;

const App = () => {
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

    const handleShowLeaderboard = useCallback((eventId) => {
        setFinalScore(null);
        setCurrentGameEventId(eventId);
        setView("board");
        setLeaderboardKey(Date.now());
    }, []);

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
                setMembershipRequired(true);
                setView("auth");
                setError(data.message);
                return;
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
            const response = await fetch(`${API_BASE}/timeOut`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                console.error("Timeout API call failed");
                handleGameOver(score);
                return;
            }

            const data = await response.json();
            handleGameOver(data.final_score);
        } catch (error) {
            console.error("Error during timeout handling:", error);
            handleGameOver(score);
        }
    }, [token, score, handleGameOver]);

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

    const startGame = useCallback(
        async (eventId) => {
            setCurrentGameEventId(eventId);

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
                setView("game");
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
                setView("lobby");
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
            //     return;
            // }

            // اولویت دوم: آیا در محیط تلگرام هستیم و داده برای احراز هویت داریم؟
            if (tg && tg.initData) {
                console.log("Authenticating with Telegram data...");
                await authenticateUser();
                return;
            }

            // حالت بازگشتی: برای محیط تست خارج از تلگرام
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
    }, [authenticateUser]);

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
        if (view !== "auth") return null;

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

    const lobbyContent = useMemo(() => {
        if (view !== "lobby") return null;

        console.log("rendering Game lobby");
        return (
            <GameLobby
                onGameStart={startGame}
                userData={userData}
                onLogout={handleLogout}
                onImageError={handleImageError}
                onShowLeaderboard={handleShowLeaderboard}
            />
        );
    }, [view, startGame, userData, handleLogout, handleImageError, handleShowLeaderboard]);

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
                onClick={() => setView("lobby")}
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
                    eventId={currentGameEventId}
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
        <div className="relative min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-sans overflow-hidden">
            <img
                src={`${process.env.PUBLIC_URL}/teamlogo.png?v=2`}
                alt="Team Logo"
                className="absolute bottom-4 right-4 w-12 opacity-50 pointer-events-none z-0"
            />
            <AnimatePresence mode="wait">
                {view === "auth" && (
                    <motion.main
                        key="auth"
                        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {authContent}
                    </motion.main>
                )}
                {view === "lobby" && (
                    <motion.main
                        key="lobby"
                        className="relative z-10 flex flex-col items-center justify-start min-h-screen px-4 py-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {lobbyContent}
                    </motion.main>
                )}
                {view === "game" && (
                    <motion.main
                        key="game"
                        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {gameContent}
                    </motion.main>
                )}
                {view === "board" && (
                    <motion.main
                        key="board"
                        className="relative z-10 flex flex-col items-center justify-start min-h-screen px-4 py-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {leaderboardContent}
                    </motion.main>
                )}
            </AnimatePresence>
        </div>
    );
};

export default React.memo(App);