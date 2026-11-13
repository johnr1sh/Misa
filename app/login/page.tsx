"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="brand-mark">c<span>.</span></div>
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>Good to have you back.</h1>
        <p className="muted login-copy">Your projects and thoughts, in one place.</p>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="password">Workspace password</label>
          <input id="password" type="password" autoComplete="current-password"
            placeholder="Enter your password" value={password}
            onChange={(event) => setPassword(event.target.value)} required autoFocus />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy || !password}>
            {busy ? "Checking…" : "Continue"} <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p className="login-foot">Private by design · Powered by Mistral</p>
      </div>
    </main>
  );
}