/**
 * ed.js - Multi-video TikTok embed & auto-sync script
 * Features:
 *  - Multiple TikTok videos
 *  - Auto-refresh / sync interval
 *  - Custom container IDs
 *  - Load TikTok embed.js only once
 */

const TikTokEmbed = (function() {
    let tiktokScriptLoaded = false;
    let videoList = [];
    let containerId = null;
    let refreshInterval = 0;
    let autoSyncTimer = null;
    let renderInProgress = false;
    let pendingRender = false;

    function isValidTikTokUrl(url) {
        if (typeof url !== 'string') return false;

        try {
            const parsed = new URL(url.trim());
            const host = parsed.hostname.toLowerCase();
            return host === 'tiktok.com' || host === 'www.tiktok.com' || host === 'm.tiktok.com' || host === 'vm.tiktok.com';
        } catch (_err) {
            return false;
        }
    }

    function normalizeVideos(videos) {
        if (!Array.isArray(videos)) return [];

        const unique = new Set();
        videos.forEach((url) => {
            if (typeof url !== 'string') return;
            const trimmed = url.trim();
            if (!trimmed || !isValidTikTokUrl(trimmed)) return;
            unique.add(trimmed);
        });

        return Array.from(unique);
    }

    function normalizeContainerId(targetContainerId) {
        if (typeof targetContainerId !== 'string') return null;
        const trimmed = targetContainerId.trim();
        if (!trimmed) return null;
        return trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    }

    function runTikTokParser() {
        if (typeof window === 'undefined') return;

        if (typeof window.tiktokEmbedLoad === 'function') {
            window.tiktokEmbedLoad();
            return;
        }

        if (window.tiktokEmbedLib && typeof window.tiktokEmbedLib.render === 'function') {
            window.tiktokEmbedLib.render();
        }
    }

    // Fetch TikTok oEmbed HTML
    async function fetchOEmbed(videoUrl) {
        try {
            const apiUrl = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(videoUrl);
            const res = await fetch(apiUrl);
            if (!res.ok) {
                throw new Error(`TikTok oEmbed request failed (${res.status})`);
            }

            const data = await res.json();
            if (!data || typeof data.html !== 'string') {
                throw new Error('TikTok oEmbed response missing html');
            }

            return data.html;
        } catch (err) {
            console.error("Failed to fetch TikTok oEmbed:", err);
            console.error('Failed to fetch TikTok oEmbed:', err);
            return `<p style="color:red;">Failed to load TikTok video: ${videoUrl}</p>`;
        }
    }

    // Render all videos
    async function renderVideos() {
        if (!containerId) return;

        if (renderInProgress) {
            pendingRender = true;
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '';
        for (let url of videoList) {
            html += await fetchOEmbed(url);
        }
        container.innerHTML = html;

        // Load TikTok embed.js once
        if (!tiktokScriptLoaded) {
            const script = document.createElement('script');
            script.src = "https://www.tiktok.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
            tiktokScriptLoaded = true;
        renderInProgress = true;
        pendingRender = false;

        try {
            if (videoList.length === 0) {
                container.innerHTML = '';
                return;
            }

            const embeds = await Promise.all(videoList.map((url) => fetchOEmbed(url)));
            container.innerHTML = embeds.join('');

            // Load TikTok embed.js once
            if (!tiktokScriptLoaded) {
                const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
                if (existingScript) {
                    tiktokScriptLoaded = true;
                } else {
                    const script = document.createElement('script');
                    script.src = 'https://www.tiktok.com/embed.js';
                    script.async = true;
                    script.onload = function() {
                        tiktokScriptLoaded = true;
                        runTikTokParser();
                    };
                    document.body.appendChild(script);
                    return;
                }
            }

            runTikTokParser();
        } finally {
            renderInProgress = false;

            if (pendingRender) {
                pendingRender = false;
                renderVideos();
            }
        }
    }

    // Start auto-sync
    function startAutoSync() {
        if (autoSyncTimer) {
            clearInterval(autoSyncTimer);
            autoSyncTimer = null;
        }

        if (refreshInterval > 0) {
            setInterval(renderVideos, refreshInterval);
            autoSyncTimer = setInterval(renderVideos, refreshInterval);
        }
    }

    // Stop auto-sync
    function stopAutoSync() {
        if (autoSyncTimer) {
            clearInterval(autoSyncTimer);
            autoSyncTimer = null;
        }
    }

    return {
        /**
         * Initialize TikTok embed system
         * @param {Array} videos - Array of TikTok video URLs
         * @param {string} targetContainerId - HTML container ID
         * @param {number} syncInterval - Auto-refresh interval in ms (optional)
         */
        init: function(videos, targetContainerId, syncInterval = 0) {
            videoList = videos;
            containerId = targetContainerId;
            refreshInterval = syncInterval;
            videoList = normalizeVideos(videos);
            containerId = normalizeContainerId(targetContainerId);
            refreshInterval = Math.max(0, Number(syncInterval) || 0);

            renderVideos();
            startAutoSync();
        },

        refresh: function() {
            return renderVideos();
        },

        stop: function() {
            stopAutoSync();
        }
    };
})();

if (typeof window !== 'undefined') {
    window.TikTokEmbed = TikTokEmbed;
}
