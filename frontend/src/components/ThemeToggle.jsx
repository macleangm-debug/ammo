import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "../contexts/ThemeContext";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`relative overflow-hidden ${className}`}
      data-testid="theme-toggle"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun className={`h-5 w-5 transition-all duration-300 ${
        theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
      }`} />
      <Moon className={`absolute h-5 w-5 transition-all duration-300 ${
        theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
      }`} />
    </Button>
  );
};

export default ThemeToggle;
