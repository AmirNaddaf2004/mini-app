import React, { useState, useEffect } from "react";
import DefaultAvatar from "../assets/default-avatar.png";
import { motion } from "framer-motion"; // Import motion for animations

// The api service definition remains the same
const api = {
    get: (url) =>
        fetch(url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        }).then((res) => res.json()),
};

const GameLobby = ({ onGameStart, userData, onLogout, onImageError }) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // The useEffect hook for fetching events remains exactly the same
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setIsLoading(true);
                const response = await api.get("/api/events");
                if (response.status === "success") {
                    setEvents(response.events);
                }
            } catch (error) {
                console.error("Failed to fetch events:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (isLoading) {
        return (
            <div className="w-full max-w-md mx-auto text-center p-6">
                <p className="text-white text-lg">Loading Events...</p>
            </div>
        );
    }

    // ### VISUAL ENHANCEMENT 1: Animation Variants ###
    // These define how the lobby elements will animate into view.
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1 // Each child element will appear one after another
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    };

    return (
        // The main container is now a motion.div to orchestrate the animation
        <motion.div
            className="w-full max-w-md mx-auto bg-gray-800 bg-opacity-70 rounded-xl shadow-lg p-6 text-white"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* The user profile section is preserved exactly as it was, now wrapped in motion.div */}
            {userData && (
                <motion.div variants={itemVariants} className="flex items-center gap-3 bg-white/10 p-2 rounded-lg mb-6">
                    <img
                        src={userData.photo_url ? `/api/avatar?url=${encodeURIComponent(userData.photo_url)}` : DefaultAvatar}
                        alt="Profile"
                        className="w-12 h-12 rounded-full border-2 border-gray-500"
                        onError={onImageError}
                    />
                    <div className="flex-grow">
                        <h2 className="font-bold text-lg leading-tight">
                            {userData.first_name} {userData.last_name}
                        </h2>
                        <p className="text-sm opacity-80">
                            @{userData.username}
                        </p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="ml-auto text-xs bg-red-500/50 px-3 py-1.5 rounded-md hover:bg-red-500/80 transition-colors"
                        title="Logout"
                    >
                        Logout
                    </button>
                </motion.div>
            )}

            <motion.h1 variants={itemVariants} className="text-3xl font-bold mb-6 text-center text-yellow-400">
                Game Mode
            </motion.h1>

            {/* ### VISUAL ENHANCEMENT 2: Interactive Cards ### */}
            {/* Each game mode card is now a motion.div with a hover effect. */}
            
            <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.03 }} // Card slightly grows on hover
                className="bg-gray-700 bg-opacity-50 rounded-lg p-4 my-3"
            >
                <h2 className="text-xl font-bold text-white">Free Play</h2>
                <p className="text-sm text-gray-300 mt-1 mb-3">
                    Practice and play just for fun.
                </p>
                <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    onClick={() => onGameStart(null)}
                >
                    Start
                </button>
            </motion.div>

            {events.length > 0 && (
                <motion.div variants={itemVariants} className="relative flex py-3 items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400">Events</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                </motion.div>
            )}

            {events.map((event) => (
                <motion.div
                    key={event.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03 }} // Card slightly grows on hover
                    className="bg-gray-700 bg-opacity-50 rounded-lg p-4 my-3"
                >
                    <h2 className="text-xl font-bold text-yellow-400">
                        {event.name}
                    </h2>
                    <p className="text-sm text-gray-300 mt-1 mb-3">
                        {event.description}
                    </p>
                    <button
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        onClick={() => onGameStart(event.id)}
                    >
                        Join Event
                    </button>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default GameLobby;