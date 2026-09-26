import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared realtime layer for every dashboard.
 *
 * Subscribes to postgres changes on the given tables and calls `onChange`.
 * Because realtime can silently drop (network sleep, tab throttling, RLS hiccups)
 * it also refreshes on tab focus / visibility / reconnect and polls on an
 * interval as a safety net, so data is never more than a few seconds stale.
 */

export type LiveTable =
  | string
  | {
      table: string;
      /** postgres filter, e.g. `candidate_id=eq.<uuid>` */
      filter?: string;
      event?: "*" | "INSERT" | "UPDATE" | "DELETE";
    };

// Keep the realtime socket authenticated with the current user's token so that
// RLS-protected tables actually emit change events to this client.
let authWired = false;
function wireRealtimeAuth() {
  if (authWired) return;
  authWired = true;
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.access_token) {
      try { supabase.realtime.setAuth(data.session.access_token); } catch { /* noop */ }
    }
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    try { supabase.realtime.setAuth(session?.access_token ?? null as any); } catch { /* noop */ }
  });
}

interface Options {
  /** Unique-ish channel key; defaults to the table list. */
  key?: string;
  /** Skip subscribing while false (e.g. waiting for an id). */
  enabled?: boolean;
  /** Fallback polling interval in ms. Set to 0 to disable. */
  pollMs?: number;
}

export function useLiveData(
  tables: LiveTable[],
  onChange: (payload?: any) => void,
  { key, enabled = true, pollMs = 15000 }: Options = {},
) {
  const cb = useRef(onChange);
  cb.current = onChange;

  const signature = tables
    .map((t) => (typeof t === "string" ? t : `${t.table}:${t.event || "*"}:${t.filter || ""}`))
    .join("|");

  useEffect(() => {
    if (!enabled) return;
    wireRealtimeAuth();

    let timer: number | undefined;
    const fire = (payload?: any) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => cb.current(payload), 250);
    };

    const channelName = `live:${key || signature}:${Math.random().toString(36).slice(2, 8)}`;
    let channel = supabase.channel(channelName);
    tables.forEach((t) => {
      const conf = typeof t === "string" ? { table: t } : t;
      channel = channel.on(
        "postgres_changes" as any,
        {
          event: conf.event || "*",
          schema: "public",
          table: conf.table,
          ...(conf.filter ? { filter: conf.filter } : {}),
        } as any,
        (payload: any) => fire(payload),
      );
    });
    channel.subscribe();

    const onVisible = () => { if (document.visibilityState === "visible") fire(); };
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    let poll: number | undefined;
    if (pollMs > 0) {
      poll = window.setInterval(() => {
        if (document.visibilityState === "visible") cb.current();
      }, pollMs);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      if (poll) window.clearInterval(poll);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, key, enabled, pollMs]);
}
