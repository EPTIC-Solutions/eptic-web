import { describe, expect, test } from "vite-plus/test";
import { DOWNLOADS, UPDATES, detectOs, findAsset, isNewer, parseChecksums } from "./reelhouse";

// File names exactly as wizzymore/reelhouse's package.yml produces them.
const assets = [
  "Reelhouse_0.2.0-macos-universal.dmg",
  "Reelhouse_0.2.0-macos-universal.app.tar.gz",
  "Reelhouse_0.2.0-macos-universal.app.tar.gz.sig",
  "Reelhouse_0.2.0_x64-setup.exe",
  "Reelhouse_0.2.0_x64-setup.exe.sig",
  "Reelhouse_0.2.0_x64_en-US.msi",
  "Reelhouse_0.2.0_x64_en-US.msi.sig",
  "Reelhouse-Server-0.2.0-macos-arm64.dmg",
  "Reelhouse-Server-0.2.0-macos-arm64.app.tar.gz",
  "reelhouse-server-0.2.0-macos-arm64.tar.gz",
  "Reelhouse-Server-0.2.0-macos-intel.dmg",
  "Reelhouse-Server-0.2.0-macos-intel.app.tar.gz",
  "reelhouse-server-0.2.0-macos-intel.tar.gz",
  "reelhouse-server-0.2.0-windows-x64.zip",
  "Reelhouse-Server-0.2.0-windows-x64-setup.exe",
  "SHA256SUMS",
].map((name) => ({ name, size: 1 }));

describe("asset matching", () => {
  test("every download and update finds exactly one file", () => {
    const tables = [DOWNLOADS.app, DOWNLOADS.server, UPDATES.app, UPDATES.server];
    for (const table of tables) {
      for (const [key, pattern] of Object.entries<RegExp>(table)) {
        const matches = assets.filter((a) => pattern.test(a.name));
        expect(
          matches.map((a) => a.name),
          key,
        ).toHaveLength(1);
      }
    }
  });

  test("the right file for each", () => {
    expect(findAsset(assets, DOWNLOADS.app.macos)?.name).toBe(
      "Reelhouse_0.2.0-macos-universal.dmg",
    );
    expect(findAsset(assets, UPDATES.app["darwin-app"])?.name).toBe(
      "Reelhouse_0.2.0-macos-universal.app.tar.gz",
    );
    expect(findAsset(assets, UPDATES.server["macos-intel-cli"])?.name).toBe(
      "reelhouse-server-0.2.0-macos-intel.tar.gz",
    );
    expect(findAsset(assets, UPDATES.server["macos-arm64-app"])?.name).toBe(
      "Reelhouse-Server-0.2.0-macos-arm64.app.tar.gz",
    );
    // Windows: people download the installer; installs update from the zip.
    expect(findAsset(assets, DOWNLOADS.server["windows-x64"])?.name).toBe(
      "Reelhouse-Server-0.2.0-windows-x64-setup.exe",
    );
    expect(findAsset(assets, UPDATES.server["windows-x64-cli"])?.name).toBe(
      "reelhouse-server-0.2.0-windows-x64.zip",
    );
  });
});

test("version ordering", () => {
  expect(isNewer("0.2.0", "0.1.9")).toBe(true);
  expect(isNewer("v1.0.0", "0.9.0")).toBe(true);
  expect(isNewer("1.0.0", "1.0.0-beta.2")).toBe(true);
  expect(isNewer("0.1.0", "0.1.0")).toBe(false);
  expect(isNewer("0.1.0", "0.2.0")).toBe(false);
  expect(isNewer("nonsense", "0.1.0")).toBe(false);
});

test("checksums", () => {
  const sums = parseChecksums(
    `${"a".repeat(64)}  reelhouse-server-0.2.0-windows-x64.zip\n${"B".repeat(64)} *SHA256SUMS\n`,
  );
  expect(sums.get("reelhouse-server-0.2.0-windows-x64.zip")).toBe("a".repeat(64));
  expect(sums.get("SHA256SUMS")).toBe("b".repeat(64));
});

describe("OS detection", () => {
  const os = (userAgent: string, extra: object = {}) => detectOs({ userAgent, ...extra }).kind;
  test("desktop", () => {
    expect(
      os("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"),
    ).toBe("macos");
    expect(os("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36")).toBe(
      "windows",
    );
    expect(os("Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/140.0")).toBe("linux");
  });
  test("mobile", () => {
    expect(os("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148")).toBe(
      "mobile",
    );
    expect(os("Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140.0 Mobile Safari/537.36")).toBe(
      "mobile",
    );
    // iPadOS pretends to be a Mac, but has touch.
    expect(
      os("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15", {
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe("mobile");
    expect(os("anything", { userAgentData: { mobile: true, platform: "Android" } })).toBe("mobile");
  });
});
