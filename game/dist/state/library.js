// Short original stories. Lending is pretend play saved only on this browser.
export const BOOKS={
 'pocket-star':{title:'별을 담은 주머니',color:'#bc8275',tag:'따뜻한 이야기',text:'도름이는 반짝이는 별을 주머니에 넣었어요. 집으로 가는 길, 어두운 꽃 한 송이를 만났지요. 별을 살짝 꺼내 비추자 꽃이 활짝 웃었어요. 주머니는 조금 가벼워졌지만 돌아오는 길은 더 환해졌답니다.'},
 'cloud-letter':{title:'구름에게 보낸 편지',color:'#89aabb',tag:'느긋한 이야기',text:'작은 구름은 오늘 어디로 갈지 몰랐어요. 도름이는 종이 위에 동그란 연못을 그려 보냈지요. 구름은 연못 위에 잠깐 머물렀어요. 물속에 비친 자신을 보고 처음으로 웃었답니다. 목적지가 없어도 쉬어 갈 곳은 있어요.'},
 'seed-chair':{title:'씨앗의 빈 의자',color:'#93aa7d',tag:'친구 이야기',text:'씨앗은 매일 빈 의자를 하나 놓았어요. 누가 올지는 몰랐지만 따뜻한 차도 준비했지요. 어느 날 바람이 앉아 쉬었고, 다음 날에는 나비가 찾아왔어요. 기다림은 혼자 있는 시간이 아니라, 누군가를 위한 자리를 만드는 일이었답니다.'}
};
export const initialLibrary=()=>({selectedBookId:'pocket-star',borrowedBookId:null,readBookIds:[]});
export function validateLibrary(raw){
 if(raw===undefined)return initialLibrary();
 if(!raw||Array.isArray(raw)||typeof raw!=='object'||(typeof raw.selectedBookId!=='string'||!Object.hasOwn(BOOKS,raw.selectedBookId))||!(raw.borrowedBookId===null||(typeof raw.borrowedBookId==='string'&&Object.hasOwn(BOOKS,raw.borrowedBookId)))||!Array.isArray(raw.readBookIds)||raw.readBookIds.some(id=>typeof id!=='string'||!Object.hasOwn(BOOKS,id))||new Set(raw.readBookIds).size!==raw.readBookIds.length)return null;
 return {selectedBookId:raw.selectedBookId,borrowedBookId:raw.borrowedBookId,readBookIds:[...raw.readBookIds]};
}
export function reduceLibrary(current=initialLibrary(),action){
 const valid=typeof action.bookId==='string'&&Object.hasOwn(BOOKS,action.bookId);
 switch(action.type){
  case 'SELECT_BOOK':return valid&&current.selectedBookId!==action.bookId?{...current,selectedBookId:action.bookId}:current;
  case 'READ_BOOK':return valid&&!current.readBookIds.includes(action.bookId)?{...current,readBookIds:[...current.readBookIds,action.bookId]}:current;
  case 'BORROW_BOOK':return valid&&current.borrowedBookId===null?{...current,borrowedBookId:action.bookId,selectedBookId:action.bookId}:current;
  case 'RETURN_BOOK':return current.borrowedBookId!==null?{...current,borrowedBookId:null}:current;
  default:return current;
 }
}

export function libraryReadingTarget(target,library=initialLibrary()){
 if(target?.roomId!=='library'||target.type!=='pose'||target.kind!=='read')return target;
 const bookId=library.selectedBookId,book=BOOKS[bookId];
 return {...target,bookId,discoveryId:bookId==='pocket-star'?'pocket-story':`library-${bookId}`,text:`「${book.title}」 ${book.text}`};
}
