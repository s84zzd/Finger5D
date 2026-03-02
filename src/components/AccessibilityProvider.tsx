"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityContextType {
    isLargeText: boolean;
    toggleLargeText: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [isLargeText, setIsLargeText] = useState(() => {
        if (typeof window === "undefined") {
            return false;
        }
        return localStorage.getItem("finger5d-large-text") === "true";
    });

    useEffect(() => {
        document.body.classList.toggle("text-enlarged", isLargeText);
        localStorage.setItem("finger5d-large-text", String(isLargeText));
    }, [isLargeText]);

    const toggleLargeText = () => {
        setIsLargeText((prev) => !prev);
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
