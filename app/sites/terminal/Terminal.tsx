import { useCallback, useEffect, useRef, useState } from "react";
import type { Repo } from "~/lib/github.server";
import { commands, notFound, type CommandContext } from "./commands";
import { Line, type OutputLine } from "./output";

/** Delay between printed lines, gives the "typing out" effect. */
const LINE_DELAY_MS = 50;

type Printed = { id: number; line: OutputLine };

export function Terminal({ repos }: { repos: Repo[] }) {
  const [ready, setReady] = useState(false);
  const [printed, setPrinted] = useState<Printed[]>([]);
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState(0);
  const [lineHidden, setLineHidden] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const pending = useRef(0);
  const history = useRef<{ entries: string[]; index: number; draft: string }>({
    entries: [],
    index: 0,
    draft: "",
  });

  // Output queue: each write is printed LINE_DELAY_MS after the previous one.
  const write = useCallback((line: OutputLine) => {
    pending.current++;
    setTimeout(() => {
      pending.current--;
      setPrinted((prev) => [...prev, { id: nextId.current++, line }]);
    }, LINE_DELAY_MS * pending.current);
  }, []);

  const ctx: CommandContext = {
    write,
    clear: () => setPrinted([]),
    repos,
  };
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const run = useCallback((raw: string) => {
    const [name = "", ...args] = raw.split(/\s+/);
    setLineHidden(true);
    const command = commands[name];
    if (command) {
      command.run(args, ctxRef.current);
    } else {
      ctxRef.current.write(notFound(name));
    }
  }, []);

  // Hide the prompt while output is streaming, then scroll to the bottom.
  useEffect(() => {
    setLineHidden(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
    const timer = setTimeout(() => {
      setLineHidden(false);
      requestAnimationFrame(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
      );
    }, LINE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [printed]);

  // Boot: show the banner once the page is interactive (once, even under StrictMode).
  const booted = useRef(false);
  useEffect(() => {
    setReady(true);
    if (booted.current) return;
    booted.current = true;
    run("banner");
  }, [run]);

  const restartBlink = () => {
    cursorRef.current?.getAnimations().forEach((a) => {
      a.cancel();
      a.play();
    });
  };

  // Keyboard handling lives on window: the whole page is the terminal.
  const state = useRef({ input, cursor });
  state.current = { input, cursor };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { input, cursor } = state.current;
      const h = history.current;

      switch (e.key) {
        case "Enter": {
          const command = input.trim().toLowerCase();
          if (!command) return;
          e.preventDefault();
          h.entries.push(input.trim());
          h.index = h.entries.length;
          h.draft = "";
          setInput("");
          setCursor(0);
          run(command);
          return;
        }
        case "ArrowUp":
        case "ArrowDown": {
          e.preventDefault();
          if (e.key === "ArrowUp") {
            if (h.index === h.entries.length) h.draft = input;
            h.index = Math.max(0, h.index - 1);
          } else if (h.index < h.entries.length) {
            h.index++;
          }
          const next = h.entries[h.index] ?? h.draft;
          setInput(next);
          setCursor(next.length);
          return;
        }
        case "ArrowLeft":
          e.preventDefault();
          setCursor(Math.max(0, cursor - 1));
          return;
        case "ArrowRight":
          e.preventDefault();
          setCursor(Math.min(input.length, cursor + 1));
          return;
        case "Backspace":
          e.preventDefault();
          if (cursor === 0) return;
          setInput(input.slice(0, cursor - 1) + input.slice(cursor));
          setCursor(cursor - 1);
          h.index = h.entries.length;
          restartBlink();
          return;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setInput(input.slice(0, cursor) + e.key + input.slice(cursor));
            setCursor(cursor + 1);
            h.index = h.entries.length;
            restartBlink();
          }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run]);

  return (
    <>
      {!ready && (
        <div id="loader">
          Loading <span className="loader"></span>
        </div>
      )}
      <div id="app" className={ready ? undefined : "loading"}>
        <div id="terminal">
          {printed.map((p) => (
            <Line key={p.id} line={p.line} />
          ))}
        </div>
        <div id="line" hidden={lineHidden}>
          <span>visitor@eptic.ro:~$</span>
          <div id="command-input" className="command-text">
            {input}
          </div>
          <div
            id="cursor"
            ref={cursorRef}
            style={{ transform: `translateX(-${input.length - cursor}ch)` }}
          />
        </div>
      </div>
    </>
  );
}
