"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityContextType {
    isLargeText: boolean;
    toggleLargeText: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [isLargeText, setIsLargeText] = useState(false);

    useEffect(() => {
        // Load preference from local storage
        const saved = localStorage.getItem("finger5d-large-text");
        if (saved === "true") {
            setIsLargeText(true);
            document.body.classList.add("text-enlarged");
        }
    }, []);

    const toggleLargeText = () => {
        const newState = !isLargeText;
        setIsLargeText(newState);
        localStorage.setItem("finger5d-large-text", String(newState));

        if (newState) {
            document.body.classList.add("text-enlarged");
        } else {
            document.body.classList.remove("text-enlarged");
        }
    };

    return (
        <AccessibilityContext.Provider value={{ isLargeText, toggleLargeText }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error("useAccessibility must be used within an AccessibilityProvider");
    }
    return context;
}
