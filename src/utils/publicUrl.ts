export function getPublicAppOrigin(
  currentOrigin: string,
  configuredOrigin?: string,
) {
  const configured = configuredOrigin?.trim();
  if (configured) {
    const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(configured)
      ? configured
      : `https://${configured}`;
    return withProtocol.replace(/\/+$/, "");
  }

  try {
    const currentUrl = new URL(currentOrigin);
    const isLoopback = currentUrl.hostname === "localhost"
      || currentUrl.hostname === "127.0.0.1"
      || currentUrl.hostname === "::1";

    if (isLoopback) return `http://${currentUrl.host}`;
  } catch {
    // Biarkan origin awal dipakai jika nilainya bukan URL absolut.
  }

  return currentOrigin.replace(/\/+$/, "");
}

export function buildPublicUrl(
  currentOrigin: string,
  pathAndQuery: string,
  configuredOrigin?: string,
) {
  const normalizedPath = pathAndQuery.startsWith("/")
    ? pathAndQuery
    : `/${pathAndQuery}`;
  return `${getPublicAppOrigin(currentOrigin, configuredOrigin)}${normalizedPath}`;
}
