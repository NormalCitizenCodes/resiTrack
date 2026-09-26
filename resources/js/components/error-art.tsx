/**
 * Flat illustrations for the error pages, drawn in the brand blues and greens.
 * Each is a decorative 320 x 240 picture (aria-hidden): the words next to it
 * carry the meaning. To use finished artwork instead, replace the component a
 * kind points at in `pages/error.tsx` with an <img> of the exported file.
 */

const SKY = '#dbeafe';
const SKY_MID = '#bfdbfe';
const BLUE = '#3b82f6';
const BLUE_SOFT = '#93c5fd';
const NAVY = '#1e40af';
const GREEN = '#4ade80';
const GREEN_DEEP = '#22c55e';
const RED = '#ef4444';
const AMBER = '#f59e0b';

function Frame({ children }: { children: React.ReactNode }) {
    return (
        <svg viewBox="0 0 320 240" aria-hidden="true" className="h-auto w-full">
            <circle cx="200" cy="100" r="82" fill={SKY} opacity="0.75" />
            <ellipse cx="160" cy="218" rx="132" ry="13" fill={SKY_MID} opacity="0.5" />
            {children}
        </svg>
    );
}

function Bush({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <circle cx="0" cy="0" r="16" fill={GREEN} />
            <circle cx="18" cy="6" r="12" fill={GREEN_DEEP} />
            <circle cx="-14" cy="8" r="10" fill={GREEN_DEEP} />
        </g>
    );
}

function House({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x="0" y="20" width="34" height="28" fill={BLUE_SOFT} />
            <path d="M-5 22 L17 2 L39 22Z" fill={BLUE} />
            <rect x="12" y="30" width="10" height="18" fill="#fff" />
        </g>
    );
}

export function NotFoundArt() {
    return (
        <Frame>
            <path d="M30 222 C110 205 150 190 215 158 L238 166 C185 206 115 226 30 222Z" fill={SKY_MID} />
            <House x={244} y={112} />
            <House x={206} y={134} s={0.75} />
            <Bush x={70} y={200} />
            <Bush x={276} y={196} s={0.8} />
            <rect x="152" y="46" width="9" height="166" rx="3" fill={NAVY} />
            <path d="M161 60 H208 L220 72 L208 84 H161Z" fill={BLUE} />
            <path d="M152 92 H108 L96 104 L108 116 H152Z" fill="#60a5fa" />
            <path d="M161 124 H198 L208 134 L198 144 H161Z" fill={BLUE_SOFT} />
        </Frame>
    );
}

export function ServerErrorArt() {
    return (
        <Frame>
            <Bush x={60} y={196} />
            <rect x="92" y="38" width="112" height="156" rx="12" fill={SKY_MID} stroke={BLUE} strokeWidth="3" />
            {[56, 96, 136].map((y) => (
                <g key={y}>
                    <rect x="106" y={y} width="84" height="28" rx="6" fill="#fff" stroke={BLUE_SOFT} strokeWidth="2" />
                    <circle cx="120" cy={y + 14} r="4" fill={GREEN_DEEP} />
                    <rect x="134" y={y + 11} width="42" height="6" rx="3" fill={BLUE_SOFT} />
                </g>
            ))}
            <path d="M148 194 C148 218 200 206 236 214" fill="none" stroke={NAVY} strokeWidth="4" strokeLinecap="round" />
            <path d="M232 112 L272 186 H192Z" fill={RED} stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
            <rect x="229" y="138" width="6" height="26" rx="3" fill="#fff" />
            <circle cx="232" cy="174" r="4" fill="#fff" />
        </Frame>
    );
}

export function RestrictedArt() {
    return (
        <Frame>
            <rect x="228" y="60" width="44" height="120" fill={SKY_MID} opacity="0.8" />
            <rect x="60" y="80" width="40" height="100" fill={SKY_MID} opacity="0.8" />
            <Bush x={52} y={196} s={0.9} />
            <rect x="92" y="96" width="16" height="116" rx="4" fill={BLUE} />
            <rect x="212" y="96" width="16" height="116" rx="4" fill={BLUE} />
            <rect x="92" y="96" width="16" height="10" rx="4" fill={NAVY} />
            <rect x="212" y="96" width="16" height="10" rx="4" fill={NAVY} />
            <rect x="100" y="126" width="120" height="20" rx="10" fill="#fff" stroke={BLUE_SOFT} strokeWidth="3" />
            {[112, 140, 168, 196].map((x) => (
                <rect key={x} x={x} y="126" width="12" height="20" fill={RED} opacity="0.85" />
            ))}
            <circle cx="160" cy="136" r="24" fill={RED} stroke="#fff" strokeWidth="5" />
            <rect x="148" y="132" width="24" height="8" rx="4" fill="#fff" />
        </Frame>
    );
}

export function LoginArt() {
    return (
        <Frame>
            <Bush x={70} y={198} s={0.9} />
            <rect x="72" y="62" width="172" height="118" rx="12" fill="#f8fbff" stroke={BLUE_SOFT} strokeWidth="3" />
            <circle cx="88" cy="76" r="4" fill={BLUE_SOFT} />
            <circle cx="102" cy="76" r="4" fill={BLUE_SOFT} />
            <circle cx="116" cy="76" r="4" fill={BLUE_SOFT} />
            <line x1="72" y1="90" x2="244" y2="90" stroke={SKY_MID} strokeWidth="2" />
            <circle cx="140" cy="118" r="12" fill={BLUE} />
            <path d="M118 150 C118 134 162 134 162 150Z" fill={BLUE} />
            {[100, 116, 132, 148, 164].map((x) => (
                <circle key={x} cx={x} cy="166" r="4" fill={NAVY} />
            ))}
            <path d="M212 136 V128 C212 112 244 112 244 128 V136" fill="none" stroke={NAVY} strokeWidth="6" strokeLinecap="round" />
            <rect x="204" y="134" width="48" height="40" rx="8" fill={BLUE} />
            <circle cx="228" cy="150" r="5" fill="#fff" />
            <rect x="226" y="152" width="4" height="10" rx="2" fill="#fff" />
        </Frame>
    );
}

export function MaintenanceArt() {
    const teeth = [0, 45, 90, 135, 180, 225, 270, 315];

    return (
        <Frame>
            <Bush x={264} y={198} s={0.85} />
            <g transform="translate(150 106)">
                {teeth.map((angle) => (
                    <rect key={angle} x="-9" y="-62" width="18" height="24" rx="4" fill={BLUE} transform={`rotate(${angle})`} />
                ))}
                <circle r="50" fill={BLUE} />
                <circle r="34" fill={SKY_MID} />
                <circle r="18" fill="#fff" />
            </g>
            <path d="M84 214 L100 168 L116 214Z" fill={AMBER} />
            <rect x="78" y="210" width="44" height="8" rx="3" fill={NAVY} />
            <rect x="92" y="184" width="16" height="6" fill="#fff" opacity="0.9" />
            <rect x="152" y="176" width="90" height="16" rx="4" fill="#fff" stroke={BLUE_SOFT} strokeWidth="2" />
            {[160, 184, 208, 232].map((x) => (
                <path key={x} d={`M${x} 176 h12 l-12 16 h-12Z`} fill={AMBER} />
            ))}
            <rect x="160" y="192" width="6" height="22" fill={NAVY} />
            <rect x="228" y="192" width="6" height="22" fill={NAVY} />
        </Frame>
    );
}

export function OfflineArt() {
    return (
        <Frame>
            <Bush x={70} y={200} s={0.9} />
            <path d="M160 52 L128 212 H192Z" fill="none" stroke={NAVY} strokeWidth="5" strokeLinejoin="round" />
            <path d="M152 100 H168 M146 130 H174 M140 160 H180 M152 100 L174 130 L140 160 M168 100 L146 130 L180 160" fill="none" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
            <circle cx="160" cy="48" r="9" fill={BLUE} />
            <path d="M136 30 C148 18 172 18 184 30 M124 18 C144 -2 176 -2 196 18" fill="none" stroke={BLUE_SOFT} strokeWidth="5" strokeLinecap="round" />
            <circle cx="230" cy="70" r="26" fill={RED} stroke="#fff" strokeWidth="5" />
            <path d="M220 60 L240 80 M240 60 L220 80" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        </Frame>
    );
}
