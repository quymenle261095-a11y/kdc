import Image, { type ImageProps } from 'next/image';

type PublicImageMode = 'hero' | 'primary' | 'thumb' | 'logo' | 'decorative';

type PublicImageProps = ImageProps & {
  mode?: PublicImageMode;
  unoptimized?: boolean;
};

const UNOPTIMIZED_MODES: Record<PublicImageMode, boolean> = {
  hero: false,
  primary: false,
  thumb: true,
  logo: true,
  decorative: true,
};

export function PublicImage({ mode = 'primary', unoptimized, ...props }: PublicImageProps) {
  const resolvedUnoptimized = unoptimized ?? UNOPTIMIZED_MODES[mode];
  return <Image unoptimized={resolvedUnoptimized} {...props} />;
}
