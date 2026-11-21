export function isCompactLibraryViewport(viewport){
 return Boolean(viewport?.width>0&&viewport.width<=520&&viewport.height>viewport.width*1.25);
}

// A tall phone cannot keep the whole library floor readable at once. Follow the
// visitor on a fixed-height slice while the room-fit control keeps the full view.
export function compactLibraryFrame(frame){
 const {bounds,camera}=frame;
 return {
  ...frame,
  camera:{
   ...camera,
   follow:true,
   focusPlayer:true,
   focusHeight:22,
   followBounds:{
    minX:bounds.min.x+.8,maxX:bounds.max.x-.8,
    minZ:bounds.min.z+.8,maxZ:bounds.max.z-.8,
   }
  }
 };
}
