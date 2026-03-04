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
        style={{ overflow: "visible", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.15))" }}
      >
        <defs>
          {/* Smooth, rich skin gradients */}
          <radialGradient id="skinGrad" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff1e6" />
            <stop offset="70%" stopColor="#ffe4c4" />
            <stop offset="100%" stopColor="#eebd9f" />
          </radialGradient>

          <radialGradient id="sadGrad" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f0f4f8" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>

          <clipPath id="eyeClipL">
            <ellipse cx="44" cy="52" rx="5" ry="5.5" />
          </clipPath>
          <clipPath id="eyeClipR">
            <ellipse cx="76" cy="52" rx="5" ry="5.5" />
          </clipPath>
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
          {/* Base Head */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill={expression === "upset" ? "url(#sadGrad)" : "url(#skinGrad)"}
            stroke={expression === "upset" ? "#94a3b8" : "#dca07a"}
            strokeWidth="2"
            className="feature"
          />

          {/* Cheeks (Visible on happy/excited) */}
          <g style={{ opacity: ["happy", "excited"].includes(expression) ? 1 : 0, transition: 'opacity 0.3s' }}>
            <ellipse className="cheek" cx="34" cy="65" rx="10" ry="7" fill="#ff7675" />
            <ellipse className="cheek" cx="86" cy="65" rx="10" ry="7" fill="#ff7675" />
          </g>

          {/* Eyebrows */}
          <path
            className="feature eyebrow eyebrow-left"
            d={
              expression === "happy" || expression === "excited" ? "M 36 38 Q 44 34 50 37" :
              expression === "upset" ? "M 36 44 Q 43 40 50 43" :
              "M 36 42 Q 44 38 50 41"
            }
            stroke="#4a3018"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            className="feature eyebrow eyebrow-right"
            d={
              expression === "happy" || expression === "excited" ? "M 70 37 Q 76 34 84 38" :
              expression === "upset" ? "M 70 43 Q 77 40 84 44" :
              "M 70 41 Q 76 38 84 42"
            }
            stroke="#4a3018"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Eyes */}
          <g className="eye-group">
            {/* Eye Backgrounds */}
            {expression === "neutral" && (
              <>
                <ellipse cx="44" cy="52" rx="5" ry="5.5" fill="#fff" />
                <ellipse cx="76" cy="52" rx="5" ry="5.5" fill="#fff" />
              </>
            )}

            {/* Main Eyes / Pupils */}
            {expression === "neutral" ? (
              <>
                <g clipPath="url(#eyeClipL)">
                  <ellipse className="eye-pupil" cx="44" cy="52" rx="3.5" ry="4" fill="#2d1b0e" />
                  <circle className="eye-pupil" cx="45" cy="50" r="1.2" fill="white" />
                </g>
                <g clipPath="url(#eyeClipR)">
                  <ellipse className="eye-pupil" cx="76" cy="52" rx="3.5" ry="4" fill="#2d1b0e" />
                  <circle className="eye-pupil" cx="77" cy="50" r="1.2" fill="white" />
                </g>
              </>
            ) : (
              <>
                <g className="eye" style={{ transformOrigin: "44px 52px" }}>
                  <ellipse cx="44" cy={expression === "upset" ? 53 : 51} rx="5" ry={expression === "upset" ? 4.5 : 5.5} fill="#2d1b0e" />
                  <circle cx="46" cy={expression === "upset" ? 51 : 49} r="1.8" fill="white" />
                </g>
                <g className="eye" style={{ transformOrigin: "76px 52px" }}>
                  <ellipse cx="76" cy={expression === "upset" ? 53 : 51} rx="5" ry={expression === "upset" ? 4.5 : 5.5} fill="#2d1b0e" />
                  <circle cx="78" cy={expression === "upset" ? 51 : 49} r="1.8" fill="white" />
                </g>
              </>
            )}
            
            {/* Sad Eyelids */}
            {expression === "upset" && (
              <>
                <path d="M 39 51 Q 44 48 49 51" stroke="#a1b0c0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M 71 51 Q 76 48 81 51" stroke="#a1b0c0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            )}
          </g>

          {/* Smooth Mustache */}
          <path
            className="feature"
            d="M 36 67 C 36 61, 46 59, 54 64 C 57 66, 63 66, 66 64 C 74 59, 84 61, 84 67 C 84 70, 79 72, 74 70 C 68 67, 64 69, 60 69 C 56 69, 52 67, 46 70 C 41 72, 36 70, 36 67 Z"
            fill="#8b5a2b"
            stroke="#5c3a21"
            strokeWidth="1.2"
          />

          {/* Mouth */}
          <path
            className="feature mouth-path"
            d={
              expression === "happy" || expression === "excited" ? "M 44 78 Q 60 92 76 78" :
              expression === "upset" ? "M 46 80 Q 60 72 74 80" :
              expression === "surprised" ? "M 46 78 Q 52 74 58 78 Q 64 82 70 78" :
              "M 50 78 Q 60 81 70 78"
            }
            stroke="#5c3a21"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Smile Teeth Hint */}
          {(expression === "happy" || expression === "excited") && (
            <path d="M 47 79 Q 60 88 73 79 Q 60 86 47 79 Z" fill="white" opacity="0.7" />
          )}

          {/* Tear Drop */}
          {expression === "upset" && (
            <path className="tear" d="M 44 60 C 44 60, 41 65, 44 68 C 47 65, 44 60, 44 60 Z" fill="#60a5fa" />
          )}

          {/* Thinking Bubbles */}
          {expression === "thinking" && (
            <g>
              <circle className="thought-dot" cx="88" cy="38" r="3" fill="#a3a3a3" />
              <circle className="thought-dot" cx="95" cy="28" r="4.5" fill="#a3a3a3" />
              <circle className="thought-dot" cx="104" cy="18" r="6" fill="#a3a3a3" />
              <text className="thought-dot" x="104" y="21" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">?</text>
            </g>
          )}

          {/* Confused Question Mark */}
          {expression === "surprised" && (
            <text className="question-mark" x="90" y="32" fontSize="22" fontWeight="900" fill="#64748b" fontFamily="Georgia, serif">?</text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default AIFace;
