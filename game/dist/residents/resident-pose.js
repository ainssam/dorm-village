/** Shared local-part pose application; world navigation belongs to the game. */
export function applyResidentMotion(group,pose){
 const {parts,restPose}=group.userData;
 group.position.fromArray(pose.root.position);group.rotation.y=pose.root.yaw;
 for(const [role,p] of Object.entries(pose.parts)){
  const node=parts?.[role],rest=restPose?.[role];if(!node||!rest)continue;
  node.position.copy(rest.position);node.position.x+=p.position[0];node.position.y+=p.position[1];node.position.z+=p.position[2];
  node.rotation.copy(rest.rotation);node.rotation.x+=p.rotation[0];node.rotation.y+=p.rotation[1];node.rotation.z+=p.rotation[2];
  if(!rest.scale)rest.scale=node.scale.clone();node.scale.copy(rest.scale);node.scale.x*=p.scale[0];node.scale.y*=p.scale[1];node.scale.z*=p.scale[2];
 }
}
