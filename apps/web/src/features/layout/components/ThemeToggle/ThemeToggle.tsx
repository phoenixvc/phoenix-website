// src/components/ThemeToggle/ThemeToggle.tsx
import React, { useCallback } from "react";
import { Moon, Sun, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ThemeName } from "@/theme";
import { useTheme } from "@/theme/hooks";
import { AVAILABLE_THEME_ENTRIES } from "@/theme/constants/themes/catalog";

const ThemeToggle: React.FC = () => {
  // Get theme functions from context
  const {
    themeMode,
    useSystemMode,
    themeName,
    setMode,
    setTheme: setThemeClasses,
    setUseSystemMode,
  } = useTheme();

  // Memoize handlers to prevent recreation on each render
  const handleSetMode = useCallback(
    (newMode: "light" | "dark") => {
      setMode(newMode);
    },
    [setMode],
  );

  const handleSetThemeClasses = useCallback(
    (themeName: ThemeName) => {
      setThemeClasses(themeName);
    },
    [setThemeClasses],
  );

  const handleSetUseSystemMode = useCallback(
    (value: boolean) => {
      setUseSystemMode(value);
    },
    [setUseSystemMode],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSetMode("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {themeMode === "light" && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleSetMode("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {themeMode === "dark" && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuCheckboxItem
          checked={useSystemMode}
          onCheckedChange={handleSetUseSystemMode}
        >
          Use system
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            Color Scheme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {AVAILABLE_THEME_ENTRIES.map((scheme) => (
              <DropdownMenuItem
                key={scheme.id}
                onClick={() => handleSetThemeClasses(scheme.id)}
                className="flex items-center"
              >
                <div className="relative w-4 h-4 rounded-full mr-2 border border-muted">
                  {themeName === scheme.id && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: "hsl(var(--color-primary))" }}
                    />
                  )}
                </div>
                {scheme.displayName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default React.memo(ThemeToggle);
