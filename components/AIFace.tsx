import React from "react";

export type FaceExpression =
  | "neutral"
  | "thinking"
  | "happy"
  | "upset"
  | "excited"
  | "surprised";

interface AIFaceProps {
  expression?: FaceExpression;
  size?: number;
  className?: string;
}

export const AIFace: React.FC<AIFaceProps> = ({
  expression = "neutral",
  size = 120,
  className = "",
}) => {
  // Map expressions to animation classes
  const faceClassMap: Record<FaceExpression, string> = {
    neutral: "face-looking",
    thinking: "face-thinking",
    happy: "face-happy",
    upset: "face-sad",
    excited: "face-excited",
    surprised: "face-confused",
  };

  const currentClass = faceClassMap[expression];

  return (
    <div
      className={`select-none ${className}`}
      style={{
        width: size,
        height: size,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      aria-label={`AI is ${expression}`}
      >
        <svg
          viewBox="0 0 120 120"
          width="100%"
          height="100%"
          className={currentClass}
          style={{ overflow: "visible", filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.22))" }}
        >
          <defs>
            <linearGradient id="shellGrad" x1="22" y1="14" x2="98" y2="106" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5F5F5" />
              <stop offset="52%" stopColor="#CFCFCF" />
              <stop offset="100%" stopColor="#8D8D8D" />
            </linearGradient>
            <linearGradient id="shellSadGrad" x1="18" y1="18" x2="102" y2="102" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E6E6E6" />
              <stop offset="100%" stopColor="#999999" />
            </linearGradient>
            <linearGradient id="visorGrad" x1="30" y1="34" x2="90" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#343434" />
              <stop offset="100%" stopColor="#111111" />
            </linearGradient>
            <radialGradient id="glowGrad" cx="50%" cy="15%" r="85%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          <style>
            {`
              /* Base Transitions */
            .face-group { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform-origin: center; }
            .feature { transition: all 0.3s ease; }
            
            /* ── NEUTRAL / LOOKING AROUND ── */
            .face-looking .eye-pupil { animation: look-around 5s ease-in-out infinite; }
            .face-looking .eyebrow { animation: look-brow 5s ease-in-out infinite; transform-origin: center; }

            /* ── THINKING ── */
            .face-thinking .eyebrow-left { animation: think-brow 2.5s ease-in-out infinite; transform-origin: 40px 40px; }
            .face-thinking .thought-dot { animation: thought-appear 2s ease-in-out infinite; }
            .face-thinking .thought-dot:nth-child(2) { animation-delay: 0.3s; }
            .face-thinking .thought-dot:nth-child(3) { animation-delay: 0.6s; }
            .face-thinking .eye-group { animation: look-up 2.5s ease-in-out infinite; }

            /* ── UPSET (SAD) ── */
            .face-sad .mouth-path { animation: sad-mouth 4s ease-in-out infinite; }
            .face-sad .eyebrow-left { animation: sad-brow-l 4s ease-in-out infinite; transform-origin: 40px 40px; }
            .face-sad .eyebrow-right { animation: sad-brow-r 4s ease-in-out infinite; transform-origin: 80px 40px; }
            .face-sad .tear { animation: tear-drop 3s ease-in infinite; }

            /* ── HAPPY ── */
            .face-happy .face-group { animation: happy-bounce 1s ease-in-out infinite alternate; }
            .face-happy .cheek { animation: cheek-glow 1.5s ease-in-out infinite alternate; }
            .face-happy .eye { animation: happy-blink 2s ease-in-out infinite; }

            /* ── EXCITED ── */
            .face-excited .face-group { animation: excited-bounce 0.4s ease-in-out infinite alternate; }
            .face-excited .cheek { opacity: 0.8; }
            .face-excited .mouth-path { transform: scale(1.1) translateY(-2px); transform-origin: 60px 80px; }

            /* ── SURPRISED / CONFUSED ── */
            .face-confused .eyebrow-left { animation: confused-brow-l 2.5s ease-in-out infinite; transform-origin: 40px 40px; }
            .face-confused .eyebrow-right { animation: confused-brow-r 2.5s ease-in-out infinite; transform-origin: 80px 40px; }
            .face-confused .face-group { animation: confused-tilt 3s ease-in-out infinite; transform-origin: 60px 60px; }
            .face-confused .question-mark { animation: qmark 2.5s ease-in-out infinite; transform-origin: 95px 25px; }

            /* Animations */
            @keyframes look-around {
              0%, 100% { transform: translate(0, 0); }
              20%, 30% { transform: translate(4px, -1px); }
              60%, 70% { transform: translate(-4px, 1px); }
            }
            @keyframes look-brow {
              0%, 100% { transform: translateY(0); }
              25% { transform: translateY(-1px); }
              65% { transform: translateY(1px); }
            }
            @keyframes think-brow {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-4px) rotate(-10deg); }
            }
            @keyframes thought-appear {
              0%, 20% { opacity: 0; transform: scale(0); }
              50%, 80% { opacity: 1; transform: scale(1); }
              100% { opacity: 0; transform: scale(0); }
            }
            @keyframes look-up {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(2px, -3px); }
            }
            @keyframes sad-mouth {
              0%, 100% { d: path("M 46 80 Q 60 72 74 80"); }
              50% { d: path("M 46 82 Q 60 74 74 82"); }
            }
            @keyframes sad-brow-l {
              0%, 100% { transform: rotate(5deg) translateY(2px); }
              50% { transform: rotate(12deg) translateY(0px); }
            }
            @keyframes sad-brow-r {
              0%, 100% { transform: rotate(-5deg) translateY(2px); }
              50% { transform: rotate(-12deg) translateY(0px); }
            }
            @keyframes tear-drop {
              0% { opacity: 0; transform: translateY(-5px) scale(0.8); }
              20% { opacity: 1; transform: translateY(0) scale(1); }
              80% { opacity: 1; transform: translateY(18px) scale(0.9); }
              100% { opacity: 0; transform: translateY(22px) scale(0.5); }
            }
            @keyframes happy-bounce {
              0% { transform: translateY(0); }
              100% { transform: translateY(-4px); }
            }
            @keyframes excited-bounce {
              0% { transform: translateY(0) scale(1); }
              100% { transform: translateY(-6px) scale(1.02); }
            }
            @keyframes cheek-glow {
              0% { opacity: 0.2; transform: scale(0.9); }
              100% { opacity: 0.6; transform: scale(1.1); }
            }
            @keyframes happy-blink {
              0%, 90%, 100% { transform: scaleY(1); }
              95% { transform: scaleY(0.1); }
            }
            @keyframes confused-brow-l {
              0%, 100% { transform: rotate(0deg) translateY(0); }
              50% { transform: rotate(18deg) translateY(-3px); }
            }
            @keyframes confused-brow-r {
              0%, 100% { transform: rotate(0deg) translateY(0); }
              50% { transform: rotate(-8deg) translateY(3px); }
            }
            @keyframes confused-tilt {
              0%, 100% { transform: rotate(0deg); }
              30% { transform: rotate(-8deg); }
              70% { transform: rotate(5deg); }
            }
            @keyframes qmark {
              0%, 100% { opacity: 0; transform: translateY(5px) scale(0.5) rotate(-10deg); }
              40%, 60% { opacity: 1; transform: translateY(-5px) scale(1) rotate(5deg); }
            }
          `}
        </style>

        <g className="face-group">
          <rect
            x="14"
            y="12"
            width="92"
            height="96"
            rx="30"
            fill={expression === "upset" ? "url(#shellSadGrad)" : "url(#shellGrad)"}
            stroke={expression === "upset" ? "#8A8A8A" : "#B4B4B4"}
            strokeWidth="2.5"
            className="feature"
          />
          <path
            d="M 32 23 C 46 13, 75 13, 92 24"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            className="feature"
          />
          <rect
            x="28"
            y="34"
            width="64"
            height="34"
            rx="17"
            fill="url(#visorGrad)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />
          <ellipse cx="60" cy="29" rx="28" ry="11" fill="url(#glowGrad)" opacity="0.55" />

          <g style={{ opacity: ["happy", "excited"].includes(expression) ? 1 : 0, transition: "opacity 0.3s" }}>
            <ellipse className="cheek" cx="32" cy="77" rx="8" ry="5.5" fill="rgba(255,255,255,0.2)" />
            <ellipse className="cheek" cx="88" cy="77" rx="8" ry="5.5" fill="rgba(255,255,255,0.2)" />
          </g>

          <path
            className="feature eyebrow eyebrow-left"
            d={
              expression === "happy" || expression === "excited" ? "M 36 45 Q 44 39 50 44" :
              expression === "upset" ? "M 36 50 Q 43 43 50 47" :
              "M 36 47 Q 43 43 50 46"
            }
            stroke="#6C6C6C"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            className="feature eyebrow eyebrow-right"
            d={
              expression === "happy" || expression === "excited" ? "M 70 44 Q 77 39 84 45" :
              expression === "upset" ? "M 70 47 Q 77 43 84 50" :
              "M 70 46 Q 77 43 84 47"
            }
            stroke="#6C6C6C"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          <g className="eye-group">
            <g className="eye" style={{ transformOrigin: "45px 51px" }}>
              <rect x="37" y={expression === "upset" ? 49 : 46} width="16" height={expression === "upset" ? 7 : 11} rx="5.5" fill="#F2F2F2" opacity={expression === "thinking" ? 0.92 : 1} />
              <rect className="eye-pupil" x="42" y={expression === "upset" ? 49.5 : 46.5} width="7" height={expression === "upset" ? 6 : 10} rx="3.5" fill="#8A8A8A" />
            </g>
            <g className="eye" style={{ transformOrigin: "75px 51px" }}>
              <rect x="67" y={expression === "upset" ? 49 : 46} width="16" height={expression === "upset" ? 7 : 11} rx="5.5" fill="#F2F2F2" opacity={expression === "thinking" ? 0.92 : 1} />
              <rect className="eye-pupil" x="72" y={expression === "upset" ? 49.5 : 46.5} width="7" height={expression === "upset" ? 6 : 10} rx="3.5" fill="#8A8A8A" />
            </g>
            {expression === "upset" && (
              <>
                <path d="M 37 48 Q 45 44 53 48" stroke="#747474" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M 67 48 Q 75 44 83 48" stroke="#747474" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            )}
          </g>

          <rect x="32" y="72" width="56" height="18" rx="9" fill="rgba(17,17,17,0.72)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />
          <path
            className="feature mouth-path"
            d={
              expression === "happy" || expression === "excited" ? "M 45 81 Q 60 92 75 81" :
              expression === "upset" ? "M 46 84 Q 60 76 74 84" :
              expression === "surprised" ? "M 50 82 Q 60 73 70 82 Q 60 88 50 82" :
              "M 48 82 Q 60 86 72 82"
            }
            stroke="#F5F5F5"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M 42 96 H 78" stroke="rgba(17,17,17,0.55)" strokeWidth="3" strokeLinecap="round" />

          {expression === "upset" && (
            <path className="tear" d="M 43 60 C 43 60, 40 65, 43 68 C 46 65, 43 60, 43 60 Z" fill="#B4B4B4" />
          )}

          {/* Thinking Bubbles */}
          {expression === "thinking" && (
            <g>
              <circle className="thought-dot" cx="88" cy="37" r="3" fill="#8E8E8E" />
              <circle className="thought-dot" cx="96" cy="27" r="4.5" fill="#A4A4A4" />
              <circle className="thought-dot" cx="105" cy="17" r="6" fill="#C8C8C8" />
              <text className="thought-dot" x="105" y="20" textAnchor="middle" fontSize="9" fill="#303030" fontWeight="bold">?</text>
            </g>
          )}

          {/* Confused Question Mark */}
          {expression === "surprised" && (
            <text className="question-mark" x="90" y="32" fontSize="22" fontWeight="900" fill="#9A9A9A" fontFamily="Inter, system-ui, sans-serif">?</text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default AIFace;
