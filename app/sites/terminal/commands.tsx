import type { Repo } from "~/lib/github.server";
import { detectOs, type LatestRelease } from "~/lib/reelhouse";
import { banner } from "./banner";
import { A, br, C, text, type OutputLine } from "./output";

export const TERMINAL = {
  version: "v0.0.3",
  name: "EPTIC Terminal",
};

export type CommandContext = {
  write: (line: OutputLine) => void;
  clear: () => void;
  repos: Repo[];
};

type Command = {
  description: string;
  run: (args: string[], ctx: CommandContext) => void;
};

const noArgs = (name: string, args: string[], ctx: CommandContext) => {
  if (args.length === 0) return true;
  ctx.write(text(`Command '${name}' doesn't take any arguments.`, { color: "error" }));
  return false;
};

const helpHint = (
  <>
    For a list of commands type <C color="highlight">'help'</C>.
  </>
);

export const notFound = (name: string) =>
  text(
    <>
      Command not found '{name}'. {helpHint}
    </>,
    { color: "error" },
  );

const socials = [
  { name: "github", url: "https://github.com/wizzymore", label: "github.com/wizzymore" },
  {
    name: "github ORG",
    url: "https://github.com/EPTIC-Solutions",
    label: "github.com/EPTIC-Solutions",
  },
  { name: "npm", url: "https://npmjs.com/~wizzymore", label: "npmjs/~wizzymore" },
  { name: "npm - eptic", url: "https://npmjs.com/~eptic", label: "npmjs/~eptic" },
  {
    name: "packagist - eptic",
    url: "https://packagist.org/packages/eptic/",
    label: "packagist/eptic",
  },
  {
    name: "Linkedin",
    url: "https://www.linkedin.com/in/cristian-bilu/",
    label: "linkedin/cristian-bilu",
  },
];

/** releases.eptic.ro in production; the same origin in development. */
const releasesOrigin = () =>
  location.hostname.endsWith("eptic.ro") ? "https://releases.eptic.ro" : "";

async function latestReelhouse(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(`${releasesOrigin()}/reelhouse/latest.json`);
    const data = (await res.json()) as Partial<LatestRelease>;
    return res.ok && data.version ? (data as LatestRelease) : null;
  } catch {
    return null;
  }
}

/** Apple Silicon or Intel, when the browser lets us tell. */
async function macArch(): Promise<"arm64" | "intel" | null> {
  const uaData = (
    navigator as {
      userAgentData?: {
        getHighEntropyValues?: (h: string[]) => Promise<{ architecture?: string }>;
      };
    }
  ).userAgentData;
  try {
    const { architecture } = (await uaData?.getHighEntropyValues?.(["architecture"])) ?? {};
    if (architecture === "arm") return "arm64";
    if (architecture === "x86") return "intel";
  } catch {}
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/Apple M\d/.test(renderer)) return "arm64";
    if (/Intel|AMD|Radeon/.test(renderer)) return "intel";
  } catch {}
  return null;
}

/** Start a download without leaving the page (the file is sent as an attachment). */
function startDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const PRODUCTS = {
  reelhouse: {
    label: "Reelhouse",
    what: "the Reelhouse app",
    after: "Install it and open it: it finds your Reelhouse server on the network.",
  },
  "reelhouse-server": {
    label: "Reelhouse Server",
    what: "the Reelhouse media server",
    after: "Open it and it runs in the menu bar / system tray. It updates itself.",
  },
} as const;

async function downloadReelhouse(name: keyof typeof PRODUCTS, ctx: CommandContext) {
  const product = PRODUCTS[name];
  const os = detectOs(navigator);
  if (os.kind === "mobile") {
    ctx.write(
      text(`${product.label} is for computers (macOS and Windows); it isn't available on mobile.`, {
        color: "error",
      }),
    );
    return;
  }
  if (os.kind === "linux") {
    ctx.write(
      text(`${product.label} isn't available for Linux yet, only macOS and Windows.`, {
        color: "error",
      }),
    );
    return;
  }
  if (os.kind === "other") {
    ctx.write(
      text(`Couldn't tell which OS this is. ${product.label} is available for macOS and Windows.`, {
        color: "error",
      }),
    );
    return;
  }

  ctx.write(text("Looking up the latest version…", { color: "secondary" }));
  const release = await latestReelhouse();
  if (!release) {
    ctx.write(
      text("Couldn't reach the release server, or nothing is published yet. Try again later.", {
        color: "error",
      }),
    );
    return;
  }

  // The file for this computer, plus the other choices worth showing.
  let url: string | undefined;
  let platform: string;
  const others: { label: string; url?: string }[] = [];
  if (name === "reelhouse") {
    platform = os.kind === "macos" ? "macOS" : "Windows";
    url = os.kind === "macos" ? release.downloads.app.macos : release.downloads.app.windows;
  } else if (os.kind === "windows") {
    platform = "Windows";
    url = release.downloads.server["windows-x64"];
  } else {
    const arch = await macArch();
    const intel = arch === "intel";
    platform = intel ? "macOS (Intel)" : "macOS (Apple Silicon)";
    url = intel ? release.downloads.server["macos-intel"] : release.downloads.server["macos-arm64"];
    others.push(
      intel
        ? { label: "Apple Silicon Mac?", url: release.downloads.server["macos-arm64"] }
        : { label: "Intel Mac?", url: release.downloads.server["macos-intel"] },
    );
  }

  if (!url) {
    ctx.write(
      text(`${product.label} v${release.version} has no ${platform} package yet.`, {
        color: "error",
      }),
    );
    return;
  }

  ctx.write(br());
  ctx.write(
    text(
      <>
        Downloading {product.what} <C color="highlight">v{release.version}</C> for {platform}…
      </>,
    ),
  );
  startDownload(url);
  ctx.write(
    text(
      <>
        If it doesn't start,{" "}
        <A href={url} color="highlight">
          click here
        </A>
        .
      </>,
      { color: "secondary", offset: 2 },
    ),
  );
  for (const o of others) {
    if (o.url) {
      ctx.write(
        text(
          <>
            {o.label}{" "}
            <A href={o.url} color="highlight">
              Download that one instead
            </A>
            .
          </>,
          { color: "secondary", offset: 2 },
        ),
      );
    }
  }
  ctx.write(text(product.after, { color: "secondary", offset: 2 }));
}

export const commands: Record<string, Command> = {
  banner: {
    description: "Display the header.",
    run(args, ctx) {
      if (!noArgs("banner", args, ctx)) return;
      if (window.innerWidth >= 1024) {
        for (const row of banner) ctx.write(text(row, { wide: true }));
      }
      ctx.write(text("EPTIC (c) All rights reserved."));
      ctx.write(text("Welcome to EPTIC.", { color: "secondary" }));
      ctx.write(
        text(
          <>
            For a list of available commands, type <C color="highlight">'help'</C>.
          </>,
          { color: "secondary" },
        ),
      );
    },
  },

  clear: {
    description: "Clear the terminal.",
    run(args, ctx) {
      if (!noArgs("clear", args, ctx)) return;
      ctx.clear();
    },
  },

  help: {
    description: "I guess you know what this does now.",
    run(args, ctx) {
      if (args.length > 1) {
        ctx.write(text("Syntax: help <command> - for more information about a specific command."));
        return;
      }

      if (args.length === 1) {
        const name = args[0]!;
        const command = commands[name];
        if (!command) {
          ctx.write(notFound(name));
          return;
        }
        ctx.write(text("Usage:"));
        ctx.write(text(`  ${command.description}`));
        ctx.write(text(`  ${name}${name === "help" ? " <command>" : ""}`));
        return;
      }

      ctx.write(br());
      ctx.write(text(`${TERMINAL.name} - ${TERMINAL.version}`));
      ctx.write(br());
      for (const name of Object.keys(commands).sort()) {
        ctx.write(text(name, { status: commands[name]!.description, statusColor: "highlight" }));
      }
      ctx.write(br());
    },
  },

  reelhouse: {
    description: "Download the Reelhouse app for this computer.",
    run(args, ctx) {
      if (!noArgs("reelhouse", args, ctx)) return;
      void downloadReelhouse("reelhouse", ctx);
    },
  },

  "reelhouse-server": {
    description: "Download the Reelhouse media server for this computer.",
    run(args, ctx) {
      if (!noArgs("reelhouse-server", args, ctx)) return;
      void downloadReelhouse("reelhouse-server", ctx);
    },
  },

  repos: {
    description: "What we work on.",
    run(args, ctx) {
      if (!noArgs("repos", args, ctx)) return;

      ctx.write(br());
      ctx.write(text("EPTIC repositories:"));
      ctx.write(br());

      if (ctx.repos.length === 0) {
        ctx.write(
          text("Couldn't load repositories right now, try again later.", {
            color: "error",
            offset: 2,
          }),
        );
        return;
      }

      const offset = 2;
      for (const repo of ctx.repos) {
        const description =
          repo.full_name === "EPTIC-Solutions/eptic-web"
            ? "The website you are currently on."
            : repo.description;

        // Pinned repos (listed first) get a ★ in the indent, so names stay aligned.
        ctx.write(
          text(
            <>
              {repo.pinned && <C color="secondary">★ </C>}
              <A href={repo.html_url} color="highlight">
                {repo.full_name}
              </A>
            </>,
            {
              offset: repo.pinned ? offset - 2 : offset,
              status: repo.language ?? undefined,
              statusColor: "secondary",
            },
          ),
        );
        if (description) {
          ctx.write(
            text(
              <>
                <C color="secondary">- </C>
                {description}
              </>,
              { offset: offset + 1 },
            ),
          );
        }
      }
    },
  },

  social: {
    description: "Show the social links.",
    run(args, ctx) {
      if (!noArgs("social", args, ctx)) return;

      ctx.write(br());
      ctx.write(text("EPTIC Online"));
      ctx.write(br());
      for (const social of socials) {
        ctx.write(
          text(social.name, {
            status: (
              <A href={social.url} color="highlight">
                {social.label}
              </A>
            ),
          }),
        );
      }
    },
  },
};
