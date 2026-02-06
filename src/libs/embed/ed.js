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

    // Fetch TikTok oEmbed HTML
    async function fetchOEmbed(videoUrl) {
        try {
            const apiUrl = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(videoUrl);
            const res = await fetch(apiUrl);
            const data = await res.json();
            return data.html;
        } catch (err) {
            console.error("Failed to fetch TikTok oEmbed:", err);
            return `<p style="color:red;">Failed to load TikTok video: ${videoUrl}</p>`;
        }
    }

    // Render all videos
    async function renderVideos() {
        if (!containerId) return;
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
        }
    }

    // Start auto-sync
    function startAutoSync() {
        if (refreshInterval > 0) {
            setInterval(renderVideos, refreshInterval);
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

            renderVideos();
            startAutoSync();
        }
    };
})();
