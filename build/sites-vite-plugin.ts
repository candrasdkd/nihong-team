import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build, type Plugin } from "vite";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function sites(): Plugin {
  let root = process.cwd();
  let isBuild = false;

  return {
    name: "nihong-sites-output",
    enforce: "post",
    configResolved(config) {
      root = config.root;
      isBuild = config.command === "build";
    },
    async buildStart() {
      if (!isBuild) return;
      await rm(resolve(root, "dist"), { recursive: true, force: true });
    },
    async closeBundle() {
      if (!isBuild) return;
      const dist = resolve(root, "dist");
      const clientDirectory = resolve(dist, "client");
      const metadataDirectory = resolve(dist, ".openai");
      const hostingConfig = resolve(root, ".openai", "hosting.json");

      await rm(clientDirectory, { recursive: true, force: true });
      await mkdir(clientDirectory, { recursive: true });

      const entries = await readdir(dist, { withFileTypes: true });
      for (const entry of entries) {
        if (["client", "server", ".openai"].includes(entry.name)) continue;
        await cp(resolve(dist, entry.name), resolve(clientDirectory, entry.name), {
          recursive: entry.isDirectory(),
        });
      }

      await rm(metadataDirectory, { recursive: true, force: true });
      await mkdir(metadataDirectory, { recursive: true });
      await mkdir(resolve(dist, "server"), { recursive: true });
      await build({
        configFile: false,
        root,
        logLevel: "warn",
        build: {
          ssr: resolve(root, "server/worker.ts"),
          outDir: resolve(dist, "server"),
          emptyOutDir: false,
          target: "es2022",
          rollupOptions: { output: { entryFileNames: "index.js" } },
        },
      });

      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(metadataDirectory, "hosting.json"));
      }
    },
  };
}
