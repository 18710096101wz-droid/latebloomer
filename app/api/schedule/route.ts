import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { isAuthenticated } from "@/lib/auth";
import { schedulePostWorkflow } from "@/workflows/schedule-post";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      text?: string;
      scheduledAt?: string;
    };

    const text = body.text?.trim();
    const scheduledAt = body.scheduledAt;

    if (!text) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }
    if (!scheduledAt) {
      return NextResponse.json({ error: "请选择发布时间" }, { status: 400 });
    }

    const target = new Date(scheduledAt);
    if (Number.isNaN(target.getTime())) {
      return NextResponse.json({ error: "发布时间无效" }, { status: 400 });
    }

    const delaySeconds = Math.max(
      0,
      Math.ceil((target.getTime() - Date.now()) / 1000),
    );

    const run = await start(schedulePostWorkflow, [
      {
        text,
        delaySeconds,
        scheduledAt: target.toISOString(),
      },
    ]);

    console.log("[XQueue scheduled]", {
      runId: run.runId,
      scheduledAt: target.toISOString(),
      length: text.length,
    });

    return NextResponse.json({
      ok: true,
      runId: run.runId,
      scheduledAt: target.toISOString(),
    });
  } catch (error) {
    console.error("[XQueue schedule error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建计划失败" },
      { status: 500 },
    );
  }
}
