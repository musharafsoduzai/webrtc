export function parseUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol;
    const host = parsedUrl.hostname;
    // Default ports based on protocol
    const defaultPort = protocol === "https:" ? "443" : "80";
    // Use the specified port or the default port
    const port = parsedUrl.port || defaultPort;

    // Host with protocol but without port
    const hostWithoutPort = `${protocol}//${host}`;

    // Determine if we should display the port in the URL
    const isDefaultPort =
      (port === "80" && protocol === "http:") ||
      (port === "443" && protocol === "https:");

    // Only include port in the string if it's not the default port
    const hostWithPort = isDefaultPort ? host : `${host}:${port}`;

    return {
      hostWithProtocol: `${protocol}//${hostWithPort}`,
      hostWithoutPort,
      port,
      host,
      // Adding full URL for convenience
      fullUrl: parsedUrl.toString(),
      // Adding path for convenience
      path: parsedUrl.pathname + parsedUrl.search,
    };
  } catch (error) {
    console.error(`URL parsing error:`, error);
    throw new Error(`Invalid URL provided: ${url}`);
  }
}
