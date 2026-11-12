import { Pool } from 'pg';
import { GameHistoryRecord } from '../shared/types';
import { InternalRoomState } from '../engine/gameEngine';

let pool: Pool | null = null;
let pgReady = false;

export function isPostgresEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function initPostgres(): Promise<boolean> {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) return false;
  try {
    pool = new Pool({
      connectionString: connStr,
      ssl: connStr.includes('localhost') || connStr.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
    await pool.query('SELECT 1');
    // Ensure game_history table exists if not yet migrated
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.game_history (
        id TEXT PRIMARY KEY,
        room_code CHAR(6) NOT NULL,
        mode TEXT NOT NULL,
        player_count INTEGER NOT NULL,
        winner TEXT NOT NULL,
        rounds INTEGER NOT NULL,
        duration_sec INTEGER NOT NULL,
        players JSONB NOT NULL,
        ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.live_rooms (
        code CHAR(6) PRIMARY KEY,
        name TEXT NOT NULL,
        mode TEXT NOT NULL,
        phase TEXT NOT NULL,
        player_count INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        is_private BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    try {
      const fs = await import('fs');
      const path = await import('path');
      for (const file of ['001_premium_economy.sql', '002_admin_control_center.sql']) {
        const migrationPath = path.resolve(process.cwd(), 'migrations', file);
        if (fs.existsSync(migrationPath)) {
          const sql = fs.readFileSync(migrationPath, 'utf8');
          await pool.query(sql);
        }
      }
    } catch (migErr) {
      console.warn('MAFIA PRO: Migration skipped or partial:', (migErr as Error).message);
    }
    pgReady = true;
    console.log('MAFIA PRO: Connected to PostgreSQL database');
    return true;
  } catch (err) {
    console.warn('MAFIA PRO: PostgreSQL connection unavailable, using local persistent store:', (err as Error).message);
    pgReady = false;
    return false;
  }
}

export async function syncRoomToPostgres(room: InternalRoomState): Promise<void> {
  if (!pgReady || !pool) return;
  try {
    await pool.query(
      `INSERT INTO public.live_rooms (code, name, mode, phase, player_count, max_players, is_private, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (code) DO UPDATE SET
         phase = EXCLUDED.phase,
         player_count = EXCLUDED.player_count,
         updated_at = NOW()`,
      [
        room.code,
        room.name,
        room.settings.mode,
        room.phase,
        room.players.filter((p) => !p.isSpectator).length,
        room.settings.maxPlayers,
        room.settings.isPrivate,
      ]
    );
  } catch {
    // Non-blocking persistence
  }
}

export async function removeRoomFromPostgres(code: string): Promise<void> {
  if (!pgReady || !pool) return;
  try {
    await pool.query('DELETE FROM public.live_rooms WHERE code = $1', [code]);
  } catch {
    // Non-blocking
  }
}

export async function recordGameHistoryToPostgres(record: GameHistoryRecord): Promise<void> {
  if (!pgReady || !pool) return;
  try {
    await pool.query(
      `INSERT INTO public.game_history (id, room_code, mode, player_count, winner, rounds, duration_sec, players, ended_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, to_timestamp($9 / 1000.0))
       ON CONFLICT (id) DO NOTHING`,
      [
        record.id,
        record.roomCode,
        record.mode,
        record.playerCount,
        record.winner,
        record.rounds,
        record.durationSec,
        JSON.stringify(record.players),
        record.endedAt,
      ]
    );
  } catch {
    // Non-blocking
  }
}

export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    pgReady = false;
  }
}
