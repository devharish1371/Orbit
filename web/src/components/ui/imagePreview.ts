export type ImagePreview = { src: string; width: number; height: number }
export function imagePreview(
  element: HTMLElement | null,
): ImagePreview | undefined {
  const image = element?.querySelector('img')
  return image?.complete && !image.hidden && image.naturalWidth > 0
    ? {
        src: image.currentSrc || image.src,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }
    : undefined
}
