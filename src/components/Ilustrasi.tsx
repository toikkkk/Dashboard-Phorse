/**
 * Ilustrasi halaman masuk: terminal BBM (tangki), kartu pemantauan, tetesan air, dan daun, di atas bentuk organik.
 * Atribut data-* dipakai GSAP di LatarAuth: data-par (kedalaman parallax), data-float (amplitudo melayang),
 * data-tumbuh (naik dari dasar), data-gelembung (gelembung yang hanyut).
 */
export function Ilustrasi() {
  return (
    <svg
      viewBox="0 0 560 520"
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Ilustrasi terminal BBM dengan kartu pemantauan lingkungan"
      style={{ transformBox: "fill-box" }}
    >
      <defs>
        <radialGradient id="il-blob" cx="50%" cy="42%" r="62%">
          <stop offset="0" stopColor="#f6faff" />
          <stop offset="1" stopColor="#cfe2fa" />
        </radialGradient>
        <linearGradient id="il-t1" x1="0" x2="1">
          <stop offset="0" stopColor="#3a86e6" />
          <stop offset="1" stopColor="#1a4fa3" />
        </linearGradient>
        <linearGradient id="il-t2" x1="0" x2="1">
          <stop offset="0" stopColor="#8fc0f7" />
          <stop offset="1" stopColor="#3f8ae8" />
        </linearGradient>
        <linearGradient id="il-t3" x1="0" x2="1">
          <stop offset="0" stopColor="#5a9bec" />
          <stop offset="1" stopColor="#256abf" />
        </linearGradient>
        <linearGradient id="il-daun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3ad39a" />
          <stop offset="1" stopColor="#13925e" />
        </linearGradient>
        <filter id="il-bayang" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#1a4fa3" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* bentuk organik latar */}
      <g data-par="0.25">
        <path
          d="M104,250 C86,128 222,34 338,64 C452,94 528,190 506,306 C484,420 380,492 268,478 C152,464 122,364 104,250 Z"
          fill="url(#il-blob)"
        />
        <circle cx="292" cy="268" r="150" fill="#ffffff" opacity="0.55" />
        <circle cx="292" cy="268" r="96" fill="#e3eefc" opacity="0.8" />
      </g>
      <ellipse cx="292" cy="432" rx="200" ry="22" fill="#1a4fa3" opacity="0.12" />

      {/* terminal: tiga tangki dan pipa */}
      <g data-par="0.6">
        <g data-tumbuh>
          <rect x="168" y="292" width="84" height="130" rx="6" fill="url(#il-t1)" />
          <ellipse cx="210" cy="422" rx="42" ry="11" fill="#1a4fa3" />
          <ellipse cx="210" cy="292" rx="42" ry="12" fill="#6aa6f0" />
          <rect x="180" y="300" width="9" height="114" rx="4.5" fill="#fff" opacity="0.28" />
          <rect x="168" y="336" width="84" height="5" fill="#fff" opacity="0.18" />
          <rect x="168" y="378" width="84" height="5" fill="#fff" opacity="0.18" />
        </g>
        <g data-tumbuh>
          <rect x="264" y="236" width="94" height="186" rx="6" fill="url(#il-t2)" />
          <ellipse cx="311" cy="422" rx="47" ry="12" fill="#3f8ae8" />
          <ellipse cx="311" cy="236" rx="47" ry="13" fill="#c4dcfa" />
          <rect x="277" y="246" width="10" height="168" rx="5" fill="#fff" opacity="0.38" />
          <rect x="264" y="296" width="94" height="5" fill="#fff" opacity="0.22" />
          <rect x="264" y="350" width="94" height="5" fill="#fff" opacity="0.22" />
          <rect x="305" y="206" width="12" height="24" rx="3" fill="#1a4fa3" />
        </g>
        <g data-tumbuh>
          <rect x="370" y="310" width="74" height="112" rx="6" fill="url(#il-t3)" />
          <ellipse cx="407" cy="422" rx="37" ry="10" fill="#256abf" />
          <ellipse cx="407" cy="310" rx="37" ry="11" fill="#8fc0f7" />
          <rect x="380" y="318" width="8" height="98" rx="4" fill="#fff" opacity="0.28" />
        </g>
        <rect x="168" y="410" width="276" height="10" rx="5" fill="#1a4fa3" opacity="0.55" />
        <circle cx="258" cy="415" r="7" fill="#fff" stroke="#1a4fa3" strokeWidth="3" />
        <circle cx="364" cy="415" r="7" fill="#fff" stroke="#1a4fa3" strokeWidth="3" />
      </g>

      {/* kartu pemantauan (melayang) */}
      <g data-par="1" data-float="9" filter="url(#il-bayang)">
        <rect x="56" y="118" width="150" height="96" rx="16" fill="#fff" />
        <rect x="72" y="134" width="56" height="7" rx="3.5" fill="#cfe0f7" />
        <rect x="72" y="146" width="34" height="5" rx="2.5" fill="#e3ecf8" />
        <polyline points="72,196 94,178 114,186 138,164 160,170 188,148" fill="none" stroke="#256abf" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="188" cy="148" r="5.5" fill="#256abf" stroke="#fff" strokeWidth="2.5" />
      </g>
      <g data-par="1.2" data-float="7" filter="url(#il-bayang)">
        <rect x="396" y="226" width="116" height="64" rx="14" fill="#fff" />
        <circle cx="424" cy="258" r="13" fill="#d9f5ea" />
        <polyline points="418,258 423,263 431,252" fill="none" stroke="#13925e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="446" y="247" width="52" height="6" rx="3" fill="#cfe0f7" />
        <rect x="446" y="261" width="34" height="5" rx="2.5" fill="#e3ecf8" />
      </g>
      <g data-par="0.9" data-float="6" filter="url(#il-bayang)">
        <circle cx="104" cy="318" r="32" fill="#fff" />
        <path d="M82,326 A22,22 0 0 1 126,326" fill="none" stroke="#e3ecf8" strokeWidth="7" strokeLinecap="round" />
        <path d="M82,326 A22,22 0 0 1 112,304" fill="none" stroke="#256abf" strokeWidth="7" strokeLinecap="round" />
        <circle cx="104" cy="326" r="4" fill="#1a4fa3" />
      </g>

      {/* tetesan air */}
      <g data-par="1.1" data-float="8" transform="translate(474 152)">
        <path d="M0,-34 C22,-6 30,8 30,20 A30,30 0 1 1 -30,20 C-30,8 -22,-6 0,-34 Z" fill="#3a86e6" />
        <path d="M-14,14 C-14,6 -9,-1 -4,-8" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
      </g>

      {/* daun (bergoyang) */}
      <g data-par="1.15">
        <g data-goyang transform="translate(120 446)">
          <path d="M0,0 C-40,-46 -14,-112 52,-124 C76,-62 52,-8 0,0 Z" fill="url(#il-daun)" />
          <path d="M2,-2 C14,-40 30,-70 48,-112" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
          <path d="M-4,4 C-8,16 -6,26 0,34" fill="none" stroke="#13925e" strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>

      {/* gelembung */}
      <g data-par="0.4">
        <circle data-gelembung cx="64" cy="78" r="14" fill="#cfe2fa" opacity="0.7" />
        <circle data-gelembung cx="508" cy="92" r="10" fill="#cfe2fa" opacity="0.8" />
        <circle data-gelembung cx="528" cy="372" r="18" fill="#dcebfc" opacity="0.8" />
        <circle data-gelembung cx="40" cy="236" r="8" fill="#cfe2fa" opacity="0.9" />
        <circle data-gelembung cx="300" cy="22" r="9" fill="#dcebfc" opacity="0.9" />
        <circle data-gelembung cx="470" cy="456" r="12" fill="#cfe2fa" opacity="0.7" />
      </g>
    </svg>
  );
}
