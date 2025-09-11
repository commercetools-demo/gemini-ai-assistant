'use client';

import React, { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, NoSymbolIcon, SparklesIcon } from '@heroicons/react/24/outline';
import styled, { keyframes, css } from 'styled-components';
import { useLiveAPIContext, AudioRecorder } from '@commercetools-demo/ai-assistant-provider';
import AudioPulse from '../audio-pulse/AudioPulse';
import Toolcall from '../toolcall';
import Logger from '../logger';

export type ControlTrayProps = {
  children?: ReactNode;
};

// Keyframe animations
const opacityPulse = keyframes`
  0% {
    opacity: var(--control-tray--opacity-pulse-start, 0.9);
  }
  50% {
    opacity: var(--control-tray--opacity-pulse-mid, 1);
  }
  100% {
    opacity: var(--control-tray--opacity-pulse-end, 0.9);
  }
`;

// Styled components
const ControlTrayContainer = styled.section`
  position: var(--control-tray-position, fixed);
  bottom: var(--control-tray-bottom, 0);
  right: var(--control-tray-right, 20px);
  display: var(--control-tray-display, inline-flex);
  justify-content: var(--control-tray-justify, center);
  align-items: var(--control-tray-align, flex-start);
  gap: var(--control-tray-gap, 8px);
  padding-bottom: var(--control-tray-padding-bottom, 18px);
  z-index: var(--control-tray-z-index, 51);
`;

const ActionsNav = styled.nav<{ $disabled: boolean }>`
  background: var(--control-tray__actions-nav-bg, rgb(128 128 128 / 0.5));
  border: var(--control-tray__actions-nav-border, 1px solid rgb(75 85 99 / 0.5));
  border-radius: var(--control-tray__actions-nav-border-radius, 27px);
  display: var(--control-tray__actions-nav-display, inline-flex);
  gap: var(--control-tray__actions-nav-gap, 12px);
  align-items: var(--control-tray__actions-nav-align, center);
  overflow: var(--control-tray__actions-nav-overflow, clip);
  padding: var(--control-tray__actions-nav-padding, 10px);
  transition: all var(--control-tray__actions-nav-transition, 0.6s ease-in);

  & > * {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: var(--control-tray__actions-nav__item-gap, 1rem);
  }
`;

const ActionButton = styled.button<{ $connected?: boolean; $disabled?: boolean }>`
  display: var(--control-tray__action-button-display, flex);
  align-items: var(--control-tray__action-button-align, center);
  justify-content: var(--control-tray__action-button-justify, center);
  background: var(--control-tray__action-button-bg, rgb(229 231 235 / 0.5));
  color: var(--control-tray__action-button-color, rgb(75 85 99 / 0.5));
  font-size: var(--control-tray__action-button-font-size, 1.25rem);
  line-height: var(--control-tray__action-button-line-height, 1.75rem);
  text-transform: var(--control-tray__action-button-text-transform, lowercase);
  cursor: var(--control-tray__action-button-cursor, pointer);
  animation: ${opacityPulse} var(--control-tray__action-button-animation-duration, 3s) ease-in infinite;
  transition: all var(--control-tray__action-button-transition, 0.2s ease-in-out);
  width: var(--control-tray__action-button-width, 48px);
  height: var(--control-tray__action-button-height, 48px);
  border-radius: var(--control-tray__action-button-border-radius, 18px);
  border: var(--control-tray__action-button-border, 1px solid rgba(0, 0, 0, 0));
  user-select: var(--control-tray__action-button-user-select, none);

  &:focus {
    border: var(--control-tray__action-button--focus-border, 2px solid rgb(229 231 235 / 0.5));
    outline: var(--control-tray__action-button--focus-outline, 2px solid rgb(31 41 55 / 0.5));
  }

  &:hover {
    background: var(--control-tray__action-button--hover-bg, rgba(0, 0, 0, 0));
    border: var(--control-tray__action-button--hover-border, 1px solid rgb(229 231 235 / 0.5));
  }

  ${props => props.$connected && css`
    background: var(--control-tray__action-button--connected-bg, rgb(59 130 246 / 0.5));
    color: var(--control-tray__action-button--connected-color, rgb(219 234 254 / 0.5));

    &:hover {
      border: var(--control-tray__action-button--connected-hover-border, 1px solid rgb(59 130 246 / 0.5));
    }
  `}

  ${props => props.$disabled && css`
    background: var(--control-tray__action-button--disabled-bg, rgba(0, 0, 0, 0));
    border: var(--control-tray__action-button--disabled-border, 1px solid rgb(209 213 219 / 0.5));
    color: var(--control-tray__action-button--disabled-color, rgb(209 213 219 / 0.5));
  `}
`;

const MicButton = styled(ActionButton)<{ $disabled?: boolean; $volume?: number }>`
  position: var(--control-tray__mic-button-position, relative);
  background-color: var(--control-tray__mic-button-bg, rgb(239 68 68 / 0.5));
  z-index: var(--control-tray__mic-button-z-index, 1);
  color: var(--control-tray__mic-button-color, black);
  transition: all var(--control-tray__mic-button-transition, 0.2s ease-in);

  &:focus {
    border: var(--control-tray__mic-button--focus-border, 2px solid rgb(229 231 235 / 0.5));
    outline: var(--control-tray__mic-button--focus-outline, 2px solid rgb(220 38 38 / 0.5));
  }

  &:hover {
    background-color: var(--control-tray__mic-button--hover-bg, rgb(252 165 165 / 0.5));
  }

  ${props => !props.$disabled && css`
    &::before {
      position: absolute;
      z-index: -1;
      top: calc(var(--volume, 5px) * -1);
      left: calc(var(--volume, 5px) * -1);
      display: block;
      content: "";
      opacity: var(--control-tray__mic-button--before-opacity, 0.35);
      background-color: var(--control-tray__mic-button--before-bg, rgb(239 68 68 / 0.5));
      width: calc(100% + var(--volume, 5px) * 2);
      height: calc(100% + var(--volume, 5px) * 2);
      border-radius: var(--control-tray__mic-button--before-border-radius, 24px);
      transition: all var(--control-tray__mic-button--before-transition, 0.02s ease-in-out);
    }
  `}

  ${props => props.$disabled && css`
    &::before {
      background: var(--control-tray__mic-button--disabled-before-bg, rgba(0, 0, 0, 0));
    }
  `}
`;

const ConnectToggle = styled(ActionButton)<{ $connected: boolean }>`
  &:focus {
    border: var(--control-tray__connect-toggle--focus-border, 2px solid rgb(229 231 235 / 0.5));
    outline: var(--control-tray__connect-toggle--focus-outline, 2px solid rgb(31 41 55 / 0.5));
  }

  ${props => !props.$connected && css`
    background-color: var(--control-tray__connect-toggle--not-connected-bg, rgb(59 130 246 / 0.5));
    color: var(--control-tray__connect-toggle--not-connected-color, rgb(107 114 128 / 0.5));
  `}
`;

const StyledIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ConnectionButtonContainer = styled.div`
  /* Container for connect button if needed */
`;

function ControlTray({ children }: ControlTrayProps) {
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [isHealthy, setIsHealthy] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, healthCheck, volume } = useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);
  useEffect(() => {
    document.documentElement.style.setProperty('--volume', `${Math.max(5, Math.min(inVolume * 200, 8))}px`);
  }, [inVolume]);

  useEffect(() => {
    if (!client) {
      return;
    }
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData).on('volume', setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData).off('volume', setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
    healthCheck().then((res) => {
      setIsHealthy(res.status === 'healthy');
    });
  }, [healthCheck]);

  if (!isHealthy) {
    return null;
    
  }

  return (
    <><ControlTrayContainer>
      <Toolcall />
      <ActionsNav $disabled={!connected}>
        <MicButton $disabled={!connected} onClick={() => setMuted(!muted)}>
          {!muted ? (
            <StyledIconWrapper>
              <MicrophoneIcon width={24} height={24} />
            </StyledIconWrapper>
          ) : (
            <StyledIconWrapper>
              <NoSymbolIcon width={24} height={24} />
            </StyledIconWrapper>
          )}
        </MicButton>
        <ConnectionButtonContainer>
          <ConnectToggle
            ref={connectButtonRef}
            $connected={connected}
            $disabled={!connected}
            onClick={connected ? disconnect : connect}
          >
            <StyledIconWrapper>
              {connected ? (
                <AudioPulse volume={volume} active={connected} hover={false} />
              ) : (
                <SparklesIcon width={24} height={24} fill="white" color='black' />
              )}
            </StyledIconWrapper>
          </ConnectToggle>
        </ConnectionButtonContainer>

        {children}
      </ActionsNav>
    </ControlTrayContainer>
    {/* <Logger filter="transcription" /> */}
    </>
  );
}

export default memo(ControlTray);
