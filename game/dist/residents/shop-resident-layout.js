const descriptor=(id,name,role,radius,action,speed,points,text,talkAt=null)=>{const path=Object.freeze(points.map(([x,z,yaw=0])=>Object.freeze({x,z,yaw})));return Object.freeze({id,name,role,radius,action,speed,path,home:path[0],interactionRadius:1.75,text,...(talkAt?{talkAt,interactionRadius:1.35}:{})});};
// Small, full-envelope routes stay away from the central work approach and door lane.
// The baker works beside the counter; guest paths and chair reservations remain separate.
export const SHOP_ROOM_RESIDENTS=Object.freeze({
 bakeryCafe:Object.freeze([descriptor('cafe-dog','밀구름 강아지','빵을 굽는 카페 친구',.75,'knead',.24,[[2.50,-.10],[2.70,-.25],[2.65,.08]],'우유빵 반죽을 준비하고 있어요. 앞의 작업대에서 주문을 받고, 반죽하고, 오븐에 구워 보세요. 손님이 앉을 자리는 비워 둘게요.')]),
 workshop:Object.freeze([descriptor('craft-beaver','공방 비버','액자를 다듬는 공방 친구',.78,'inspect-frame',.25,[[-2.6,.35],[-2.6,1.5],[-1.55,1.85]],'나무 액자에 작은 풍경을 담았어요. 공원에서 꽃잎을 모아 오면 가운데 작업대에서 꽃병이나 리스를 만들 수 있어요. 만든 장식은 도름이 집에 놓아 봐요.')]),
 postOffice:Object.freeze([descriptor('post-penguin','우편 펭귄','편지를 분류하는 우체국 친구',.80,'sort-letter',.27,[[-2.65,.35],[-2.6,1.6],[-1.5,1.85]],'도착한 편지에 봉인을 붙이고 있어요. 가운데 편지 쓰는 자리에서 마을 친구에게 안부를 전해 보세요. 이곳의 편지와 답장은 게임 안에서만 오가요.')]),
 photoStudio:Object.freeze([descriptor('photo-fox','사진사 여우','한 장을 기다리는 사진관 친구',.76,'camera-shutter',.26,[[-3,1.4],[-2.7,2.4],[-1.75,2.0]],'빛이 포근하게 들어왔어요. 촬영 자리에서 배경과 포즈, 함께 찍을 친구를 골라 보세요. 마음에 든 사진은 액자로 만들어 집 벽에 걸 수 있어요.')])
});
