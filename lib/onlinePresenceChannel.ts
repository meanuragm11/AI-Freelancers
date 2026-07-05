import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

type PresenceSyncListener = () => void;

const CHANNEL_TOPIC = 'online_users';

let channel: RealtimeChannel | null = null;
let trackedUserId: string | null = null;
let removePromise: Promise<void> | null = null;
const listeners = new Set<PresenceSyncListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function pingPresenceHeartbeat(online: boolean): Promise<void> {
  return fetch('/api/presence/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ online }),
  })
    .then((response) => {
      if (!response.ok) {
        return;
      }
    })
    .catch(() => {
      // Presence heartbeat failures must not affect UX
    });
}

function startPresenceHeartbeat() {
  if (heartbeatInterval) return;
  void pingPresenceHeartbeat(true).catch(() => {});
  heartbeatInterval = setInterval(() => {
    void pingPresenceHeartbeat(true).catch(() => {});
  }, 60_000);
}

function stopPresenceHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  void pingPresenceHeartbeat(false).catch(() => {});
}

function isChannelSubscribed(ch: RealtimeChannel) {
  return ch.state === 'joined' || ch.state === 'joining';
}

function attachPresenceHandlers(ch: RealtimeChannel) {
  return ch
    .on('presence', { event: 'sync' }, notifyListeners)
    .on('presence', { event: 'join' }, notifyListeners)
    .on('presence', { event: 'leave' }, notifyListeners);
}

async function trackPresence(userId: string) {
  if (!channel) return;
  await channel.track({
    user_id: userId,
    online_at: new Date().toISOString(),
  });
  startPresenceHeartbeat();
  notifyListeners();
}

async function removeChannel() {
  if (!channel) return;
  stopPresenceHeartbeat();
  const ch = channel;
  channel = null;
  trackedUserId = null;
  await supabase.removeChannel(ch);
}

function ensureChannel(userId: string) {
  if (channel && trackedUserId === userId) return;

  void (async () => {
    if (removePromise) {
      await removePromise;
    }
    if (channel && trackedUserId === userId) return;

    if (channel) {
      await removeChannel();
    }

    trackedUserId = userId;

    const existing = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${CHANNEL_TOPIC}`);

    if (existing && isChannelSubscribed(existing)) {
      channel = existing;
      await trackPresence(userId);
      return;
    }

    channel = attachPresenceHandlers(
      supabase.channel(CHANNEL_TOPIC, {
        config: { presence: { key: userId } },
      })
    );

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && channel && trackedUserId === userId) {
        await trackPresence(userId);
      }
    });
  })();
}

export function getOnlinePresenceState() {
  return channel?.presenceState() ?? {};
}

export function subscribeToOnlinePresence(
  userId: string,
  listener: PresenceSyncListener
): () => void {
  listeners.add(listener);
  ensureChannel(userId);
  listener();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && channel) {
      removePromise = removeChannel().finally(() => {
        removePromise = null;
      });
    }
  };
}
