import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 단계 19 [Issues0]: ffmpeg-static은 native binary + dynamic require로 Turbopack NFT
  // 추적이 프로젝트 전역을 끌어와 "1 issue" dev indicator를 띄운다. server external로
  // 분리해 native Node.js require로 처리.
  serverExternalPackages: ['ffmpeg-static'],

  // NFT(Node File Tracing)에서 convert-for-etri.ts의 의도적 runtime path.join/require가
  // "unexpected file in NFT list" 경고를 띄운다. fs 호출은 요청 시점에만 일어나며 ffmpeg
  // 바이너리는 serverExternalPackages로 외부화. 경고만 억제해 dev indicator를 0으로.
  turbopack: {
    ignoreIssue: [
      {
        path: '**/src/lib/audio/convert-for-etri.ts',
        title: /Encountered unexpected file in NFT list/,
      },
      // Turbopack은 trace 상의 entry(next.config.ts)에 경고를 단다. 동일 경고를 silencing.
      {
        path: '**/next.config.ts',
        title: /Encountered unexpected file in NFT list/,
      },
    ],
  },
};

export default nextConfig;
