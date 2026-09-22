"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type QueueItem = {
  id: string;
  runId: string;
  text: string;
  scheduledAt: string;
  createdAt: string;
};

const STORAGE_KEY = "xqueue_queue_v1";

function localDateTimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Scheduler({ mockMode }: { mockMode: boolean }) {
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    d.setSeconds(0, 0);
    setWhen(localDateTimeValue(d));

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setQueue(JSON.parse(raw));
    } catch {}
  }, []);

  function saveQueue(next: QueueItem[]) {
    setQueue(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const upcoming = useMemo(
    () => [...queue].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)),
    [queue],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!text.trim()) return setError("先写点内容。");
    if (!when) return setError("请选择发布时间。");

    const target = new Date(when);
    if (Number.isNaN(target.getTime())) return setError("发布时间无效。");

    setLoading(true);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, scheduledAt: target.toISOString() }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (!res.ok) {
      setError(data.error || "创建计划失败");
      return;
    }

    const item: QueueItem = {
      id: crypto.randomUUID(),
      runId: data.runId,
      text: text.trim(),
      scheduledAt: data.scheduledAt,
      createdAt: new Date().toISOString(),
    };
    saveQueue([...queue, item]);
    setText("");
    setMessage("已交给云端调度。现在关电脑、断网都不影响这条计划。");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function removeLocal(id: string) {
    saveQueue(queue.filter((x) => x.id !== id));
  }

  const now = Date.now();

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="logo">XQ</div>
          <div>
            <h1>XQueue</h1>
            <div className="sub">私人版 Buffer · 云端定时发 X</div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={logout}>退出</button>
      </div>

      <div className="grid">
        <section className="card">
          <h2>新建计划</h2>
          <div className="notice">
            <strong>离线有效：</strong> 保存后由 Vercel Workflow 在云端等待，到点直接调用 X API。你的电脑、浏览器和手机都可以关闭。
            {mockMode && <><br /><strong>当前是 MOCK 模式：</strong> 到点只记录日志，不会真的发 X。</>}
          </div>

          <form onSubmit={submit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="写你的帖子……"
            />
            <div className="meta">
              <span>{text.length} 字符</span>
              <span>不做应用内“每日次数”限制</span>
            </div>

            <div className="row">
              <div className="field">
                <label>发布时间（按你当前设备时区）</label>
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" disabled={loading || !text.trim() || !when}>
                {loading ? "正在排队…" : "定时发布"}
              </button>
            </div>
            {message && <div className="success">{message}</div>}
            {error && <div className="error">{error}</div>}
          </form>
        </section>

        <aside className="card">
          <h2>本机计划列表</h2>
          <div className="statline"><span>已保存</span><b>{queue.length}</b></div>
          <div className="statline"><span>执行位置</span><b>Vercel 云端</b></div>
          <div className="statline"><span>X 连接</span><b>{mockMode ? "Mock" : "Live"}</b></div>
          <div className="divider" />

          <div className="queue">
            {upcoming.length === 0 && <div className="empty">还没有计划。</div>}
            {upcoming.map((item) => {
              const passed = Date.parse(item.scheduledAt) <= now;
              return (
                <div className="item" key={item.id}>
                  <div className="itemText">{item.text}</div>
                  <div className="itemMeta">
                    <span>{new Date(item.scheduledAt).toLocaleString()}</span>
                    <span className="pill">{passed ? "已到执行时间" : "等待中"}</span>
                  </div>
                  <div className="itemMeta" style={{ marginTop: 8 }}>
                    <span title={item.runId}>run {item.runId.slice(0, 12)}…</span>
                    <button
                      type="button"
                      onClick={() => removeLocal(item.id)}
                      style={{ background: "none", border: 0, color: "#8e99a8", cursor: "pointer", padding: 0 }}
                    >
                      仅从列表隐藏
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="divider" />
          <div className="small">
            说明：当前版本的计划执行记录由 Vercel Workflow 持久化；右侧列表只是浏览器本地索引。清掉浏览器数据不会取消已经提交到云端的计划。
          </div>
        </aside>
      </div>
    </main>
  );
}
