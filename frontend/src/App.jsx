import { useState, useCallback } from "react";
import HomeScreen from "./screens/HomeScreen";
import GameScreen from "./screens/GameScreen";
import StatsScreen from "./screens/StatsScreen";
import { useTheme } from "./hooks/useTheme";
import "./styles/index.css";

const STATS_KEY = "sudoku-stats";

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    console.warn("Could not save stats to localStorage");
  }
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [difficulty, setDifficulty] = useState("medium");
  const theme = useTheme();

  const handleStart = useCallback((diff) => {
    setDifficulty(diff);
    setScreen("game");
  }, []);

  const handleComplete = useCallback(({ difficulty: diff, time }) => {
    const stats = loadStats();
    if (!stats[diff]) stats[diff] = { played: 0, best: Infinity, totalTime: 0 };
    stats[diff].played += 1;
    stats[diff].totalTime += time;
    stats[diff].best = Math.min(stats[diff].best, time);
    saveStats(stats);
  }, []);

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          onStart={handleStart}
          onViewStats={() => setScreen("stats")}
          theme={theme}
        />
      )}
      {screen === "game" && (
        <GameScreen
          difficulty={difficulty}
          onHome={() => setScreen("home")}
          onComplete={handleComplete}
          theme={theme}
        />
      )}
      {screen === "stats" && (
        <StatsScreen onBack={() => setScreen("home")} theme={theme} />
      )}
    </>
  );
}
