/**
 * Reelhouse releases: which file of a GitHub release serves which download
 * or update. Pure functions, shared by the Worker (workers/reelhouse.ts) and
 * the terminal commands; the release files are named by
 * wizzymore/reelhouse's .github/workflows/package.yml.
 */

/** Packages people download (terminal commands, latest.json). */
export const DOWNLOADS = {
  app: {
    macos: /^Reelhouse_.+-macos-universal\.dmg$/,
    windows: /^Reelhouse_.+_x64-setup\.exe$/,
  },
  server: {
    "macos-arm64": /^Reelhouse-Server-.+-macos-arm64\.dmg$/,
    "macos-intel": /^Reelhouse-Server-.+-macos-intel\.dmg$/,
    // The installer (since 0.1.2); the .zip stays the self-update package.
    "windows-x64": /^Reelhouse-Server-.+-windows-x64-setup\.exe$/,
  },
} as const;

/** Packages the apps update themselves from. */
export const UPDATES = {
  /** Desktop app (Tauri updater): `<target>-<bundle type>`. */
  app: {
    "darwin-app": /^Reelhouse_.+-macos-universal\.app\.tar\.gz$/,
    "windows-nsis": /^Reelhouse_.+_x64-setup\.exe$/,
    "windows-msi": /^Reelhouse_.+_x64_en-US\.msi$/,
  },
  /** Server: `<platform>-<install kind>`. */
  server: {
    "macos-arm64-app": /^Reelhouse-Server-.+-macos-arm64\.app\.tar\.gz$/,
    "macos-arm64-cli": /^reelhouse-server-.+-macos-arm64\.tar\.gz$/,
    "macos-intel-app": /^Reelhouse-Server-.+-macos-intel\.app\.tar\.gz$/,
    "macos-intel-cli": /^reelhouse-server-.+-macos-intel\.tar\.gz$/,
    "windows-x64-cli": /^reelhouse-server-.+-windows-x64\.zip$/,
  },
} as const;

export type DownloadProduct = keyof typeof DOWNLOADS;
export type AppPlatform = keyof typeof DOWNLOADS.app;
export type ServerPlatform = keyof typeof DOWNLOADS.server;

export type Asset = { name: string; size: number };

/** The release summary served at releases.eptic.ro/reelhouse/latest.json. */
export type LatestRelease = {
  version: string;
  notes: string | null;
  pub_date: string | null;
  downloads: {
    app: Partial<Record<AppPlatform, string>>;
    server: Partial<Record<ServerPlatform, string>>;
  };
};

export function findAsset<A extends Asset>(assets: A[], pattern: RegExp): A | undefined {
  return assets.find((a) => pattern.test(a.name));
}

/** `v1.2.3-beta.1` → comparable parts; pre-releases sort before their release. */
function parseVersion(v: string): [number, number, number, string | null] | null {
  const m = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0), m[4] ?? null];
}

export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i]! !== b[i]!) return a[i]! > b[i]!;
  }
  if (a[3] === null) return b[3] !== null;
  return b[3] !== null && a[3] > b[3];
}

/** `abc123  file.zip` lines (sha256sum output) → file name → hash. */
export function parseChecksums(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split("\n")) {
    const m = /^([0-9a-f]{64})\s+\*?(.+)$/i.exec(line.trim());
    if (m) out.set(m[2]!, m[1]!.toLowerCase());
  }
  return out;
}

/** What the visitor's browser runs on, for picking a download. */
export type ClientOs =
  | { kind: "mobile" }
  | { kind: "linux" }
  | { kind: "other" }
  | { kind: "windows" }
  | { kind: "macos"; arch: "arm64" | "intel" | null };

type NavigatorLike = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  userAgentData?: { mobile?: boolean; platform?: string };
};

/** Synchronous best guess; the Mac architecture needs `detectMacArch`. */
export function detectOs(nav: NavigatorLike): ClientOs {
  const ua = nav.userAgent;
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  // iPadOS reports itself as a Mac; touch gives it away.
  const iPad = /Mac/.test(platform + ua) && (nav.maxTouchPoints ?? 0) > 1;
  if (
    nav.userAgentData?.mobile ||
    iPad ||
    /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua)
  ) {
    return { kind: "mobile" };
  }
  if (/Win/i.test(platform) || /Windows/.test(ua)) return { kind: "windows" };
  if (/Mac/i.test(platform) || /Macintosh|Mac OS X/.test(ua)) return { kind: "macos", arch: null };
  if (/Linux|X11|CrOS/i.test(platform + ua)) return { kind: "linux" };
  return { kind: "other" };
}
