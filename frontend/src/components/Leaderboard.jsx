import { useEffect, useState } from "react";
import DefaultAvatar from "../assets/default-avatar.png";
import { motion } from "framer-motion"; // Import motion for animations

export default function Leaderboard({ API_BASE, onReplay, finalScore, onHome, userData, eventId }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                let url = `${API_BASE}/leaderboard?limit=100`;
                if (eventId) {
                    url += `&eventId=${eventId}`;
                }

                // ## THE DEFINITIVE FIX: Add the Authorization header to the request ##
                const token = localStorage.getItem("jwtToken");
                const res = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!res.ok) {
                    throw new Error("Failed to fetch leaderboard");
                }
                const data = await res.json();
                setRows(data.leaderboard || []);
                setError(null);
            } catch (e) {
                console.error(e);
                setError("Failed to load leaderboard");
                setRows([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [API_BASE, eventId]);

    // Animation variants for a professional staggered entry effect
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) {
        return <div className="text-center">Loading leaderboard...</div>;
    }
    if (error) {
        return <div className="text-center text-red-500">{error}</div>;
    }

    return (
        <motion.div 
            className="w-full max-w-md mx-auto bg-white/80 backdrop-blur p-6 rounded-3xl shadow-xl text-slate-800"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {finalScore !== null && (
                 <motion.div variants={itemVariants} className="mb-4 text-center text-2xl font-bold text-indigo-700">
                     Game Over! Your Score: {finalScore}
                 </motion.div>
            )}
            <motion.h2 variants={itemVariants} className="text-3xl font-bold text-center text-indigo-700 mb-4">
                {eventId ? "Event Leaderboard" : "Global Leaderboard"}
            </motion.h2>

            <motion.ul variants={containerVariants} initial="hidden" animate="visible">
                {/* Header Row */}
                <li className="flex items-center justify-between py-2 px-3 font-semibold text-slate-600 mb-1">
                    <span className="w-8 text-center">#</span>
                    <span className="flex-1 text-left ml-4">Player</span>
                    <span className="w-16 text-right">Score</span>
                </li>

                {/* Data Rows */}
                {rows.length > 0 ? (
                    rows.map((player, index) => (
                        <motion.li
                            key={player.telegramId}
                            variants={itemVariants}
                            className={`flex items-center justify-between py-2 px-3 rounded-xl my-1 ${
                                player.telegramId === userData?.id
                                    ? "bg-indigo-200 ring-2 ring-indigo-400"
                                    : "bg-white/50"
                            }`}
                        >
                            <span className="w-8 text-center font-bold">{index + 1}</span>
                            <div className="flex-1 flex items-center gap-3 ml-4 overflow-hidden">
                                <img
                                    src={player.photo_url ? `/api/avatar?url=${encodeURIComponent(player.photo_url)}` : DefaultAvatar}
                                    alt={player.firstName}
                                    className="w-8 h-8 rounded-full"
                                />
                                <span className="truncate font-medium">
                                    {player.firstName || player.username || 'Anonymous'}
                                </span>
                            </div>
                            <span className="w-16 text-right font-bold text-indigo-600">{player.score}</span>
                        </motion.li>
                    ))
                ) : (
                    <motion.li variants={itemVariants} className="text-center py-4 text-gray-500">
                        No scores yet. Be the first!
                    </motion.li>
                )}
            </motion.ul>

            <motion.div variants={itemVariants} className="mt-6 flex flex-col gap-2">
                <button onClick={onReplay} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition">
                    Play Again
                </button>
                <button onClick={onHome} className="w-full py-2 bg-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-300 transition">
                    Back to Lobby
                </button>
            </motion.div>
        </motion.div>
    );
}