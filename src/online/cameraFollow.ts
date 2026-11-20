import type Phaser from 'phaser';

/** Packet refreshes must not restart follow: Phaser recenters on every startFollow call. */
export function onlineCameraFollow(camera:Phaser.Cameras.Scene2D.Camera,dungeon:boolean){
 let following:Phaser.GameObjects.GameObject|undefined;
 return {
  follow(target:Phaser.GameObjects.GameObject){
   if(following===target)return;
   following=target;
   camera.startFollow(target,true,.18,.18);
   if(dungeon)camera.setDeadzone(camera.width*.56,camera.height*.54);
   else camera.setDeadzone();
  },
  stop(){camera.stopFollow();following=undefined;}
 };
}
