export default {
  async fetch(request) {

    const url = new URL(request.url);
    const path = url.pathname;
    const id = url.searchParams.get("id");
    const proxyUrl = url.searchParams.get("url");
    const info = url.searchParams.get("info");

    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

    // 🔁 Proxy للـ playlists بس (.m3u8, .mpd, .key)
    if (proxyUrl) {
      const proxyExt = proxyUrl.split('?')[0].split('.').pop().toLowerCase();
      
      // لو ده segment فيديو (.ts, .mp4, .aac) → رجّعه مباشرة من غير proxy
      if (['ts', 'mp4', 'aac', 'webm', 'm4s'].includes(proxyExt)) {
        return Response.redirect(proxyUrl, 302);
      }

      // proxy للـ playlists والـ keys
      try {
        const proxyHeaders = new Headers();
        proxyHeaders.set("User-Agent", UA);
        proxyHeaders.set("Accept", "*/*");
        
        const range = request.headers.get("Range");
        if (range) proxyHeaders.set("Range", range);

        const resp = await fetch(proxyUrl, {
          headers: proxyHeaders,
          redirect: "follow"
        });

        const responseHeaders = new Headers();
        responseHeaders.set("Access-Control-Allow-Origin", "*");
        responseHeaders.set("Access-Control-Allow-Headers", "Range");
        responseHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range");
        
        const passThrough = ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"];
        for (const h of passThrough) {
          const val = resp.headers.get(h);
          if (val) responseHeaders.set(h, val);
        }

        return new Response(resp.body, {
          status: resp.status,
          headers: responseHeaders
        });
      } catch (e) {
        return new Response("Proxy error: " + e.message, { status: 502 });
      }
    }

    // 🔴 قنوات MPD
    if (path.endsWith(".mpd")) {
      const fileName = path.split("/").pop();
      const mpdChannels = {
        "bn_1.mpd": {
          url: "https://fastlyrwb-live.cdn.intigral-ott.net/bpk-tv/STCT1/wv-pr/manifest.mpd",
          drm: {
            type: "clearkey",
            keyId: "714c789c76686632652eefc19f18c3db",
            key: "962cee49ee9422b44a6c60a7999854ad"
          }
        }
      };

      const channel = mpdChannels[fileName];
      if (!channel) return new Response("MPD channel not found", { status: 404 });

      if (info === "1") {
        return new Response(JSON.stringify(channel, null, 2), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const resp = await fetch(channel.url, {
        headers: { "User-Agent": UA, "Referer": "https://www.google.com/" }
      });

      let text = await resp.text();
      const base = channel.url.substring(0, channel.url.lastIndexOf("/") + 1);

      text = text
        .replace(/<BaseURL>(.*?)<\/BaseURL>/g, (match, p1) => {
          let full = p1.startsWith("http") ? p1 : base + p1;
          return `<BaseURL>${url.origin}/?url=${encodeURIComponent(full)}</BaseURL>`;
        })
        .replace(/(media|initialization)="([^"]+)"/g, (match, attr, link) => {
          let full = link.startsWith("http") ? link : base + link;
          return `${attr}="${url.origin}/?url=${encodeURIComponent(full)}"`;
        });

      return new Response(text, {
        headers: { "Content-Type": "application/dash+xml", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 🟢 قنوات HLS
    const channels = {
      "bmax1": "https://tinyurl.com/8a498cvu",
      "bmax2": "https://tinyurl.com/2nh7rmsn",
      "beIN_4k": "https://bit.ly/beIN_4k",
      "01": "https://player.kianezidi.workers.dev/play.m3u8?id=154472&cat=7031",
      "02": "https://player.kianezidi.workers.dev/play.m3u8?id=154473&cat=7031",
      "03": "https://player.kianezidi.workers.dev/play.m3u8?id=154474&cat=7031",
      "04": "https://player.kianezidi.workers.dev/play.m3u8?id=154475&cat=7031",
      "05": "https://player.kianezidi.workers.dev/play.m3u8?id=116904&cat=4524",
      "06": "https://player.kianezidi.workers.dev/play.m3u8?id=116905&cat=4524",
      "07": "https://player.kianezidi.workers.dev/play.m3u8?id=116906&cat=4524",
      "08": "https://bit.ly/MULTI_OST8",
      "ALWAN1": "https://player.kianezidi.workers.dev/play.m3u8?id=156588&cat=7193",
      "ALWAN2": "https://player.kianezidi.workers.dev/play.m3u8?id=156589&cat=7193",
      "ALWAN3": "https://player.kianezidi.workers.dev/play.m3u8?id=156590&cat=7193",
      "ALWAN4": "https://player.kianezidi.workers.dev/play.m3u8?id=156591&cat=7193",
      "ALWAN5": "https://player.kianezidi.workers.dev/play.m3u8?id=156592&cat=7193",
      "ALWAN6": "https://player.kianezidi.workers.dev/play.m3u8?id=156593&cat=7193",
      "beIN_1_AP": "https://bit.ly/beIN1AP",
      "MULTI_1": "https://bit.ly/bEMULTI_1",
      "b1_4K": "https://bdix.spidy.online/MAC/SBHGOLD/play.php?id=1389576",
      "b2_4K": "https://lookfastserver.looktvproappserverfast3dmwppwi30081fjaalaoqmnvxzpaiqpetoqqelemg.workers.dev/2.m3u8",
      "b3_4K": "https://tinyurl.com/27l4l6ss",
      "bmax1_4K": "https://bit.ly/bmax1_4K",
      "bmax2_4K": "https://bdix.spidy.online/MAC/SBHGOLD/play.php?id=1389575",
      "TOD1": "https://github.com/himasabry/xpola-player/raw/refs/heads/main/TOD1.m3u8"
    };

    if (!id) return new Response("Missing id", { status: 400 });

    const streamUrl = channels[id];
    if (!streamUrl) return new Response("Channel not found", { status: 404 });

    const response = await fetch(streamUrl, {
      headers: { "User-Agent": UA, "Accept": "*/*" },
      redirect: "follow"
    });

    const finalUrl = response.url;
    const text = await response.text();
    const base = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);

    // 🔥 rewrite m3u8: playlists تتعمل proxy، segments تتجيب مباشرة
    const modified = text.split('\n').map(line => {
      line = line.trim();
      if (!line || line.startsWith("#")) {
        // معالجة EXT-X-KEY
        if (line.startsWith("#EXT-X-KEY")) {
          return line.replace(/URI="([^"]+)"/g, (match, uri) => {
            let full = uri.startsWith("http") ? uri : base + uri;
            return `URI="${url.origin}/?url=${encodeURIComponent(full)}"`;
          });
        }
        return line;
      }
      
      // تحويل لـ URL مطلق
      let absoluteUrl;
      if (line.startsWith("http")) {
        absoluteUrl = line;
      } else if (line.startsWith("//")) {
        absoluteUrl = "https:" + line;
      } else {
        absoluteUrl = base + line;
      }
      
      const ext = absoluteUrl.split('?')[0].split('.').pop().toLowerCase();
      
      // لو playlist (.m3u8) → proxy عشان نكمل rewrite
      if (ext === 'm3u8') {
        return `${url.origin}/?url=${encodeURIComponent(absoluteUrl)}`;
      }
      
      // لو segment (.ts, .mp4, .aac) → رجّعه مباشرة من غير proxy
      return absoluteUrl;
    }).join('\n');

    return new Response(modified, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Range"
      }
    });
  }
};
