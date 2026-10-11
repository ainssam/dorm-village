export const CAFE_MENU=Object.freeze({
 milkRoll:{label:'우유빵',icon:'🥖',kind:'bread',price:8,cost:2,bakeMs:8000,color:'#dda45e'},
 croissant:{label:'크루아상',icon:'🥐',kind:'bread',price:12,cost:3,bakeMs:10000,color:'#cb8845'},
 miniCake:{label:'딸기 케이크',icon:'🍰',kind:'bread',price:16,cost:4,bakeMs:12000,color:'#edaaa1'},
 herbTea:{label:'허브차',icon:'🍵',kind:'drink',price:6,cost:1,brewMs:5000,color:'#91b679'},
 cocoa:{label:'코코아',icon:'☕',kind:'drink',price:8,cost:2,brewMs:7000,color:'#9d7355'}
});
export const CAFE_UPGRADES=Object.freeze({warmOven:{label:'황동 오븐',cost:32,description:'굽는 시간 3초 단축'},wideDisplay:{label:'두 층 진열장',cost:55,description:'빵 자리 3개 → 5개'},cozyCorner:{label:'포근한 창가',cost:85,description:'주문마다 감사 코인 +1'}});
export const CAFE_RESIDENTS=Object.freeze(['chinchilla','armadillo','capybara']);
export const CAFE_NAMES=Object.freeze({chinchilla:'친칠라',armadillo:'아르마딜로',capybara:'카피바라'});
export const CAFE_DAY_MS=180000;
const DAY_ONE=[['milkRoll','herbTea'],['croissant','cocoa'],['miniCake'],['milkRoll','cocoa'],['croissant','herbTea'],['miniCake','cocoa']];
export function orderRecipes(day,ordinal){if(day===1)return DAY_ONE[ordinal-1];const variants=[['croissant','milkRoll'],['cocoa','herbTea'],['miniCake','herbTea'],['croissant','cocoa'],['milkRoll','milkRoll'],['miniCake','cocoa']];return variants[(ordinal-1+(day-2)*5)%6];}
export function orderItems(day,ordinal){return orderRecipes(day,ordinal).reduce((out,id)=>(out[id]=(out[id]??0)+1,out),{});}
export const menuKeys=Object.keys(CAFE_MENU);
