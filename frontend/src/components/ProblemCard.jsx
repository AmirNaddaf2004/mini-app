import React from "react";
import { motion } from "framer-motion";

export default function ProblemCard({ imageData }) {
    // اگر داده‌ای برای تصویر وجود ندارد، چیزی رندر نکن
    if (!imageData) {
        return null;
    }

    return (
        <motion.div
            key={imageData} // استفاده از خود داده تصویر به عنوان کلید برای انیمیشن
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mx-auto mt-6 p-4 bg-white/80 backdrop-blur rounded-2xl shadow-xl w-full"
        >
            {/* به جای canvas، فقط یک تگ img قرار می‌دهیم.
                src آن برابر با رشته data URL است که از بک‌اند می‌آید.
            */}
            <img 
                src={imageData} 
                alt="Math Problem" 
                className="w-full h-auto"
            />
        </motion.div>
    );
}