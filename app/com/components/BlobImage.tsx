import { type ComponentProps, onCleanup } from 'solid-js';

export interface BlobImageProps extends Omit<ComponentProps<'img'>, 'src'> {
	src?: Blob | string;
}

interface BlobObject {
	u: string;
	c: number;
}

const map = new WeakMap<Blob, BlobObject>();

export const getBlobSrc = (src: Blob | string | undefined) => {
	if (!(src instanceof Blob)) {
		return src;
	}

	let obj = map.get(src)!;
	if (!obj) {
		map.set(src, (obj = { u: URL.createObjectURL(src), c: 0 }));
	}

	obj.c++;

	onCleanup(() => {
		if (--obj.c < 1) {
			URL.revokeObjectURL(obj.u);
			map.delete(src);
		}
	});

	return obj.u;
};

const BlobImage = (props: BlobImageProps) => {
	return <img {...props} src={getBlobSrc(props.src)} />;
};

export default BlobImage;
