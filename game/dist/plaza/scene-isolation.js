/**
 * A synchronous, render-only visibility lease. No scene node is moved or cloned,
 * and no visibility state survives a frame. Explicit `show` roots alone may be
 * revealed; hidden descendants retain their owners' visibility decisions.
 */
export function withSceneIsolation(scene, {keep=[], show=[], background=null}={}, draw) {
  if (!scene?.isScene || typeof draw!=='function') throw new TypeError('A scene and synchronous render callback are required');
  const belongs=node=>{for(let p=node;p;p=p.parent)if(p===scene)return true;return false;};
  const roots=new Set([...keep,...show].filter(node=>node&&node!==scene&&belongs(node)));
  scene.traverse(node=>{if(node.isLight)roots.add(node);});
  const paths=new Set([scene]);
  for(const root of roots)for(let p=root;p&&p!==scene;p=p.parent)paths.add(p);
  const changes=[];
  const set=(node,value)=>{if(node.visible===value)return;changes.push({node,before:node.visible,written:value});node.visible=value;};
  const prune=node=>{if(roots.has(node))return;for(const child of node.children){if(paths.has(child))prune(child);else set(child,false);}};
  const oldBackground=scene.background,oldFog=scene.fog;
  try {
    prune(scene);
    for(const root of show)if(roots.has(root))set(root,true);
    scene.background=background;scene.fog=null;
    return draw();
  } finally {
    // A render callback can itself change scene state. Restore only values this
    // lease still owns; newer, different writes are left to their own owner.
    for(let i=changes.length-1;i>=0;i--){const {node,before,written}=changes[i];if(node.visible===written)node.visible=before;}
    if(scene.background===background)scene.background=oldBackground;
    if(scene.fog===null)scene.fog=oldFog;
  }
}
