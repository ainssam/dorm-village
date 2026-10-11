# Astronomy Engine provenance

Astronomy Engine 2.1.19 by Don Cross, MIT licensed. Pinned package comes from its official npm registry listing: https://registry.npmjs.org/astronomy-engine/2.1.19 . The registry manifest names the official repository https://github.com/cosinekitty/astronomy and the fixed tarball https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-2.1.19.tgz . Retrieved 2026-10-05.

The downloaded archive's SHA-512 matches registry integrity exactly:
sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==

vendor/astronomy-engine-2.1.19.js is byte-for-byte package/esm/astronomy.js. The runtime minified ES module was generated using existing esbuild 0.25.10 with --minify --format=esm --legal-comments=inline. Its preserved MIT notice is present in both files. No upstream code was edited. No postinstall scripts or package dependencies were executed/installed. Exact file hashes are in SHA256SUMS.txt and integrity-manifest.json.

Primary API docs rechecked against pinned release and package README: https://github.com/cosinekitty/astronomy/blob/v2.1.19/source/js/README.md . Official body-position example: https://raw.githubusercontent.com/cosinekitty/astronomy/v2.1.19/demo/browser/positions.html . We intentionally pass null for Horizon refraction, unlike the example's normal atmosphere. Equator(body,time,observer,true,true) yields topocentric of-date coordinates. In the pinned engine, Sun/planets use aberration/light-time correction, while the Moon branch directly uses the library lunar model before topocentric transformation; this is a topocentric lunar approximation, not a claim that the Moon follows the same correction pipeline. Stars use Rotation_EQJ_HOR and RotateVector, never the eight mutable DefineStar slots. HOR axes are north, west, up, converted once to east, north, up. Illumination.phase_fraction is geocentric, not the topocentric Horizons quantity-10 value.
