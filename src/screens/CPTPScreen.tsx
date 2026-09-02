import { CPTP } from '../data/cptp';
import { BagianInfo, KerangkaInfo, TeksTebal } from '../components/LayarInfo';

export function CPTPScreen() {
  return (
    <KerangkaInfo judul="CP & Tujuan Pembelajaran">
      {/* Header kurikulum */}
      <section className="rounded-2xl bg-lab/10 p-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-tinta/80">
          <span>
            <b>Mata Pelajaran:</b> {CPTP.mataPelajaran}
          </span>
          <span>
            <b>Fase:</b> {CPTP.fase}
          </span>
          <span>
            <b>Kelas:</b> {CPTP.kelas}
          </span>
          <span>
            <b>Elemen:</b> {CPTP.elemen}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-tinta/80">
          <b>Materi:</b> {CPTP.materi}
        </p>
      </section>

      {/* A. Capaian Pembelajaran */}
      <BagianInfo judul="A. Capaian Pembelajaran">
        <p className="text-tinta/60">
          CP Fase {CPTP.fase} (elemen {CPTP.elemen}): murid mampu{' '}
          <i>"{CPTP.cpKutipan}"</i>. Elaborasi untuk materi {CPTP.materi}:
        </p>
        <p className="rounded-xl border-l-2 border-lab/40 bg-kertas/60 p-2.5">
          {CPTP.cpElaborasi}
        </p>
      </BagianInfo>

      {/* B. Tujuan Pembelajaran */}
      <BagianInfo judul="B. Tujuan Pembelajaran">
        <ol className="flex flex-col gap-2.5">
          {CPTP.tujuan.map((t) => (
            <li key={t.no} className="flex gap-2.5">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-lab text-xs font-extrabold text-white">
                {t.no}
              </span>
              <div className="min-w-0">
                <p>
                  <TeksTebal teks={t.teks} />
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-md bg-lab/15 px-1.5 py-0.5 text-[10px] font-extrabold text-lab"
                    title={`Dimensi kognitif ${t.dimensi} – ${t.dimensiLabel}`}
                  >
                    {t.dimensi} · {t.dimensiLabel}
                  </span>
                  {t.catatan && (
                    <span className="rounded-md bg-black/8 px-1.5 py-0.5 text-[10px] font-bold text-tinta/55">
                      {t.catatan}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </BagianInfo>

      <p className="text-xs text-tinta/45">
        Dokumen kurikulum lengkap (catatan penyusunan &amp; implementasi) ada di{' '}
        <code>docs/CP-TP_Sistem_Periodik_Unsur.md</code> pada repositori project.
      </p>
    </KerangkaInfo>
  );
}
