import type { Signal } from './signals.ts';

const MAX_SIZE = 1_000_000; // 1 MB

const POST_MAX_HEIGHT = 2_000;
const POST_MAX_WIDTH = 2_000;

export interface ImageResult {
	width: number;
	height: number;
	size: number;
}

export interface CompressResult {
	blob: Blob;
	quality: number;
	after: ImageResult;
	before: ImageResult;
}

export interface PendingImage extends CompressResult {
	name: string;
}

export interface ComposedImage {
	blob: Blob;
	ratio: {
		width: number;
		height: number;
	};
	alt: Signal<string>;
}

export interface CompressProfileImageOptions {
	aspectRatio: number;
	maxWidth: number;
	maxHeight: number;
}

export const compressPostImage = async (blob: Blob): Promise<CompressResult> => {
	const image = await getImageFromBlob(blob);

	if (blob.size < MAX_SIZE) {
		const ref: ImageResult = {
			width: image.naturalWidth,
			height: image.naturalHeight,
			size: blob.size,
		};

		return {
			blob: blob,
			quality: 100,
			after: ref,
			before: ref,
		};
	}

	const { canvas, w, h } = getResizedImage(image, POST_MAX_WIDTH, POST_MAX_HEIGHT, Crop.CONTAIN);
	const large = blob.size > 1_500_000;

	for (let q = large ? 90 : 100; q >= 70; q -= 10) {
		const result = await canvas.convertToBlob({
			// WEBP yields a smaller image size on average
			type: 'image/webp',
			quality: q / 100,
		});

		if (result.size < MAX_SIZE) {
			return {
				blob: result,
				quality: q,
				after: {
					width: w,
					height: h,
					size: result.size,
				},
				before: {
					width: image.naturalWidth,
					height: image.naturalHeight,
					size: blob.size,
				},
			};
		}
	}

	throw new Error(`Unable to compress image according to criteria`);
};

export const compressProfileImage = async (
	blob: Blob,
	maxW: number,
	maxH: number,
): Promise<CompressResult> => {
	const image = await getImageFromBlob(blob);

	if (blob.size < MAX_SIZE) {
		const ref: ImageResult = {
			width: image.naturalWidth,
			height: image.naturalHeight,
			size: blob.size,
		};

		return {
			blob: blob,
			quality: 100,
			after: ref,
			before: ref,
		};
	}

	const { canvas, w, h } = getResizedImage(image, maxW, maxH, Crop.COVER);
	const large = blob.size > 1_500_000;

	for (let q = large ? 90 : 100; q >= 70; q -= 10) {
		const result = await canvas.convertToBlob({
			// Profile avatars and banners only accepts PNG and JPEG
			type: 'image/jpeg',
			quality: q / 100,
		});

		if (result.size < MAX_SIZE) {
			return {
				blob: result,
				quality: q,
				after: {
					width: w,
					height: h,
					size: result.size,
				},
				before: {
					width: image.naturalWidth,
					height: image.naturalHeight,
					size: blob.size,
				},
			};
		}
	}

	throw new Error(`Unable to compress image according to criteria`);
};

export const getImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		const image = document.createElement('img');

		if (!blob.type.startsWith('image/')) {
			return reject(new Error(`Blob is not an image`));
		}

		image.onload = () => {
			resolve(image);
		};
		image.onerror = () => {
			reject(new Error(`Failed to load image`));
		};

		reader.onload = () => {
			image.src = reader.result as string;
		};
		reader.onerror = () => {
			reject(new Error(`Failed to load image`));
		};

		reader.readAsDataURL(blob);
	});
};

const enum Crop {
	CONTAIN,
	COVER,
	STRETCH,
}

export const getResizedImage = (img: HTMLImageElement, width: number, height: number, mode: Crop) => {
	let w = img.naturalWidth;
	let h = img.naturalHeight;

	let scale = 1;
	if (mode === Crop.COVER) {
		scale = w < h ? width / w : height / h;
	} else if (mode === Crop.CONTAIN) {
		scale = w > h ? width / w : height / h;
	}

	w = Math.floor(w * scale);
	h = Math.floor(h * scale);

	const canvas = new OffscreenCanvas(w, h);
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		throw new Error(`Failed to compress image, unable to create canvas`);
	}

	ctx.drawImage(img, 0, 0, w, h);

	return { canvas, ctx, w, h };
};
