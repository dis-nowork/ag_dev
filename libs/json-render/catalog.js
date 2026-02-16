import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react";
import { z } from "zod";

/**
 * Claudio Workspace Catalog — Reusable components for dashboards, 
 * dispatch views, agent UIs, and general-purpose generative UI.
 */
export const catalog = defineCatalog(schema, {
  components: {
    // Layout
    Card: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        variant: z.enum(["default", "elevated", "outlined"]).optional(),
      }),
      description: "Container card with optional title and subtitle",
    },
    
    // Data Display
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        format: z.enum(["currency", "percent", "number", "duration", "raw"]).optional(),
        trend: z.enum(["up", "down", "neutral"]).optional(),
        trendValue: z.string().optional(),
      }),
      description: "Display a single metric with optional trend indicator",
    },
    
    Table: {
      props: z.object({
        columns: z.array(z.object({
          key: z.string(),
          label: z.string(),
          align: z.enum(["left", "center", "right"]).optional(),
        })),
        rows: z.array(z.record(z.string())),
        striped: z.boolean().optional(),
      }),
      description: "Data table with columns and rows",
    },
    
    // Status
    StatusBadge: {
      props: z.object({
        label: z.string(),
        status: z.enum(["success", "warning", "error", "info", "idle", "running"]),
        pulse: z.boolean().optional(),
      }),
      description: "Status indicator badge with color and optional pulse animation",
    },
    
    ProgressBar: {
      props: z.object({
        value: z.number().min(0).max(100),
        label: z.string().optional(),
        color: z.enum(["blue", "green", "amber", "red", "purple"]).optional(),
        showPercent: z.boolean().optional(),
      }),
      description: "Progress bar with percentage",
    },
    
    // Interactive
    Button: {
      props: z.object({
        label: z.string(),
        action: z.string(),
        variant: z.enum(["primary", "secondary", "danger", "ghost"]).optional(),
        icon: z.string().optional(),
      }),
      description: "Clickable action button",
    },
    
    // Feedback
    Alert: {
      props: z.object({
        message: z.string(),
        type: z.enum(["info", "success", "warning", "error"]),
        dismissible: z.boolean().optional(),
      }),
      description: "Alert/notification banner",
    },
    
    // Code
    CodeBlock: {
      props: z.object({
        code: z.string(),
        language: z.string().optional(),
        title: z.string().optional(),
      }),
      description: "Syntax-highlighted code block",
    },
    
    // AG Dev specific
    AgentCard: {
      props: z.object({
        name: z.string(),
        role: z.string(),
        status: z.enum(["idle", "running", "done", "error"]),
        task: z.string().optional(),
        branch: z.string().optional(),
        elapsed: z.string().optional(),
      }),
      description: "Agent status card showing name, role, current task and status",
    },
    
    TaskCard: {
      props: z.object({
        id: z.string(),
        title: z.string(),
        agent: z.string(),
        status: z.enum(["queued", "running", "done", "failed"]),
        branch: z.string().optional(),
        duration: z.string().optional(),
        output: z.string().optional(),
      }),
      description: "Task status card for dispatch monitoring",
    },
    
    // Timeline
    Timeline: {
      props: z.object({
        events: z.array(z.object({
          time: z.string(),
          label: z.string(),
          status: z.enum(["done", "active", "pending"]).optional(),
        })),
      }),
      description: "Vertical timeline of events",
    },
  },
  
  actions: {
    dispatch_task: { description: "Dispatch a new task to the multi-agent system" },
    cancel_task: { description: "Cancel a running task" },
    view_output: { description: "View task output details" },
    refresh_status: { description: "Refresh dispatch status" },
    export_report: { description: "Export run history as report" },
  },
});

export default catalog;
