import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import logoAsset from "@/assets/inmotion-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InMotion Snake — Arcade Game" },
      {
        name: "description",
        content:
          "Play snake with the InMotion Hosting mark as the snake. Arrow keys or swipe to steer, eat pixels, don't crash.",
      },
      { property: "og:title", content: "InMotion Snake — Arcade Game" },
      {
        property: "og:description",
        content: "Play snake with the InMotion Hosting mark as the snake.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SIZE = 20;
const CELL = 22;
const START = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
];

type Point = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";

const DELTAS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const ROTATION: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function randomFood(snake: Point[]): Point {
  while (true) {
    const p = {
      x: Math.floor(Math.random() * SIZE),
      y: Math.floor(Math.random() * SIZE),
    };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function Index() {
  const [snake, setSnake] = useState<Point[]>(START);
  const [food, setFood] = useState<Point>({ x: 14, y: 10 });
  const [dir, setDir] = useState<Dir>("right");
  const [status, setStatus] = useState<"idle" | "running" | "over">("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const queued = useRef<Dir[]>([]);
  const dirRef = useRef<Dir>("right");

  const reset = useCallback(() => {
    setSnake(START);
    setFood(randomFood(START));
    setDir("right");
    dirRef.current = "right";
    queued.current = [];
    setScore(0);
    setStatus("running");
  }, []);

  const steer = useCallback((next: Dir) => {
    const last = queued.current.at(-1) ?? dirRef.current;
    if (next === last || next === OPPOSITE[last]) return;
    queued.current.push(next);
  }, []);

  useEffect(() => {
    const keys: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      const d = keys[e.key];
      if (d) {
        e.preventDefault();
        if (status !== "running") reset();
        steer(d);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (status !== "running") reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, reset, steer]);

  useEffect(() => {
    if (status !== "running") return;
    const speed = Math.max(70, 150 - score * 3);
    const id = setInterval(() => {
      setSnake((prev) => {
        const next = queued.current.shift();
        if (next) {
          dirRef.current = next;
          setDir(next);
        }
        const d = DELTAS[dirRef.current];
        const cur = prev[0]!;
        const head = { x: cur.x + d.x, y: cur.y + d.y };
        if (
          head.x < 0 ||
          head.y < 0 ||
          head.x >= SIZE ||
          head.y >= SIZE ||
          prev.slice(0, -1).some((s) => s.x === head.x && s.y === head.y)
        ) {
          setStatus("over");
          setBest((b) => Math.max(b, prev.length - START.length));
          return prev;
        }
        const grew = head.x === food.x && head.y === food.y;
        const body = [head, ...prev];
        if (grew) {
          setScore((s) => s + 1);
          setFood(randomFood(body));
        } else {
          body.pop();
        }
        return body;
      });
    }, speed);
    return () => clearInterval(id);
  }, [status, food, score]);

  const touchStart = useRef<Point | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <img src={logoAsset.url} alt="InMotion Hosting logo" className="h-8 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          InMotion Snake
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Steer the mark with arrow keys, WASD, or swipe. Every pixel you eat makes
          you longer and faster.
        </p>
      </header>

      <div className="flex w-full max-w-[480px] items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">
          Score <span className="ml-1 font-semibold text-primary">{score}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          Best <span className="ml-1 font-semibold text-foreground">{best}</span>
        </span>
      </div>

      <div
        className="relative touch-none rounded-xl border border-border bg-board p-2 shadow-lg"
        onTouchStart={(e) => {
          const t = e.touches[0]!;
          touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s = touchStart.current;
          if (!s) return;
          const t = e.changedTouches[0]!;
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
          if (status !== "running") reset();
          steer(
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
                ? "down"
                : "up",
          );
        }}
      >
        <div
          className="relative"
          style={{
            width: SIZE * CELL,
            height: SIZE * CELL,
            backgroundImage:
              "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: `${CELL}px ${CELL}px`,
          }}
        >
          <div
            className="absolute rounded-full bg-primary"
            style={{
              width: CELL * 0.5,
              height: CELL * 0.5,
              left: food.x * CELL + CELL * 0.25,
              top: food.y * CELL + CELL * 0.25,
            }}
          />
          {snake.map((seg, i) =>
            i === 0 ? (
              <img
                key="head"
                src={logoAsset.url}
                alt=""
                className="absolute"
                style={{
                  width: CELL * 1.8,
                  height: CELL * 1.8,
                  left: seg.x * CELL - CELL * 0.4,
                  top: seg.y * CELL - CELL * 0.4,
                  transform: `rotate(${ROTATION[dir]}deg)`,
                }}
              />
            ) : (
              <div
                key={`${seg.x}-${seg.y}-${i}`}
                className="absolute rounded-sm bg-primary"
                style={{
                  width: CELL - 4,
                  height: CELL - 4,
                  left: seg.x * CELL + 2,
                  top: seg.y * CELL + 2,
                  opacity: Math.max(0.35, 1 - i * 0.04),
                }}
              />
            ),
          )}

          {status !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-board/85 backdrop-blur-sm">
              <p className="text-lg font-semibold text-foreground">
                {status === "idle" ? "Ready to roll" : `Crashed — ${score} eaten`}
              </p>
              <button
                onClick={reset}
                className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {status === "idle" ? "Start game" : "Play again"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
