import React from "react";
import { Composition } from "remotion";
import { AniWereVideo, TOTAL } from "./Video";
import { FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AniWere"
      component={AniWereVideo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
    />
  );
};
