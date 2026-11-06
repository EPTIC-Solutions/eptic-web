import type { ReactNode } from "react";

export type Color = "default" | "error" | "highlight" | "secondary";

/** One printed row of the terminal. */
export type OutputLine =
  | { kind: "break" }
  | {
      kind: "text";
      text: ReactNode;
      color?: Color;
      status?: ReactNode;
      statusColor?: Color;
      /** Left indent, in characters. */
      offset?: number;
      /** Allow the line to exceed the normal max width (used by the ASCII banner). */
      wide?: boolean;
    };

export const text = (
  value: ReactNode,
  opts: Omit<Extract<OutputLine, { kind: "text" }>, "kind" | "text"> = {},
): OutputLine => ({ kind: "text", text: value, ...opts });

export const br = (): OutputLine => ({ kind: "break" });

export function C({ color, children }: { color: Color; children: ReactNode }) {
  return <span className={`color-${color}`}>{children}</span>;
}

export function A({
  href,
  color = "default",
  children,
}: {
  href: string;
  color?: Color;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`color-${color}`}>
      {children}
    </a>
  );
}

export function Line({ line }: { line: OutputLine }) {
  if (line.kind === "break") {
    return (
      <div className="command-container">
        <br />
      </div>
    );
  }

  const classes = ["command-line-text", `color-${line.color ?? "default"}`];
  if (line.wide) classes.push("wide");

  return (
    <div className="command-container">
      <span
        className={classes.join(" ")}
        style={line.offset ? { marginLeft: `${line.offset}ch` } : undefined}
      >
        {line.text}
      </span>
      {line.status != null && (
        <span className={`command-line-status color-${line.statusColor ?? "highlight"}`}>
          {line.status}
        </span>
      )}
    </div>
  );
}
