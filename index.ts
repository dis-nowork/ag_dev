/**
 * AG Dev — Clawdbot Plugin Entry Point
 * 
 * Registers AG Dev as a Clawdbot extension:
 * - Starts the Express command center UI
 * - Provides lifecycle hooks for agent monitoring
 * - Injects strategy directives into agent prompts
 * - Registers CLI command `clawdbot dev`
 */

import { Type } from "@sinclair/typebox";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AgDevConfig {
  enabled: boolean;
  port: number;
  projectRoot: string;
  agents: {
    definitionsDir: string;
    autoSpawn: boolean;
    defaultModel?: string;
  };
  ui: {
    theme: string;
  };
}

const configSchema = {
  parse(value: unknown): AgDevConfig {
    const raw = (value && typeof value === "object" ? value : {}) as Record<string, any>;
    return {
      enabled: raw.enabled !== false,
      port: raw.port || 3000,
      projectRoot: raw.projectRoot || process.cwd(),
      agents: {
        definitionsDir: raw.agents?.definitionsDir || "./core/agents",
        autoSpawn: raw.agents?.autoSpawn || false,
        defaultModel: raw.agents?.defaultModel,
      },
      ui: {
        theme: raw.ui?.theme || "dark",
      },
    };
  },
};

const AgDevStatusSchema = Type.Object({
  action: Type.Literal("status"),
});

const agDevPlugin = {
  id: "ag-dev",
  name: "AG Dev — Multi-Agent Command Center",
  description: "Visual command center for orchestrating multi-agent development workflows with Clawdbot",
  configSchema,

  register(api: any) {
    const cfg = configSchema.parse(api.pluginConfig);
    if (!cfg.enabled) return;

    let serverProcess: ChildProcess | null = null;
    const serverPath = path.join(__dirname, "server", "server.js");
    const configPath = path.join(__dirname, "config.json");

    // Load strategy for directive injection
    const strategyPath = path.join(__dirname, "server", "strategy.json");
    function loadStrategy(): any {
      try {
        if (fs.existsSync(strategyPath)) {
          return JSON.parse(fs.readFileSync(strategyPath, "utf8"));
        }
      } catch {}
      return { vision: "", guardrails: "", directives: {} };
    }

    // ─── Register CLI command ───
    if (api.registerCommand) {
      api.registerCommand({
        name: "dev",
        description: "Open AG Dev command center in browser",
        run: async () => {
          const url = `http://localhost:${cfg.port}`;
          api.logger.info(`[ag-dev] Opening ${url}`);
          const { exec } = await import("child_process");
          // Cross-platform open
          const cmd = process.platform === "darwin" ? "open" :
                      process.platform === "win32" ? "start" : "xdg-open";
          exec(`${cmd} ${url}`);
        },
      });
    }

    // ─── Register agent tool ───
    api.registerTool({
      name: "ag_dev_status",
      description: "Get AG Dev command center status: active agents, project info, workflow state",
      schema: AgDevStatusSchema,
      run: async () => {
        try {
          const res = await fetch(`http://localhost:${cfg.port}/api/state`);
          const data = await res.json();
          return JSON.stringify(data, null, 2);
        } catch (e) {
          return `AG Dev server not running on port ${cfg.port}`;
        }
      },
    });

    // ─── Lifecycle hooks ───

    // Inject strategy directives into agent system prompts
    if (api.hook) {
      api.hook("before_agent_start", async (ctx: any) => {
        const strategy = loadStrategy();
        if (!strategy.directives && !strategy.guardrails && !strategy.vision) return;

        const sessionKey = ctx.sessionKey || "";
        // Find matching agent directive
        const agentId = Object.keys(strategy.directives || {}).find(id =>
          sessionKey.includes(id)
        );

        const parts: string[] = [];
        if (strategy.vision) {
          parts.push(`## Project Vision\n${strategy.vision}`);
        }
        if (agentId && strategy.directives[agentId]?.text) {
          parts.push(`## Your Directive\n${strategy.directives[agentId].text}`);
        }
        if (strategy.guardrails) {
          parts.push(`## Guardrails\n${strategy.guardrails}`);
        }

        if (parts.length > 0 && ctx.systemPrompt) {
          ctx.systemPrompt += "\n\n---\n# AG Dev Strategy\n" + parts.join("\n\n");
        }
      });

      api.hook("agent_end", async (ctx: any) => {
        // Notify AG Dev server that an agent session completed
        try {
          const sessionKey = ctx.sessionKey || "";
          await fetch(`http://localhost:${cfg.port}/api/chat/bot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `Agent session completed: ${sessionKey}`,
            }),
          });
        } catch {}
      });
    }

    // ─── Start/Stop server ───
    api.registerService({
      start: async () => {
        if (!cfg.enabled) return;

        // Update config.json with plugin settings
        try {
          const existingConfig = fs.existsSync(configPath)
            ? JSON.parse(fs.readFileSync(configPath, "utf8"))
            : {};
          const merged = {
            ...existingConfig,
            port: cfg.port,
            projectRoot: cfg.projectRoot,
            gateway: {
              url: `ws://127.0.0.1:${(api.config as any)?.gateway?.port || 18789}`,
              token: (api.config as any)?.gateway?.auth?.token || "",
            },
          };
          fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
        } catch {}

        // Start Express server as child process
        serverProcess = spawn("node", [serverPath], {
          cwd: __dirname,
          env: { ...process.env, PORT: String(cfg.port) },
          stdio: "pipe",
        });

        serverProcess.stdout?.on("data", (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) api.logger.info(`[ag-dev] ${msg}`);
        });

        serverProcess.stderr?.on("data", (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) api.logger.error(`[ag-dev] ${msg}`);
        });

        serverProcess.on("exit", (code: number | null) => {
          if (code !== 0 && code !== null) {
            api.logger.warn(`[ag-dev] Server exited with code ${code}`);
          }
          serverProcess = null;
        });

        api.logger.info(`[ag-dev] Command Center starting on port ${cfg.port}`);
      },

      stop: async () => {
        if (serverProcess) {
          serverProcess.kill("SIGTERM");
          // Give it 3s to shutdown gracefully
          await new Promise((resolve) => {
            const timer = setTimeout(() => {
              if (serverProcess) serverProcess.kill("SIGKILL");
              resolve(undefined);
            }, 3000);
            serverProcess?.on("exit", () => {
              clearTimeout(timer);
              resolve(undefined);
            });
          });
          serverProcess = null;
          api.logger.info("[ag-dev] Server stopped");
        }
      },
    });
  },
};

export default agDevPlugin;
