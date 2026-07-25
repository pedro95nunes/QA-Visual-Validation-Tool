import { InvalidReferenceException } from "../core/exceptions/invalid-reference.exception";

const PNG_HEADER_LENGTH = 24;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Extracts dimensions from a PNG image without depending on an image library. */
export function readPngDimensions(content: Uint8Array): { width: number; height: number } {
  const isPng = content.length >= PNG_HEADER_LENGTH && PNG_SIGNATURE.every((value, index) => content[index] === value);

  if (!isPng) {
    throw new InvalidReferenceException("Image content is not a valid PNG image.");
  }

  const dataView = new DataView(content.buffer, content.byteOffset, content.byteLength);
  return {
    width: dataView.getUint32(16),
    height: dataView.getUint32(20)
  };
}
