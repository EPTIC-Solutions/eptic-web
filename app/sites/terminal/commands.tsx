import type { Repo } from "~/lib/github.server";
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
        const description = repo.full_name.includes("/eptic.ro")
          ? "The website you are currently on."
          : repo.description;

        ctx.write(
          text(
            <A href={repo.html_url} color="highlight">
              {repo.full_name}
            </A>,
            {
              offset,
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
