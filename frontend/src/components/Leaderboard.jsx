// frontend/src/components/Leaderboard.jsx
import { useEffect, useState } from "react";
import DefaultAvatar from "../assets/default-avatar.png";
import { motion } from "framer-motion";

export default function Leaderboard({ API_BASE, onReplay, finalScore, onHome, userData, eventId }) {
    // ... your existing state and useEffect logic remains the same ...
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { /* ... fetch logic ... */ }, [API_BASE, eventId]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            className="w-full max-w-md mx-auto bg-white/80 backdrop-blur p-6 rounded-3xl shadow-xl text-slate-800"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {finalScore !== null && (
                 <motion.div variants={itemVariants} className="mb-4 text-center ...">
                     {/* ... Game Over banner ... */}
                 </motion.div>
            )}
            <motion.h2 variants={itemVariants} className="text-3xl ...">
                {eventId ? "Event Leaderboard" : "Global Leaderboard"}
            </motion.h2>

            <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="mt-4">
                {/* Header Row */}
                <li className="flex ..."> {/* ... */} </li>

                {/* Data Rows */}
                {rows.map((player, index) => (
                    <motion.li
                        key={player.telegramId}
                        variants={itemVariants}
                        className={`flex items-center ... ${player.telegramId === userData?.id ? "bg-indigo-200 ..." : "bg-white/50"}`}
                    >
                        {/* ... your player row JSX ... */}
                    </motion.li>
                ))}
            </motion.ul>

            <motion.div variants={itemVariants} className="mt-6 flex flex-col gap-2">
                <button onClick={onReplay} className="w-full py-3 ...">Play Again</button>
                <button onClick={onHome} className="w-full py-2 ...">Back to Lobby</button>
            </motion.div>
        </motion.div>
    );
}