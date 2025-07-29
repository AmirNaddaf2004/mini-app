// frontend/src/components/GameLobby.jsx

import React, { useState, useEffect } from "react";
import DefaultAvatar from "../assets/default-avatar.png";

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

    useEffect(() => {
        const fetchEvents = async () => {
            // Log 1: Check if the fetch process starts
            console.log("LOG 1: Starting to fetch events from API...");
            try {
                setIsLoading(true);
                const response = await api.get("/api/events");
                
                // Log 2: See the raw response from the server
                console.log("LOG 2: Received raw response from API:", response);

                if (response && response.status === "success" && Array.isArray(response.events)) {
                    // Log 3: Confirm we are about to set the state
                    console.log("LOG 3: API call successful. Setting events state with:", response.events);
                    setEvents(response.events);
                } else {
                    console.error("LOG 3 ERROR: API response was not in the expected format.", response);
                    setEvents([]); // Set to empty array on failure
                }
            } catch (error) {
                console.error("API call failed entirely:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, []);

    // Log 4: Check the state right before rendering
    console.log("LOG 4: Rendering GameLobby component. Current 'events' state is:", events);
    
    if (isLoading) {
        return (
            <div className="w-full max-w-md mx-auto text-center p-6">
                <p className="text-white text-lg">Loading Events...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto bg-gray-800 bg-opacity-70 rounded-xl shadow-lg p-6 text-white animate-fade-in">
            {/* ... Your user profile JSX ... */}
            
            <h1 className="text-3xl font-bold mb-6 text-center text-yellow-400">
                Game Mode
            </h1>

            {/* Free Play Card */}
            <div className="bg-gray-700 ...">
                {/* ... */}
                <button
                    className="w-full bg-blue-600 ..."
                    onClick={() => onGameStart(null)}
                >
                    Start
                </button>
            </div>

            {/* Log 5: Check the condition right before the JSX is rendered */}
            {console.log("LOG 5: About to render events block. Condition `events.length > 0` is:", events.length > 0)}
            
            {/* This is the intelligent block to show either events or the 'No Tournaments' message */}
            {events.length > 0 ? (
                <>
                    <div className="relative flex py-3 items-center">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-400">Events</span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>

                    {events.map((event) => (
                        <div key={event.id} className="bg-gray-700 ...">
                            <h2 className="text-xl ...">{event.name}</h2>
                            <p className="text-sm ...">{event.description}</p>
                            <button
                                className="w-full bg-green-500 ..."
                                onClick={() => onGameStart(event.id)}
                            >
                                Join Event
                            </button>
                        </div>
                    ))}
                </>
            ) : (
                <div className="bg-gray-900 bg-opacity-70 rounded-lg p-4 my-3 cursor-not-allowed">
                    <h2 className="text-xl font-bold text-gray-500">
                        No Active Tournaments
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Check back later for new events! You can still play in Free Play mode.
                    </p>
                </div>
            )}
        </div>
    );
};

export default GameLobby;