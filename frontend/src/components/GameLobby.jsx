// frontend/src/components/GameLobby.jsx

import React, { useState, useEffect } from "react";
import DefaultAvatar from "../assets/default-avatar.png";
import { motion } from "framer-motion"; // Import motion

// Assuming API service exists as before
const api = {
    get: (url) => fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json())
};

const GameLobby = ({ onGameStart, userData, onLogout, onImageError }) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // ... fetchEvents logic remains exactly the same ...
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

    const handleStartGame = (eventId) => {
        onGameStart(eventId);
    };

    if (isLoading) {
        // ... loading state remains the same ...
        return <div className="text-white text-lg">Loading...</div>;
    }

    // Animation variants for staggering children
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
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
        <motion.div
            className="w-full max-w-md mx-auto bg-gray-800 bg-opacity-70 rounded-xl shadow-lg p-6 text-white"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* User Profile Header */}
            {userData && (
                <motion.div variants={itemVariants} className="flex items-center ...">
                    {/* ... Your existing user profile JSX ... */}
                </motion.div>
            )}

            <motion.h1 variants={itemVariants} className="text-3xl font-bold mb-6 text-center text-yellow-400">
                Game Mode
            </motion.h1>
            
            {/* "Free Play" Button Card */}
            <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className="bg-gray-700 bg-opacity-50 rounded-lg p-4 my-3"
            >
                {/* ... Your existing Free Play card JSX ... */}
            </motion.div>

            {/* Divider */}
            {events.length > 0 && <motion.div variants={itemVariants} className="relative ..."> {/* ... */}</motion.div>}

            {/* List of Active Events */}
            {events.map((event) => (
                <motion.div
                    key={event.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-700 bg-opacity-50 rounded-lg p-4 my-3"
                >
                    {/* ... Your existing Event card JSX ... */}
                </motion.div>
            ))}
        </motion.div>
    );
};

export default GameLobby;