import React from 'react';
import {AbsoluteFill} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {C} from './theme';
import {Grain} from './components/fx';
import {Cut1} from './cuts/Cut1';
import {Cut2} from './cuts/Cut2';
import {Cut3} from './cuts/Cut3';
import {Cut4} from './cuts/Cut4';
import {Cut5} from './cuts/Cut5';
import {Cut6} from './cuts/Cut6';
import {Cut7} from './cuts/Cut7';
import {Cut8} from './cuts/Cut8';

// durations sum 2166; minus 7×18f transition overlaps = 2040 frames = 68s @30fps
const D = {c1: 210, c2: 220, c3: 470, c4: 300, c5: 360, c6: 250, c7: 256, c8: 100};
const T = linearTiming({durationInFrames: 18});

export const SentinelAd: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.bg0}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.c1}><Cut1 dur={D.c1} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={D.c2}><Cut2 dur={D.c2} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={D.c3}><Cut3 dur={D.c3} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={D.c4}><Cut4 dur={D.c4} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={D.c5}><Cut5 dur={D.c5} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={D.c6}><Cut6 dur={D.c6} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={D.c7}><Cut7 dur={D.c7} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={T} />
        <TransitionSeries.Sequence durationInFrames={D.c8}><Cut8 dur={D.c8} /></TransitionSeries.Sequence>
      </TransitionSeries>

      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
