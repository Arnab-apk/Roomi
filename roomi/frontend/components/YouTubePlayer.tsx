"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { LoaderCircle } from "lucide-react";
import type { PlayerControls, PlayerStatus, SDKTrack } from "./Player";

/* ─────────────────────────── YouTube IFrame API types ─────────────────────────── */

type YTPlayerState = -1 | 0 | 1 | 2 | 3 | 5;

interface YTPlayer {
  loadVideoById(opts: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): YTPlayerState;
  destroy(): void;
}

interface YTPlayerOptions {
  height: number | string;
  width: number | string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: YTPlayerState }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer;
  PlayerState: {
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/* ─────────────────────────── Snapshot type ─────────────────────────── */

type YouTubePlaybackSnapshot = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      uri: string;
      id: string;
      name: string;
      duration_ms: number;
      artists: Array<{ name: string; uri: string }>;
      album: { name: string; uri: string; images: Array<{ url: string; height: number; width: number }> };
    } | null;
  };
};

/* ─────────────────────────── Component ─────────────────────────── */

type YouTubePlayerProps = {
  onReady: (deviceId: string) => void;
  onTrackEnd: () => void;
  onStatusChange?: (status: PlayerStatus) => void;
  onTrackChange?: (track: SDKTrack | null) => void;
  onPlaybackState?: (snapshot: YouTubePlaybackSnapshot | null) => void;
  onError?: (message: string) => void;
};

const YouTubePlayer = forwardRef<PlayerControls, YouTubePlayerProps>(
  function YouTubePlayer(
    { onReady, onTrackEnd, onStatusChange, onTrackChange, onPlaybackState, onError },
    ref,
  ) {
    const playerRef = useRef<YTPlayer | null>(null);
    const currentVideoIdRef = useRef("");
    const [initializing, setInitializing] = useState(true);

    const cb = {
      onReady: useRef(onReady),
      onTrackEnd: useRef(onTrackEnd),
      onStatusChange: useRef(onStatusChange),
      onTrackChange: useRef(onTrackChange),
      onPlaybackState: useRef(onPlaybackState),
      onError: useRef(onError),
    };
    cb.onReady.current = onReady;
    cb.onTrackEnd.current = onTrackEnd;
    cb.onStatusChange.current = onStatusChange;
    cb.onTrackChange.current = onTrackChange;
    cb.onPlaybackState.current = onPlaybackState;
    cb.onError.current = onError;

    function buildSnapshot(): YouTubePlaybackSnapshot | null {
      const p = playerRef.current;
      if (!p) return null;
      const state = p.getPlayerState();
      const videoId = currentVideoIdRef.current;
      return {
        paused: state !== 1,
        position: p.getCurrentTime() * 1000,
        duration: p.getDuration() * 1000,
        track_window: {
          current_track: videoId
            ? {
                uri: videoId,
                id: videoId,
                name: "",
                duration_ms: p.getDuration() * 1000,
                artists: [],
                album: { name: "", uri: "", images: [] },
              }
            : null,
        },
      };
    }

    useImperativeHandle(ref, () => ({
      resume: async () => {
        playerRef.current?.playVideo();
      },
      playUri: async (uri: string, positionMs = 0) => {
        if (!playerRef.current) throw new Error("YouTube player is not ready yet");
        currentVideoIdRef.current = uri;
        playerRef.current.loadVideoById({
          videoId: uri,
          startSeconds: positionMs / 1000,
        });
      },
      pause: async () => {
        playerRef.current?.pauseVideo();
      },
      clearPlayback: async () => {
        playerRef.current?.stopVideo();
        currentVideoIdRef.current = "";
        cb.onPlaybackState.current?.(null);
        cb.onTrackChange.current?.(null);
        cb.onStatusChange.current?.("Waiting for songs...");
      },
      setVolume: async (volume: number) => {
        playerRef.current?.setVolume(volume * 100);
      },
      seek: async (positionMs: number) => {
        playerRef.current?.seekTo(Math.max(0, positionMs / 1000), true);
      },
      getCurrentState: async () => buildSnapshot(),
    }));

    useEffect(() => {
      let cancelled = false;

      const initialize = () => {
        if (cancelled || !window.YT) return;

        const containerId = `yt-player-${Math.random().toString(36).slice(2, 8)}`;
        const container = document.createElement("div");
        container.id = containerId;
        container.style.position = "absolute";
        container.style.width = "0";
        container.style.height = "0";
        container.style.overflow = "hidden";
        document.body.appendChild(container);

        const player = new window.YT.Player(containerId, {
          height: 0,
          width: 0,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setInitializing(false);
              cb.onStatusChange.current?.("Waiting for songs...");
              cb.onReady.current?.("youtube-iframe");
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const snapshot = buildSnapshot();
              cb.onPlaybackState.current?.(snapshot);

              switch (event.data) {
                case 0: // ENDED
                  cb.onStatusChange.current?.("Waiting for songs...");
                  cb.onTrackEnd.current?.();
                  break;
                case 1: // PLAYING
                  cb.onStatusChange.current?.("Playing");
                  if (currentVideoIdRef.current) {
                    cb.onTrackChange.current?.({
                      id: currentVideoIdRef.current,
                      uri: currentVideoIdRef.current,
                      title: "",
                      artist: "",
                      albumArt: "",
                      durationMs: (playerRef.current?.getDuration() ?? 0) * 1000,
                    });
                  }
                  break;
                case 2: // PAUSED
                  cb.onStatusChange.current?.("Paused");
                  break;
              }
            },
            onError: (event) => {
              const errorMap: Record<number, string> = {
                2: "Invalid video ID",
                5: "HTML5 player error",
                100: "Video not found or removed",
                101: "Video cannot be played in embedded players",
                150: "Video cannot be played in embedded players",
              };
              cb.onError.current?.(errorMap[event.data] ?? `YouTube error ${event.data}`);
            },
          },
        });
      };

      if (window.YT?.Player) {
        initialize();
      } else {
        window.onYouTubeIframeAPIReady = initialize;
        if (!document.getElementById("youtube-iframe-api")) {
          const script = document.createElement("script");
          script.id = "youtube-iframe-api";
          script.src = "https://www.youtube.com/iframe_api";
          script.async = true;
          document.body.appendChild(script);
        }
      }

      return () => {
        cancelled = true;
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
        currentVideoIdRef.current = "";
      };
    }, []);

    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
        <div className="flex items-center gap-2">
          {initializing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          <span>{initializing ? "Initializing YouTube player..." : "YouTube player connected"}</span>
        </div>
      </div>
    );
  },
);

export default YouTubePlayer;
