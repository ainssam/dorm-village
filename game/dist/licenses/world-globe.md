# Dormi physical globe

Physical land data: Natural Earth, public domain. Original dataset: `ne_110m_land`, 1:110 million, revision `ca96624a56bd078437bca8184e78163e5039ad19` of https://github.com/nvkelso/natural-earth-vector.

Original GeoJSON SHA-256: `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`.

The globe is independently rasterized as a full-extent 1024 × 512 equirectangular land/ocean texture, with no country borders or labels. The map's source geometry, islands, antimeridian and poles are retained at the source dataset's resolution. The Equal Earth wall-map image is not used as a sphere texture.

Full Natural Earth notice: [world-map-natural-earth.md](./world-map-natural-earth.md). Terms: https://www.naturalearthdata.com/about/terms-of-use/.

The original wood/brass pedestal and globe geometry are authored for Dormi. The texture is built with D3 Geo 3.1.1 (ISC) and resvg-js 2.6.2 (MPL-2.0); these are build-time tools and do not ship in the runtime. Their retained license files are under `source/world-map/licenses/` in the source distribution.
