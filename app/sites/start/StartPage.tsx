import { useEffect, useRef, useState } from "react";
import { Stars } from "./Stars";
import googleImage from "./assets/google.png";
import youtubeImage from "./assets/youtube.png";

type Engine = {
  name: string;
  src: string;
  base: string;
  search: string; // %query% is replaced with the search text
};

const engines: Engine[] = [
  {
    name: "Google",
    src: googleImage,
    base: "https://google.com/",
    search: "https://www.google.com/search?q=%query%",
  },
  {
    name: "Youtube",
    src: youtubeImage,
    base: "https://youtube.com/",
    search: "https://youtube.com/results?search_query=%query%",
  },
];

/**
 * The original Vue page always rendered the midnight sky + stars (its clock
 * was zeroed to 00:00). Flip this to `true` to make the background follow the
 * visitor's local hour, using the 24 gradients in start.css.
 */
const FOLLOW_LOCAL_TIME = false;

const isMacPlatform = () => /Mac|iPhone|iPod|iPad/i.test(navigator.platform);

function Background() {
  const [hour, setHour] = useState(0);

  useEffect(() => {
    if (!FOLLOW_LOCAL_TIME) return;
    const tick = () => setHour(new Date().getHours());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const night = hour >= 22 || hour <= 5;
  return (
    <div>
      <div className={`hour-${hour} absolute inset-0`} />
      {night && <Stars />}
    </div>
  );
}

export function StartPage() {
  const [current, setCurrent] = useState(0);
  const [query, setQuery] = useState("");
  const [isMac, setIsMac] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setIsMac(isMacPlatform()), []);

  // ⌃C (mac) / Alt+C clears the input. Neither is a browser shortcut.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyC" && (isMacPlatform() ? e.ctrlKey : e.altKey)) {
        setQuery("");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Tab / Shift+Tab in the search box cycles engines. (⌘/Ctrl+number would
  // collide with the browser's "switch to tab N".)
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const step = e.shiftKey ? -1 : 1;
    setCurrent((c) => (c + step + engines.length) % engines.length);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [current]);

  const engine = engines[current]!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = query
      ? engine.search.replace("%query%", encodeURIComponent(query))
      : engine.base;
  };

  return (
    <main>
      <Background />

      <div className="engines relative z-10 flex items-center h-[200px] px-10 snap-x overflow-x-auto justify-start sm:justify-center">
        {engines.map((e, idx) => (
          <img
            key={e.name}
            src={e.src}
            alt={`${e.name} Logo`}
            className={`snap-center h-auto cursor-pointer ${idx === current ? "engine-active" : ""}`}
            onClick={() => setCurrent(idx)}
          />
        ))}
      </div>

      <div id="container" className="z-10">
        <form onSubmit={submit}>
          <div id="input">
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={`Search ${engine.name}`}
              autoComplete="off"
              aria-label={`Search ${engine.name}`}
              className="text-4xl sm:text-6xl"
            />
          </div>
        </form>
      </div>

      <InstructionsTooltip isMac={isMac} />
    </main>
  );
}

function InstructionsTooltip({ isMac }: { isMac: boolean }) {
  const [open, setOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    try {
      setFirstVisit(!localStorage.getItem("firstTimeHere"));
    } catch {
      // storage blocked, just skip the bounce hint
    }
  }, []);

  const show = () => {
    if (firstVisit) {
      setFirstVisit(false);
      try {
        localStorage.setItem("firstTimeHere", "true");
      } catch {}
    }
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <div className="absolute z-50 right-5 bottom-5">
      <button
        type="button"
        aria-label="Site instructions"
        className={firstVisit ? "animate-bounce" : ""}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 text-white drop-shadow-sm"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 p-4 prose origin-bottom-right bg-white rounded-lg shadow-lg bottom-16 w-80">
          <h3>Site Instructions</h3>
          <h4>Shortcuts</h4>
          <ul>
            <li>
              <code>Tab</code> / <code>Shift+Tab</code> to switch between engines
            </li>
            <li>
              <code>{isMac ? "⌃" : "Alt+"}C</code> to clear the search input
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
