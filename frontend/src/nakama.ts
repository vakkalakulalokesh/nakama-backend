import { Client, Session, Socket } from '@heroiclabs/nakama-js';

const host = import.meta.env.VITE_NAKAMA_HOST || 'localhost';
const port = import.meta.env.VITE_NAKAMA_PORT || '7350';
const useSSL = import.meta.env.VITE_NAKAMA_SSL === 'true';
const serverKey = import.meta.env.VITE_NAKAMA_SERVER_KEY || 'defaultkey';

let client: Client;
let session: Session | null = null;
let socket: Socket | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client(serverKey, host, port, useSSL);
  }
  return client;
}

export function getSession(): Session | null {
  return session;
}

export function getSocket(): Socket | null {
  return socket;
}

function getDeviceId(): string {
  let deviceId = localStorage.getItem('nakama_device_id');
  if (!deviceId) {
    deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('nakama_device_id', deviceId);
  }
  return deviceId;
}

export async function authenticate(username: string): Promise<Session> {
  const c = getClient();
  const deviceId = getDeviceId();

  session = await c.authenticateDevice(deviceId, true, username);

  try {
    await c.updateAccount(session, { username: username });
  } catch (_e) {
    // username may already be set or taken
  }

  return session;
}

export async function connectSocket(s: Session): Promise<Socket> {
  const c = getClient();
  socket = c.createSocket(useSSL, false);
  await socket.connect(s, true);
  return socket;
}

export async function disconnectSocket(): Promise<void> {
  if (socket) {
    await socket.disconnect(true);
    socket = null;
  }
}

export function decodeMatchData(data: unknown): Record<string, unknown> {
  try {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    if (data instanceof Uint8Array) {
      return JSON.parse(new TextDecoder().decode(data));
    }
    if (data instanceof ArrayBuffer) {
      return JSON.parse(new TextDecoder().decode(new Uint8Array(data)));
    }
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }
  } catch (e) {
    console.error('Failed to decode match data:', e);
  }
  return {};
}
