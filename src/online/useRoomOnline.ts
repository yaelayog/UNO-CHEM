import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { KartuKimia } from '../game';
import { getSupabase } from '../lib/supabase';
import { kirimAksi } from './klienOnline';
import type { RoomRow, RosterRow, StatePublik } from './tipe';

export interface DataRoom {
  room: RoomRow | null;
  roster: RosterRow[];
  versi: number;
  statePublik: StatePublik | null;
  tanganku: KartuKimia[];
  error: string | null;
}

const AWAL: DataRoom = {
  room: null,
  roster: [],
  versi: 0,
  statePublik: null,
  tanganku: [],
  error: null,
};

/**
 * Berlangganan satu room online: sync awal + Realtime (roster, state publik,
 * tangan sendiri) + heartbeat. Aktif selama `code` & `uid` terisi.
 */
export function useRoomOnline(
  code: string | null,
  uid: string | null,
): DataRoom {
  const [data, setData] = useState<DataRoom>(AWAL);
  const versiRef = useRef(0);

  useEffect(() => {
    if (!code || !uid) {
      setData(AWAL);
      return;
    }
    let hidup = true;
    let channel: RealtimeChannel | null = null;
    const gabung = (p: Partial<DataRoom>) =>
      setData((d) => ({ ...d, ...p }));

    async function syncPenuh() {
      const r = await kirimAksi('sync', { code: code! });
      if (!hidup) return;
      if (r.error) return gabung({ error: r.error });
      versiRef.current = (r.versi as number) ?? versiRef.current;
      gabung({
        room: (r.room as RoomRow | null) ?? null,
        roster: (r.roster as RosterRow[]) ?? [],
        versi: versiRef.current,
        statePublik: (r.statePublik as StatePublik | null) ?? null,
        tanganku: (r.tanganku as KartuKimia[]) ?? [],
        error: null,
      });
    }

    void (async () => {
      const sb = await getSupabase();
      if (!sb || !hidup) return;
      void syncPenuh();
      channel = sb
        .channel(`room:${code}`)
        .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_pemain', filter: `room_code=eq.${code}` },
        () => void syncPenuh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        () => void syncPenuh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_publik', filter: `room_code=eq.${code}` },
        (p) => {
          const row = p.new as { versi?: number; state?: StatePublik };
          if (row?.versi == null || !row.state) return; // DELETE / payload kosong
          if (row.versi < versiRef.current) return;
          versiRef.current = row.versi;
          gabung({ statePublik: row.state, versi: row.versi });
        },
      )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tangan', filter: `room_code=eq.${code}` },
          (p) => {
            const row = p.new as { pemain: string; kartu: KartuKimia[] };
            if (row?.pemain === uid) gabung({ tanganku: row.kartu ?? [] });
          },
        )
        .subscribe();
    })();

    const hb = setInterval(() => void kirimAksi('denyut', { code }), 12_000);

    return () => {
      hidup = false;
      clearInterval(hb);
      void getSupabase().then((sb) => channel && sb?.removeChannel(channel));
    };
  }, [code, uid]);

  return data;
}
