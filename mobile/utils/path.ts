export function toNativeFilePath(uri: string): string {
  if (uri.startsWith("file://")) {
    return new URL(uri).pathname;
  }
  return uri;
}
