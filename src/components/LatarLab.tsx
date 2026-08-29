/**
 * Latar bertema laboratorium: gradasi lembut + pola heksagon (cincin kimia)
 * yang menghanyut pelan + beberapa "gelembung" warna golongan yang samar.
 * Dipasang sebagai lapisan fixed di belakang konten (z-0).
 */
export function LatarLab() {
  return (
    <div className="latar-lab" aria-hidden>
      <div className="latar-lab-gradasi" />

      <svg className="latar-lab-heks" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="heks"
            width="56"
            height="48"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(1.6)"
          >
            <path
              d="M14 0 L28 8 L28 24 L14 32 L0 24 L0 8 Z M42 24 L56 32 L56 48 L42 56 L28 48 L28 32 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#heks)" />
      </svg>

      <span className="latar-lab-gelembung latar-lab-gelembung--1" />
      <span className="latar-lab-gelembung latar-lab-gelembung--2" />
      <span className="latar-lab-gelembung latar-lab-gelembung--3" />
    </div>
  );
}
