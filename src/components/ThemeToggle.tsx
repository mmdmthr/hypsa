import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const isCurrentlyDark =
            document.documentElement.classList.contains("dark");

        setIsDark(isCurrentlyDark);
    }, []);

    const toggleTheme = (): void => {
        const newTheme = !isDark;

        setIsDark(newTheme);

        if (newTheme) {
            localStorage.theme = "dark";
            document.documentElement.classList.add("dark");
        } else {
            localStorage.theme = "light";
            document.documentElement.classList.remove("dark");
        }
    };

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) {
        return (
            <div className="p-2 rounded-lg bg-beige text-ink w-9 h-9" />
        )
    }

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-beige dark:bg-forest text-ink dark:text-surface hover:bg-sky dark:hover:bg-sky transition-colors shadow-md"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            type="button"
        >
            {isDark ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </button>
    )
}
