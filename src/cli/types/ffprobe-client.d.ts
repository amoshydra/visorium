declare module "ffprobe-client" {
  export interface AudioStream {
    codec_type: "audio";
  }

  export interface VideoStream {
    codec_type: "video";
    coded_width: number;
    coded_height: number;
    display_aspect_ratio: `${number}:${number}`;
  }

  export type FFProbeStream = AudioStream | VideoStream;

  export interface FFProbeData {
    streams: FFProbeStream[];
  }

  export interface FfprobeConfig {
    path?: string;
  }

  const Ffprobe: (path: string, config?: Config) => Promise<FFProbeData>;

  export default Ffprobe;
}
