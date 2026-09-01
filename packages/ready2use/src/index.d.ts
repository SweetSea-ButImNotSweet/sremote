import type { SRemoteClient, SRemoteCustomAdapter, SRemoteCapabilities } from '@sremote/wrapper';

export type { SRemoteClient, SRemoteCustomAdapter, SRemoteCapabilities };

/**
 * Standard options accepted by all player providers
 */
export interface BaseProviderOptions {
  /**
   * Width of the player element / iframe.
   * @default "100%"
   */
  width?: number | string;

  /**
   * Height of the player element / iframe.
   * @default "100%"
   */
  height?: number | string;

  /**
   * Optional custom SRemote instance ID.
   */
  instanceId?: string;

  /**
   * Optional custom SRemote client instance.
   */
  sremote?: SRemoteClient;

  [key: string]: any;
}

/**
 * Result returned from provider.create()
 */
export interface ProviderCreateResult<TPlayer = any> {
  /**
   * The generated player DOM Element (HTMLIFrameElement or HTMLVideoElement or HTMLElement).
   */
  element: HTMLElement;

  /**
   * The iframe element if the provider creates an iframe.
   */
  iframe?: HTMLIFrameElement | null;

  /**
   * The SRemote-compatible custom adapter for this instance.
   */
  adapter: SRemoteCustomAdapter;

  /**
   * The underlying native SDK player instance.
   */
  player: TPlayer;

  /**
   * The assigned SRemote instance ID.
   */
  instanceId: string;

  /**
   * The evaluated capabilities for this provider/player.
   */
  capabilities: SRemoteCapabilities;

  /**
   * Destroys the player, cleans up DOM, and releases memory listeners.
   */
  destroy: () => void;
}

/**
 * Result returned from provider.mount()
 */
export interface ProviderMountResult<TPlayer = any> extends ProviderCreateResult<TPlayer> {}

/**
 * Abstract BaseProvider class for creating provider implementations
 */
export declare abstract class BaseProvider<TOptions extends BaseProviderOptions = BaseProviderOptions, TPlayer = any> {
  readonly name: string;
  constructor(name: string);

  loadSdk(): Promise<any>;
  generateInstanceId(customId?: string): string;

  getCapabilities(adapter?: SRemoteCustomAdapter | null): SRemoteCapabilities;
  initPlayer(options: TOptions, instanceId: string): Promise<{ player: TPlayer; element: HTMLElement; iframe?: HTMLIFrameElement; destroy?: () => void }>;
  createAdapter(player: TPlayer, context: { options: TOptions; instanceId: string; element: HTMLElement; iframe?: HTMLIFrameElement | null }): SRemoteCustomAdapter;

  create(options?: TOptions | string): Promise<ProviderCreateResult<TPlayer>>;
  mount(container: string | HTMLElement, options?: TOptions | string): Promise<ProviderMountResult<TPlayer>>;
}

// --- YouTube Provider Definitions ---

export interface YouTubePlayerOptions extends BaseProviderOptions {
  /** YouTube video ID (e.g. "dQw4w9WgXcQ") */
  videoId?: string;
  /** Standard YouTube playerVars configuration. */
  playerVars?: Record<string, any>;
}

export type YouTubePlayerCreateResult = ProviderCreateResult<any>;
export type YouTubePlayerMountResult = ProviderMountResult<any>;

export declare class YouTubeProvider extends BaseProvider<YouTubePlayerOptions, any> {
  constructor();
}

export declare const youtube: {
  create: (options?: YouTubePlayerOptions | string) => Promise<YouTubePlayerCreateResult>;
  mount: (container: string | HTMLElement, options?: YouTubePlayerOptions | string) => Promise<YouTubePlayerMountResult>;
  provider: YouTubeProvider;
};

// --- Vimeo Provider Definitions ---

export interface VimeoPlayerOptions extends BaseProviderOptions {
  /** Vimeo video ID or URL (e.g. "76979871" or "https://vimeo.com/76979871") */
  videoId?: string | number;
  url?: string;
  autoplay?: boolean;
  muted?: boolean;
  playerOptions?: Record<string, any>;
}

export declare class VimeoProvider extends BaseProvider<VimeoPlayerOptions, any> {
  constructor();
}

export declare const vimeo: {
  create: (options?: VimeoPlayerOptions | string | number) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: VimeoPlayerOptions | string | number) => Promise<ProviderMountResult<any>>;
  provider: VimeoProvider;
};

// --- SoundCloud Provider Definitions ---

export interface SoundCloudPlayerOptions extends BaseProviderOptions {
  /** SoundCloud track or playlist URL */
  trackUrl?: string;
  url?: string;
  color?: string;
  autoplay?: boolean;
  visual?: boolean;
  hideCover?: boolean;
  showTeaser?: boolean;
}

export declare class SoundCloudProvider extends BaseProvider<SoundCloudPlayerOptions, any> {
  constructor();
}

export declare const soundcloud: {
  create: (options?: SoundCloudPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: SoundCloudPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: SoundCloudProvider;
};

// --- Dailymotion Provider Definitions ---

export interface DailymotionPlayerOptions extends BaseProviderOptions {
  /** Dailymotion video ID (e.g. "x7tgad0") */
  video?: string;
  videoId?: string;
  autoplay?: boolean;
  muted?: boolean;
  params?: Record<string, any>;
  playerOptions?: Record<string, any>;
}

export declare class DailymotionProvider extends BaseProvider<DailymotionPlayerOptions, any> {
  constructor();
}

export declare const dailymotion: {
  create: (options?: DailymotionPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: DailymotionPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: DailymotionProvider;
};

// --- Twitch Provider Definitions ---

export interface TwitchPlayerOptions extends BaseProviderOptions {
  /** Twitch channel name */
  channel?: string;
  /** Twitch video ID */
  video?: string;
  /** Twitch collection ID */
  collection?: string;
  /** Domain(s) of parent window */
  parent?: string | string[];
  autoplay?: boolean;
  muted?: boolean;
  playerOptions?: Record<string, any>;
}

export declare class TwitchProvider extends BaseProvider<TwitchPlayerOptions, any> {
  constructor();
}

export declare const twitch: {
  create: (options?: TwitchPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: TwitchPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: TwitchProvider;
};

// --- Mixcloud Provider Definitions ---

export interface MixcloudPlayerOptions extends BaseProviderOptions {
  /** Mixcloud feed key / URL (e.g. "/spartacus/party-time/") */
  feed?: string;
  url?: string;
  autoplay?: boolean;
  mini?: boolean;
  hideCover?: boolean;
  light?: boolean;
}

export declare class MixcloudProvider extends BaseProvider<MixcloudPlayerOptions, any> {
  constructor();
}

export declare const mixcloud: {
  create: (options?: MixcloudPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: MixcloudPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: MixcloudProvider;
};

// --- Spotify Provider Definitions ---

export interface SpotifyPlayerOptions extends BaseProviderOptions {
  /** Spotify URI (e.g. "spotify:track:4cOdK2wGLETKBW3PvgPWqT") */
  uri?: string;
  url?: string;
  compact?: boolean;
  controllerOptions?: Record<string, any>;
}

export declare class SpotifyProvider extends BaseProvider<SpotifyPlayerOptions, any> {
  constructor();
}

export declare const spotify: {
  create: (options?: SpotifyPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: SpotifyPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: SpotifyProvider;
};

// --- TikTok Provider Definitions ---

export interface TikTokPlayerOptions extends BaseProviderOptions {
  /** TikTok Video ID (e.g. "6718335390845095173") */
  videoId?: string;
  id?: string;
  musicInfo?: boolean;
  description?: boolean;
  autoplay?: boolean;
}

export declare class TikTokProvider extends BaseProvider<TikTokPlayerOptions, any> {
  constructor();
}

export declare const tiktok: {
  create: (options?: TikTokPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: TikTokPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: TikTokProvider;
};

// --- NicoNico Provider Definitions ---

export interface NicoNicoPlayerOptions extends BaseProviderOptions {
  /** NicoNico Watch ID (e.g. "so46693656") */
  watchId?: string;
  videoId?: string;
  id?: string;
  autoplay?: boolean;
}

export declare class NicoNicoProvider extends BaseProvider<NicoNicoPlayerOptions, any> {
  constructor();
}

export declare const niconico: {
  create: (options?: NicoNicoPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: NicoNicoPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: NicoNicoProvider;
};

// --- Bilibili Provider Definitions ---

export interface BilibiliPlayerOptions extends BaseProviderOptions {
  /** Bilibili BV ID (e.g. "BV1xx411c7mD") */
  bvid?: string;
  /** Bilibili AV ID (e.g. 170001, "av170001") */
  aid?: string | number;
  avid?: string | number;
  /** Video segment / episode CID */
  cid?: string | number;
  videoId?: string | number;
  id?: string | number;
  page?: number;
  t?: number;
  startTime?: number;
  autoplay?: boolean;
  danmaku?: boolean;
  highQuality?: boolean;
  high_quality?: boolean;
}

export declare class BilibiliProvider extends BaseProvider<BilibiliPlayerOptions, any> {
  constructor();
}

export declare const bilibili: {
  create: (options?: BilibiliPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: BilibiliPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: BilibiliProvider;
};

// --- Facebook Provider Definitions ---

export interface FacebookPlayerOptions extends BaseProviderOptions {
  /** Facebook Video URL (e.g. "https://www.facebook.com/facebook/videos/10153231379946729/") */
  videoUrl?: string;
  url?: string;
  showText?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  appId?: string;
  timeout?: number;
}

export declare class FacebookProvider extends BaseProvider<FacebookPlayerOptions, any> {
  constructor();
  loadSdk(appId?: string): Promise<any>;
}

export declare const facebook: {
  create: (options?: FacebookPlayerOptions | string) => Promise<ProviderCreateResult<any>>;
  mount: (container: string | HTMLElement, options?: FacebookPlayerOptions | string) => Promise<ProviderMountResult<any>>;
  provider: FacebookProvider;
};

declare const _default: {
  BaseProvider: typeof BaseProvider;
  youtube: typeof youtube;
  vimeo: typeof vimeo;
  soundcloud: typeof soundcloud;
  dailymotion: typeof dailymotion;
  twitch: typeof twitch;
  mixcloud: typeof mixcloud;
  spotify: typeof spotify;
  tiktok: typeof tiktok;
  niconico: typeof niconico;
  bilibili: typeof bilibili;
  facebook: typeof facebook;
};

export default _default;
