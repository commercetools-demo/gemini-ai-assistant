import React, { useEffect, useState } from "react";
import styled, { keyframes, css } from "styled-components";

const lineCount = 3;

export type AudioPulseProps = {
  active: boolean;
  volume: number;
  hover?: boolean;
};

// Keyframe animations
const hoverAnimation = keyframes`
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(var(--audio-pulse--hover-translate-y, -3.5px));
  }
`;

// Styled components
const AudioPulseContainer = styled.div<{ $active: boolean; $hover: boolean }>`
  display: flex;
  width: var(--audio-pulse-width, 24px);
  justify-content: space-evenly;
  align-items: center;
  transition: all var(--audio-pulse-transition-duration, 0.5s);
  height: var(--audio-pulse-height, 4px);
  opacity: var(--audio-pulse-opacity, 1);
  transition: opacity var(--audio-pulse-opacity-transition, 0.333s);

  ${props => props.$active && css`
    opacity: var(--audio-pulse--active-opacity, 1);
  `}
`;

const AudioPulseLine = styled.div<{ 
  $active: boolean; 
  $hover: boolean; 
  $height: number; 
  $animationDelay: number;
}>`
  background-color: ${props => props.$active 
    ? 'var(--audio-pulse__line--active-bg, white)' 
    : 'var(--audio-pulse__line-bg, rgb(128 128 128 / 0.5))'
  };
  border-radius: var(--audio-pulse__line-border-radius, 1000px);
  width: var(--audio-pulse__line-width, 4px);
  min-height: var(--audio-pulse__line-min-height, 4px);
  height: ${props => props.$height}px;
  transition: height var(--audio-pulse__line-transition, 0.1s);
  animation-delay: ${props => props.$animationDelay}ms;

  ${props => props.$hover && css`
    animation: ${hoverAnimation} var(--audio-pulse--hover-duration, 1.4s) infinite alternate ease-in-out;
  `}
`;

export default function AudioPulse({ active, volume, hover }: AudioPulseProps) {
  const [lineHeights, setLineHeights] = useState<number[]>(Array(lineCount).fill(4));

  useEffect(() => {
    let timeout: number | null = null;
    const update = () => {
      const newHeights = Array(lineCount).fill(null).map((_, i) =>
        Math.min(
          24,
          4 + volume * (i === 1 ? 400 : 60),
        )
      );
      setLineHeights(newHeights);
      
      if (typeof window !== 'undefined') {
        timeout = window.setTimeout(update, 100);
      }
    };

    update();

    return () => clearTimeout((timeout as number)!);
  }, [volume]);

  return (
    <AudioPulseContainer $active={active} $hover={hover || false}>
      {Array(lineCount)
        .fill(null)
        .map((_, i) => (
          <AudioPulseLine
            key={i}
            $active={active}
            $hover={hover || false}
            $height={lineHeights[i]}
            $animationDelay={i * 133}
          />
        ))}
    </AudioPulseContainer>
  );
}
