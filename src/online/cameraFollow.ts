import type Phaser from 'phaser';

/** Packet refreshes must not restart follow: Phaser recenters on every startFollow call. */
export function onlineCameraFollow(camera:Phaser.Cameras.Scene2D.Camera,dungeon:boolean,house=false){
 let following:Phaser.GameObjects.GameObject|undefined;
 return {
  follow(target:Phaser.GameObjects.GameObject){
   if(following===target)return;
   following=target;
   // The actor anchor already interpolates tile movement; a second camera lag shifts it off centre.
   if(dungeon)camera.removeBounds();
   camera.startFollow(target,!dungeon,dungeon?1:.18,dungeon?1:.18);
   if(house)camera.setDeadzone(camera.width*.56,camera.height*.54);
   else camera.setDeadzone();
  },
  stop(){camera.stopFollow();following=undefined;}
 };
}
