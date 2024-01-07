import { createSignal, type JSX } from 'solid-js';

import type { RefOf } from '~/api/atp-schema.ts';

import BlobImage from '../BlobImage.tsx';
import PlayIcon from '~/com/icons/baseline-play.tsx';
import CircularProgress from '../CircularProgress.tsx';

type EmbeddedLink = RefOf<'app.bsky.embed.external#viewExternal'>;

export interface EmbedLinkData extends Omit<EmbeddedLink, 'thumb'> {
	thumb?: Blob | string;
}

export interface EmbedLinkProps {
	link: EmbedLinkData;
}

export const getDomain = (url: string) => {
	try {
		const host = new URL(url).host;
		return host.startsWith('www.') ? host.slice(4) : host;
	} catch {
		return url;
	}
};

export const EmbedLinkContent = (props: EmbedLinkProps, interactive?: boolean) => {
	return (() => {
		const { uri, thumb, title } = props.link;
		const feature = extractExternalFeature(props.link);

		return (
			<div class="flex flex-col overflow-hidden rounded-md border border-divider">
				{
					/* @once */ (() => {
						if (feature) {
							if (feature.f & FeatureFlags.IS_GIF) {
								return GifPlayer({ feature: feature, data: props.link });
							}
						}

						return null;
					})()
				}

				<a
					inert={!interactive}
					href={uri}
					rel="noopener noreferrer nofollow"
					target="_blank"
					class="flex hover:bg-secondary/10"
				>
					{thumb && !feature && (
						<BlobImage
							src={thumb}
							class="aspect-square w-[86px] shrink-0 border-r border-divider object-cover"
						/>
					)}

					<div class="flex min-w-0 flex-col justify-center gap-0.5 p-3 text-sm">
						<p class="overflow-hidden text-ellipsis text-muted-fg">{/* @once */ getDomain(uri)}</p>

						{
							/* @once */ (!feature || !(feature.f & FeatureFlags.HIDE_DETAILS)) && (
								<p class="line-clamp-2 empty:hidden">{title}</p>
							)
						}
					</div>
				</a>
			</div>
		);
	}) as unknown as JSX.Element;
};

const CACHED_HEIGHT = new WeakMap<ExternalFeature, number>();
const GifPlayer = ({ feature, data }: { feature: ExternalFeature; data: EmbedLinkData }) => {
	const [playing, setPlaying] = createSignal(false);
	const [loaded, setLoaded] = createSignal(false);

	const cachedHeight = CACHED_HEIGHT.get(feature);

	let firstLoad = true;

	return (
		<button
			title={!playing() ? `Play GIF` : `Pause GIF`}
			onClick={() => setPlaying(!playing())}
			class="group relative flex flex-col"
		>
			<BlobImage
				src={!playing() ? data.thumb : feature.u}
				height={cachedHeight}
				onLoad={(ev) => {
					if (firstLoad) {
						const target = ev.currentTarget;
						const height = target.naturalHeight;

						target.classList.remove(`aspect-video`);

						CACHED_HEIGHT.set(feature, height);
						firstLoad = false;
					}

					if (playing()) {
						setLoaded(true);
					}
				}}
				class="aspect-video max-h-80 min-h-16 bg-black object-contain"
			/>

			{(!playing() || !loaded()) && (
				<div class="absolute inset-0 grid place-items-center bg-black/50">
					{!playing() ? <PlayIcon style="font-size:48px" /> : <CircularProgress size={32} />}

					<a
						target="_blank"
						href={/* @once */ data.uri}
						rel="noopener noreferrer nofollow"
						class="absolute bottom-0 left-0 m-2 rounded bg-black/50 px-2 py-0.5 text-de text-white hover:underline"
					>
						{/* @once */ getDomain(data.uri)}
					</a>
				</div>
			)}
		</button>
	);
};

const EmbedLink = (props: EmbedLinkProps) => {
	return EmbedLinkContent(props, true);
};

export default EmbedLink;

const enum FeatureFlags {
	// `url` points to an iframe URL
	IS_IFRAME = 1 << 0,
	// `url` points to a .gif GIF
	IS_GIF = 1 << 1,

	HIDE_DETAILS = 1 << 2,
}

const enum FeatureType {
	YOUTUBE_VIDEO,
	YOUTUBE_SHORT,
	// TWITCH_STREAM,
	// SPOTIFY_ALBUM,
	// SPOTIFY_PLAYLIST,
	// SPOTIFY_SONG,
	// SOUNDCLOUD_TRACK,
	// SOUNDCLOUD_SET,
	// APPLE_MUSIC_PLAYLIST,
	// APPLE_MUSIC_ALBUM,
	// APPLE_MUSIC_SONG,
	// VIMEO_VIDEO,
	GIPHY_GIF,
	TENOR_GIF,
}

const enum FeatureSource {
	YOUTUBE,
	GIPHY,
	TENOR,
}

interface ExternalFeature {
	t: FeatureType;
	s: FeatureSource;
	f: number;
	u: string;
}

const TRIM_HOST_RE = /^(m|www)\./;

const WM_EMBED = new WeakMap<EmbedLinkData, ExternalFeature | null>();
const extractExternalFeature = (data: EmbedLinkData) => {
	let result = WM_EMBED.get(data);
	if (result === undefined) {
		WM_EMBED.set(data, (result = extractExternalFeatureRaw(data.uri)));
	}

	return result;
};

const extractExternalFeatureRaw = (url: string): ExternalFeature | null => {
	let urli: URL;
	try {
		urli = new URL(url);
	} catch {
		return null;
	}

	const hostname = urli.host.replace(TRIM_HOST_RE, '');
	const segments = urli.pathname.slice(1).split('/');

	const query = urli.searchParams;

	if (hostname === 'youtu.be') {
		const [videoId] = segments;
		const seek = query.get('t');

		if (videoId) {
			return {
				t: FeatureType.YOUTUBE_VIDEO,
				s: FeatureSource.YOUTUBE,
				f: FeatureFlags.IS_IFRAME,
				u: `https://youtube.com/embed/${videoId}?start=${seek || 0}&autoplay=1&playsinline=1`,
			};
		}
	}

	if (hostname === 'youtube.com') {
		const [page, maybeShortsId] = segments;

		const isShorts = page === 'shorts';
		const isVideo = page === 'watch';

		const videoId = isShorts ? maybeShortsId : isVideo ? query.get('v') : null;
		const seek = query.get('t');

		if (videoId) {
			return {
				t: isShorts ? FeatureType.YOUTUBE_SHORT : FeatureType.YOUTUBE_VIDEO,
				s: FeatureSource.YOUTUBE,
				f: FeatureFlags.IS_IFRAME,
				u: `https://youtube.com/embed/${videoId}?start=${seek || 0}&autoplay=1&playsinline=1`,
			};
		}
	}

	if (hostname === 'tenor.com') {
		const [pageOrLang, pageOrGif, maybeGif] = segments;

		const gifId = pageOrGif === 'view' ? maybeGif : pageOrLang === 'view' ? pageOrGif : null;

		if (gifId) {
			return {
				t: FeatureType.TENOR_GIF,
				s: FeatureSource.TENOR,
				f: FeatureFlags.IS_GIF | FeatureFlags.HIDE_DETAILS,
				u: `https://tenor.com/view/${gifId.replace(/\.gif$/, '')}.gif`,
			};
		}
	}

	return null;
};
