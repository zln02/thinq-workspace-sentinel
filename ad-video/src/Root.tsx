import React from 'react';
import {Composition} from 'remotion';
import {SentinelAd} from './SentinelAd';
import {FPS, TOTAL} from './theme';
import {ensureFonts} from './fonts';

ensureFonts();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SentinelAd"
      component={SentinelAd}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
