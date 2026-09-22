"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "登录失败");
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card loginCard">
      <div className="brand" style={{ marginBottom: 16 }}>
        <div className="logo">XQ</div>
        <div>
          <h1>XQueue</h1>
          <div className="sub">你自己的 X 定时发布器</div>
        </div>
      </div>
      <div className="sub">输入部署时设置的 APP_PASSWORD。这个页面只保护你的调度后台，不会把 X 密钥暴露给浏览器。</div>
      <div className="field">
        <label>后台密码</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <button className="btn btn-primary" disabled={loading || !password}>
        {loading ? "登录中…" : "进入后台"}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
