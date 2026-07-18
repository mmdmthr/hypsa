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
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-beige/70 bg-surface text-ink shadow-sm dark:border-forest/40 dark:bg-ink/80 dark:text-surface" />
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-beige/70 bg-surface text-ink shadow-sm transition hover:border-forest hover:text-forest dark:border-forest/40 dark:bg-ink/80 dark:text-surface dark:hover:border-sky dark:hover:text-sky"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            type="button"
        >
            {isDark ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </button>
    );
}
