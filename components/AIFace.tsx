import React from "react";

export type FaceExpression = "neutral" | "thinking" | "happy" | "upset" | "excited" | "surprised";

interface AIFaceProps {
  expression?: FaceExpression;
  size?: number;
  className?: string;
}

export const AIFace: React.FC<AIFaceProps> = ({
  expression = "neutral",
  size = 40,
  className = "",
}) => {
  // Mouth path data per expression
  const mouthPath: Record<FaceExpression, string> = {
    neutral: "M 140 195 Q 160 205 180 195",
    thinking: "M 140 198 Q 160 198 180 198",
    happy: "M 135 190 Q 160 215 185 190",
    upset: "M 135 205 Q 160 190 185 205",
    excited: "M 130 188 Q 160 220 190 188",
    surprised: "M 148 192 Q 160 210 172 192",
  };

  // Eyebrow transforms per expression
  const leftBrowTransform: Record<FaceExpression, string> = {
    neutral: "translate(0,0) rotate(0, 120, 130)",
    thinking: "translate(0,-6) rotate(-8, 120, 130)",
    happy: "translate(0,-4) rotate(0, 120, 130)",
    upset: "translate(0,0) rotate(12, 120, 130)",
    excited: "translate(0,-8) rotate(0, 120, 130)",
    surprised: "translate(0,-10) rotate(0, 120, 130)",
  };

  const rightBrowTransform: Record<FaceExpression, string> = {
    neutral: "translate(0,0) rotate(0, 200, 130)",
    thinking: "translate(0,-2) rotate(8, 200, 130)",
    happy: "translate(0,-4) rotate(0, 200, 130)",
    upset: "translate(0,0) rotate(-12, 200, 130)",
    excited: "translate(0,-8) rotate(0, 200, 130)",
    surprised: "translate(0,-10) rotate(0, 200, 130)",
  };

  // Pupil offsets per expression
  const pupilOffset: Record<FaceExpression, { x: number; y: number }> = {
    neutral: { x: 0, y: 0 },
    thinking: { x: -8, y: -6 },
    happy: { x: 0, y: 2 },
    upset: { x: 0, y: 0 },
    excited: { x: 0, y: -2 },
    surprised: { x: 0, y: 0 },
  };

  // Eyelid height (partial close for thinking/upset)
  const eyelidHeight: Record<FaceExpression, number> = {
    neutral: 0,
    thinking: 10,
    happy: 6,
    upset: 12,
    excited: 0,
    surprised: 0,
  };

  const mo = mouthPath[expression];
  const ld = leftBrowTransform[expression];
  const rd = rightBrowTransform[expression];
  const po = pupilOffset[expression];
  const el = eyelidHeight[expression];

  // Colors
  const skinColor = "#E8806A";
  const strokeColor = "#1C1C1A";
  const eyeWhite = "#F5F5F5";
  const pupilColor = "#1C1C1A";
  const browColor = "#1C1C1A";
  const highlightColor = "#FFFFFF";
  const bgColor = "#252523";
  const blushColor = expression === "happy" || expression === "excited" ? "rgba(232,128,106,0.35)" : "none";

  return (
    <svg
      viewBox="0 0 320 320"
      width={size}
      height={size}
      className={`select-none ${className}`}
      style={{ display: "block" }}
      aria-label={`Harvey is ${expression}`}
    >
      {/* Background circle */}
      <circle cx="160" cy="160" r="155" fill={bgColor} stroke="#3A3A37" strokeWidth="2" />

      {/* Head */}
      <ellipse cx="160" cy="170" rx="90" ry="95" fill={skinColor} />

      {/* Blush (happy/excited) */}
      {blushColor !== "none" && (
        <>
          <ellipse cx="108" cy="200" rx="20" ry="12" fill={blushColor} />
          <ellipse cx="212" cy="200" rx="20" ry="12" fill={blushColor} />
        </>
      )}

      {/* Left eye white */}
      <ellipse cx="125" cy="165" rx="22" ry="22" fill={eyeWhite} />
      {/* Right eye white */}
      <ellipse cx="195" cy="165" rx="22" ry="22" fill={eyeWhite} />

      {/* Left pupil */}
      <circle cx={125 + po.x} cy={165 + po.y} r="10" fill={pupilColor} />
      <circle cx={127 + po.x} cy={162 + po.y} r="3" fill={highlightColor} opacity="0.8" />

      {/* Right pupil */}
      <circle cx={195 + po.x} cy={165 + po.y} r="10" fill={pupilColor} />
      <circle cx={197 + po.x} cy={162 + po.y} r="3" fill={highlightColor} opacity="0.8" />

      {/* Left eyelid (for thinking/upset) */}
      {el > 0 && (
        <ellipse
          cx="125"
          cy={143 + el}
          rx="22"
          ry={el}
          fill={skinColor}
        />
      )}
      {/* Right eyelid */}
      {el > 0 && (
        <ellipse
          cx="195"
          cy={143 + el}
          rx="22"
          ry={el}
          fill={skinColor}
        />
      )}

      {/* Left eyebrow */}
      <rect
        x="103"
        y="128"
        width="40"
        height="7"
        rx="4"
        fill={browColor}
        transform={ld}
      />

      {/* Right eyebrow */}
      <rect
        x="177"
        y="128"
        width="40"
        height="7"
        rx="4"
        fill={browColor}
        transform={rd}
      />

      {/* Nose */}
      <ellipse cx="160" cy="182" rx="6" ry="4" fill={strokeColor} opacity="0.25" />

      {/* Mouth */}
      <path
        d={mo}
        fill="none"
        stroke={strokeColor}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Thinking bubble dots (only for thinking) */}
      {expression === "thinking" && (
        <>
          <circle cx="258" cy="95" r="12" fill={bgColor} stroke="#3A3A37" strokeWidth="2" />
          <circle cx="278" cy="70" r="8" fill={bgColor} stroke="#3A3A37" strokeWidth="2" />
          <circle cx="292" cy="52" r="5" fill={bgColor} stroke="#3A3A37" strokeWidth="2" />
        </>
      )}

      {/* Surprised "O" mouth override */}
      {expression === "surprised" && (
        <ellipse cx="160" cy="203" rx="14" ry="16" fill={strokeColor} opacity="0.8" />
      )}
    </svg>
  );
};

export default AIFace;
