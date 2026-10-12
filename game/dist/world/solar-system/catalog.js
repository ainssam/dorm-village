const nasa='https://science.nasa.gov/';
const picture=(text,url)=>Object.freeze({text,url});
const body=(id,label,category,kind,url,credit,coverage,limitations,{colorMap=null,assetFile=null,assetBytes=null,observedAt=null,filter='관측 필터 없음 · 설명용 모형',maxZoom=1.5,highlights=[],heightMap=null,heightEncoding=null,ringModel=null,relatedSourceUrl=null,licenseUrl=null,licenseText=null}={})=>Object.freeze({
 id,label,category,
 render:Object.freeze({colorMap,heightMap,heightEncoding:heightEncoding??Object.freeze({enabled:false,nodata:'not applicable'}),ringModel}),
 source:Object.freeze({kind,url,credit,observedAt,filter,coverage,limitations,assetFile,assetBytes,relatedSourceUrl,licenseUrl,licenseText}),
 maxZoom,highlights:Object.freeze(highlights),pins:Object.freeze([])
});

export const TELESCOPE_BODY_IDS=Object.freeze(['Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune']);
export const BODY_CATALOG=Object.freeze({
 Moon:body('Moon','달','observed-map','image-mosaic','https://svs.gsfc.nasa.gov/4720/','NASA’s Scientific Visualization Studio; Visualizer Ernie Wright (USRA); Scientist Noah Petro (NASA/GSFC). LRO/LOLA and LROC WAC data.','LROC WAC 색상 지도는 북위 70°에서 남위 70°까지가 주된 범위예요. 극지의 빈 곳은 해상도가 낮은 흑백 LOLA 명암 지도로 채워져요.','보기 좋게 색을 조정한 지도라 정밀 과학 분석용은 아니에요. 높이 자료에서 빠진 값(NODATA)을 표시하는 규칙을 확인할 수 없어, 잘못된 높낮이를 넣지 않도록 실제 지형 기복은 표시하지 않아요.',{
  colorMap:'./assets/moon/lroc-color-2k.jpg',assetFile:'lroc-color-2k.jpg',assetBytes:457942,maxZoom:1.8,filter:'643/566/415 nm WAC 관측을 R/G/B 색상에 배치하고 사람 눈에 가깝게 색 균형을 조정했어요.',
  heightEncoding:Object.freeze({enabled:false,format:'uint16',storedUnit:'half-meters',storedOffset:20000,referenceRadiusKm:1737.4,decode:'sample * 0.0005 - 10 km',nodata:'unknown'}),
  highlights:[picture('달 전체를 잇댄 색상 지도예요. 양극에는 해상도가 낮은 자료가 쓰였어요.','https://svs.gsfc.nasa.gov/4720/')]
 }),
 Mercury:body('Mercury','수성','illustrative','illustrative','https://science.nasa.gov/mercury/','관측 지도 없이 앱이 만든 설명용 모형이에요.','검토를 마친 수성 전역 지도는 이 버전에 넣지 않았어요.','매끈한 설명용 구체예요. 관측 표면 지도나 보정된 색, 지형 높낮이, 자전, 표면 위치 핀은 표시하지 않아요.',{maxZoom:1.15,highlights:[picture('수성에는 열을 오래 가둬 둘 두꺼운 대기가 거의 없어요.','https://science.nasa.gov/mercury/facts/')]}),
 Venus:body('Venus','금성','illustrative','illustrative','https://science.nasa.gov/venus/','관측 지도 없이 앱이 만든 설명용 모형이에요.','검토된 Magellan 레이더 지도는 이 버전에 넣지 않았어요.','매끈한 설명용 구체예요. 레이더 관측 지도나 자연색 표면 사진, 지형 높낮이, 자전, 표면 위치 핀은 표시하지 않아요.',{maxZoom:1.15,highlights:[picture('금성의 두꺼운 대기가 열을 가둬 태양계 행성 가운데 표면이 가장 뜨거워요.','https://science.nasa.gov/venus/facts/')]}),
 Mars:body('Mars','화성','observed-map','image-mosaic','https://science.nasa.gov/3d-resources/mars/','NASA/Jet Propulsion Laboratory & Caltech. Viking images processed at USGS, from the JPL/Caltech planetary-map database.','1440 × 720 전역 표면 이미지예요. 매끈한 구체에 사진을 입혀 보여 줘요.','사진 지도만 있고 검증된 고도 자료는 없어요. 그래서 이 구체에는 실제 지형의 높낮이를 넣지 않았어요. NASA가 자연색 보정 방식을 밝히지 않아 ‘사람 눈에 보이는 색 그대로’라고도 설명하지 않아요.',{
  colorMap:'./assets/mars/viking.jpg',assetFile:'viking.jpg',assetBytes:972896,maxZoom:1.6,
  highlights:[picture('화성의 거대한 협곡 지대인 마리너 계곡은 길이가 2,000 km가 넘어요.','https://science.nasa.gov/mars/facts/')]
 }),
 Jupiter:body('Jupiter','목성','observed-map','atmosphere','https://science.nasa.gov/asset/hubble/jupiter-global-map-2019/','NASA, ESA, A. Simon (Goddard Space Flight Center), and M.H. Wong (University of California, Berkeley).','허블이 2019년 6월 27일 여러 번 찍은 대기 지도예요. 북위 80°보다 북쪽, 남위 80°보다 남쪽은 관측에서 빠졌어요. 그림 위·아래의 검은 띠는 이 빈 구역을 나타내요. 목성의 실제 색이 검다는 뜻은 아니에요.','구름 꼭대기를 담은 필터 합성 지도예요. 고체 표면 사진이나 지금 날씨가 아니에요. 395, 502, 631 nm 빛을 합쳐 색을 만들었어요. 관측되지 않은 양극 부분은 검은 빈 구역으로 남겨 두었어요.',{
  colorMap:'./assets/jupiter/opal-2019-2k.png',assetFile:'opal-2019-2k.png',assetBytes:2243592,observedAt:'2019-06-27',filter:'허블 WFC3의 395, 502, 631 nm 광학 필터 합성 색상',maxZoom:1.7,relatedSourceUrl:'https://esahubble.org/images/heic1914b/',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',licenseText:'ESA/Hubble 자료 기록은 이 2019 목성 지도 이미지에 CC BY 4.0 사용 조건을 명시해요. 앱에는 NASA 사이트에서 내려받은 같은 지도 이미지의 제공용 파일을 사용하며, 두 파일 바이트가 같다고 주장하지 않아요. 전체 크레딧은 원문 그대로 유지했어요.',
  highlights:[picture('여러 허블 관측을 합쳐 만든 2019년 목성 대기 지도예요.','https://science.nasa.gov/asset/hubble/jupiter-global-map-2019/'),picture('대적점은 목성 대기에 오래 머물러 온 거대한 폭풍이에요.','https://science.nasa.gov/jupiter/facts/')]
 }),
 Saturn:body('Saturn','토성','illustrative','illustrative','https://science.nasa.gov/resource/saturn-3d-model/','설명용 구체와 고리는 앱에서 만든 기하 모형이에요. NASA VTAD의 GLB는 포함하지 않았어요.','작게 내려받을 수 있는 검증된 토성 관측 지도는 넣지 않았어요. NASA 3D 파일은 5.22 MiB로 첫 자동 지도 목표인 5 MiB를 넘고, 안에 든 색 지도의 관측 출처도 확인되지 않았어요. Cassini 자료는 약 74 MB라 포함하지 않았어요.','설명용 구체와 단순화한 고리 모형이에요. Cassini 관측 지도나 출처가 검증된 색 지도, 현재 구름, 실제 비율의 고리, 자전, 표면 위치 핀은 없어요.',{
  maxZoom:1.35,ringModel:'얼음·먼지 입자 띠를 단순화한 기하 모형이며, 실제 크기와 두께를 나타내지 않아요.',
  highlights:[picture('토성 고리는 얼음과 암석 알갱이가 아주 많이 모여 이루어져 있어요.','https://science.nasa.gov/saturn/facts/')]
 }),
 Uranus:body('Uranus','천왕성','illustrative','illustrative','https://science.nasa.gov/uranus/','관측 지도 없이 앱이 만든 설명용 모형이에요.','검토를 마친 천왕성 전역 지도는 이 버전에 넣지 않았어요.','매끈한 설명용 구체예요. 관측 지도나 자세한 구름 모습, 자전, 표면 위치 핀은 표시하지 않아요.',{maxZoom:1,highlights:[picture('천왕성은 다른 행성들과 달리 옆으로 누운 듯한 축을 따라 돌아요.','https://science.nasa.gov/uranus/facts/')]}),
 Neptune:body('Neptune','해왕성','illustrative','illustrative','https://science.nasa.gov/neptune/','관측 지도 없이 앱이 만든 설명용 모형이에요.','검토를 마친 해왕성 전역 지도는 이 버전에 넣지 않았어요.','매끈한 설명용 구체예요. 관측 지도나 자세한 구름 모습, 자전, 표면 위치 핀은 표시하지 않아요.',{maxZoom:1,highlights:[picture('해왕성은 태양에서 가장 멀리 떨어진 행성이에요.','https://science.nasa.gov/neptune/facts/')]}),
});

/** Decode a reviewed LOLA uint16 sample relative to the 1737.4 km reference sphere. */
export function lolaHeightKm(sample){
 if(!Number.isInteger(sample)||sample<0||sample>65535)return null;
 return sample*0.0005-10;
}
