# Sky data credits

Bright-star data: HYG 4.1, David Nash / Astronomy Nexus.

- Author project: https://www.astronexus.com/projects/hyg
- Exact reviewed source: https://raw.githubusercontent.com/astronexus/HYG-Database/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg/CURRENT/hygdata_v41.csv
- Source license: https://github.com/astronexus/HYG-Database/blob/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg/CURRENT/LICENSE
- Dataset license: Creative Commons Attribution-ShareAlike 4.0 International, https://creativecommons.org/licenses/by-sa/4.0/

The catalog derivative retains this CC BY-SA 4.0 license. It is not MIT. This redistribution is a deterministic 1,024-star selection, field reduction/renaming and quality flags, with unchanged retained positions/velocities. Original catalog ID, Hipparcos ID and J2000 epoch are retained. Selection: all required authored guide endpoints, then ascending V magnitude, numeric HYG ID tie-break. The cutoff is V=4.61; 118,601 source stars are omitted. The 34 MB original source is build-time input only and is not requested by the viewer.

14 rows with distance >=100,000 pc use catalog J2000 RA/Dec without proper motion, and carry distance-unreliable-motion-omitted. Eight rows have small internal Cartesian-versus-RA/Dec discrepancies, 0.00109–0.00461 degrees; the original Cartesian direction/velocity is retained and explicitly flagged. These are included in the 0.1-degree validation budget. All other included Cartesian directions agree within 0.001 degrees. One distance-field/Cartesian-norm discrepancy is 0.0134%; normalization removes distance scale for stellar projection. The importer checks direction mismatch <0.01 degrees and norm difference <0.1%, and pins the source hash, rather than silently accepting changed source data.

HYG's author advertises 4.2 on the current project page, but the inspected official GitHub archive contains 4.1. This deliverable deliberately pins that reviewed 4.1 artifact; it does not claim to bundle 4.2.

Guide lines: DORMI-authored educational connections using retained HYG identifiers, 2026-10-05; distributed with this CC BY-SA 4.0 data derivative. They are optional diagrams, not IAU region boundaries or uniquely official constellation shapes. Big Dipper and Summer Triangle are asterisms. No planetarium line-art dataset was copied.

A visible credits entry must accompany the scientific viewer. Suggested short credit: “별 자료: HYG 4.1 · David Nash / Astronomy Nexus · CC BY-SA 4.0 (필터링·필드 축소). 천체 계산: Astronomy Engine · Don Cross · MIT.” Link this credits document and both licenses. Do not imply author endorsement.
