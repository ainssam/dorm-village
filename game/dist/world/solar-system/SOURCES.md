# Solar-system inspector sources (Stage 1)

All binary assets in this directory are bundled static files. The inspector requests the selected catalog body's reviewed local image only; it never contacts the source site at runtime and does not send observer, date, student, or account data. Credits below are shown in the in-app source panel as well as here.

## Included observation-backed image maps

| Body | Local first LOD | Bytes / SHA-256 | Data type and honest limit |
| --- | --- | ---: | --- |
| Moon | `assets/moon/lroc-color-2k.jpg` | 457,942 / `f7130a1822681fa7512d7dcfd40db8c10b9ba4f06777910348698260ed7a2170` | LROC WAC 2048×1024 color mosaic; bands 643/566/415 nm assigned RGB and white-balanced toward human vision. Mainly 70°N–70°S; low-resolution monochrome LOLA albedo fills polar gaps. Aesthetically optimized, not for science analysis. NASA SVS CGI Moon Kit: https://svs.gsfc.nasa.gov/4720/. Credit: NASA's Scientific Visualization Studio; Visualizer Ernie Wright (USRA); Scientist Noah Petro (NASA/GSFC). Acknowledge LRO/LOLA and LROC WAC provenance. |
| Mars | `assets/mars/viking.jpg` | 972,896 / `12ec6bf02ebd42a246edc778cb2ce8c595b4d9f0892badf0bfff8abb2303c780` | Viking-derived 1440×720 image texture processed at USGS from the JPL/Caltech planetary-map database. This candidate has no height data and NASA does not specify natural-color channel calibration. NASA Mars image texture: https://science.nasa.gov/3d-resources/mars/. Credit: NASA/Jet Propulsion Laboratory & Caltech. |
| Jupiter | `assets/jupiter/opal-2019-2k.png` | 2,243,592 / `0def4093a1d98dfa00fc9c0d0a30207973f9705dd66a6ef00cd70faddb7f7109` | Hubble WFC3 2000×1000 atmospheric cloud map, assembled from multiple exposures observed 2019-06-27; coverage stops at 80° north and south. The source image's top and bottom black bands are preserved as missing map areas, not portrayed as the planet's true polar color. NASA-hosted map: https://science.nasa.gov/asset/hubble/jupiter-global-map-2019/. ESA/Hubble record for the same 2019 image: https://esahubble.org/images/heic1914b/ (395/502/631 nm). ESA/Hubble images are licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/. This bundle uses the NASA-hosted rendition of that same image work under that license; it does not claim byte-for-byte identity with the ESA-hosted file. Credit, unaltered: NASA, ESA, A. Simon (Goddard Space Flight Center), and M.H. Wong (University of California, Berkeley). The image is mapped onto an illustrative sphere; this is not an endorsement by NASA or ESA. |

## Reviewed but deliberately not bundled as first LOD

- Moon LOLA unsigned 16-bit elevation raster was reviewed (1440×720, 2,076,866 bytes; source https://svs.gsfc.nasa.gov/4720/). The verified conversion relative to the 1737.4 km reference radius is `(sample - 20,000) × 0.0005 km`, equivalently `sample × 0.0005 - 10 km`. The sample decoder is retained in `catalog.js`, but the raster is not applied as relief: the reviewed source page and TIFF metadata give no NODATA rule, so missing samples cannot safely be distinguished from elevations. No sentinel is guessed. This avoids telling learners that a speculative mask is real terrain.
- Mars MOLA elevation-color rendering is not included. The reviewed Mars image is a surface image texture only and is not an elevation layer.
- Saturn NASA VTAD GLB candidate (5,476,584 bytes / 5.22 MiB; https://science.nasa.gov/resource/saturn-3d-model/) exceeds the strict 5 MiB first-LOD budget and does not document embedded texture acquisition, date, filters, projection, or coverage. It is not loaded or presented as an observation. Stage 1 draws a smooth illustrative sphere with a simple geometric ring belt, clearly labelled as explanatory geometry; ring dimensions are not to scale. Cassini ISS PDS global FITS (about 74 MB; https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Aco_iss_global-maps&version=1.0) is not bundled. Its small browse PNG contains chart axes/title and is not a globe texture.

## Illustrative bodies with no Stage 1 surface/atmosphere map

These spheres are intentionally untextured and do not imply that a verified observation map was acquired:

- Mercury: no reviewed MESSENGER global map included. NASA background: https://science.nasa.gov/mercury/.
- Venus: no reviewed Magellan radar map included. NASA background: https://science.nasa.gov/venus/.
- Uranus: no reviewed global map included; no named storm pins or detailed zoom. NASA background: https://science.nasa.gov/uranus/.
- Neptune: no reviewed global map included; no named storm pins or detailed zoom. NASA background: https://science.nasa.gov/neptune/.

For the illustrative-only planets the 3D surface is a neutral, smooth explanatory sphere. The selected shape/lighting is not a reconstruction of the selected observation time, physical rotation, current cloud patterns, or natural color. No surface-location pins are supplied for any body in this first version.

## Asset handling

Files were copied byte-for-byte from the reviewed data-only pack at `/workspace/shared/celestial-asset-review/` after SHA-256 comparison. There are no generated, sharpened, colorized, or height-painted maps in this bundle. The source catalog keeps types distinct: image mosaics, atmospheric map, and illustration. See the [NASA media use guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) for NASA content reuse, credit, third-party material, and endorsement restrictions. No NASA or ESA logos are used.

## Plan rulings

- Ruling: Mercury and Venus Stage 1 maps are deferred because no verified local source assets were present in the reviewed asset set. Their models are explicitly illustrative, and the precise missing map is named above; cost if wrong: these two targets have less observational detail than the approved design's full-map ambition.
- Ruling: Saturn's GLB is not loaded because its measured 5.22 MiB size exceeds the automatic first-LOD budget and its texture provenance is undocumented. The lower-detail geometry keeps the target available without quietly charging more data or implying a verified Cassini texture; cost if wrong: Saturn lacks an observation-backed cloud map in Stage 1.
- Ruling: Moon LOLA height is decoded only through a tested conversion helper but is not applied as displacement while NODATA remains unknown. Cost if wrong: the moon is a smooth globe with a real color mosaic rather than a relief model.
