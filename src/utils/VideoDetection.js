// ===== Video Detection Utils =====

const SUPPORTED_PLATFORMS = ['youtube.com', 'netflix.com', 'primevideo.com', 'disneyplus.com', 'instagram.com', 'tiktok.com', 'coursera.org', 'zeteo.com'];

/**
 * Check if a hostname is a domain or one of its subdomains.
 * Substring checks like url.includes('youtube.com') are spoofable
 * (e.g. https://evil.com/youtube.com/watch), so trust decisions must
 * be based on the parsed hostname only.
 */
function matchesDomain(hostname, domain) {
    return hostname === domain || hostname.endsWith('.' + domain);
}

/**
 * Check if the URL is a video player URL
 * @param {string} url - The URL to check
 * @returns {number} - 0: no video player, 1: first handling platform, 2: second handling platform, 3: tiktok (special handling), 4: instagram reels (special handling), 5: instagram feed (special handling), 6: tiktok feed (special handling), -1: iframe
 */
export function isVideoPlayerURL(url) {
    if (!url) return 0;

    let parsed;
    try {
        parsed = new URL(url);
    } catch (e) {
        return 0;
    }
    // Only http(s) pages can host videos we handle
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 0;

    const hostname = parsed.hostname;
    const pathname = parsed.pathname;

    if (matchesDomain(hostname, 'youtube.com')) {
        return (pathname.startsWith('/watch') || pathname.startsWith('/shorts')) ? 1 : 0;
    }

    if (matchesDomain(hostname, 'netflix.com')) {
        // miniDpPlayButton marks the browse-page mini player, not a watch page
        return (pathname.startsWith('/watch') && !parsed.search.includes('miniDpPlayButton')) ? 1 : 0;
    }

    if (matchesDomain(hostname, 'disneyplus.com')) {
        return pathname.includes('play') ? 1 : 0;
    }

    if (matchesDomain(hostname, 'coursera.org')) {
        return pathname.includes('lecture') ? 1 : 0;
    }

    if (matchesDomain(hostname, 'zeteo.com')) {
        return pathname.startsWith('/p') ? 1 : 0;
    }

    if (matchesDomain(hostname, 'primevideo.com')) {
        return pathname.includes('detail') ? 2 : 0;
    }

    if (matchesDomain(hostname, 'tiktok.com')) {
        return pathname.startsWith('/@') ? 3 : 6;
    }

    if (matchesDomain(hostname, 'instagram.com')) {
        return pathname.startsWith('/reels') ? 4 : 5;
    }

    return SUPPORTED_PLATFORMS.some(domain => matchesDomain(hostname, domain)) ? 0 : -1; // -1: iframe fallback
}
