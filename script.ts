///<reference path="SoftEngine.ts"/>

let canvas: HTMLCanvasElement;
let device: SoftEngine.Device;
let mesh: SoftEngine.Mesh;
let meshes: SoftEngine.Mesh[] = [];
let camera: SoftEngine.Camera;

document.addEventListener("DOMContentLoaded", main, false);

function main() {
  canvas = <HTMLCanvasElement>document.getElementById("canvas");
  camera = new SoftEngine.Camera();
  device = new SoftEngine.Device(canvas);
  camera.Position = new BABYLON.Vector3(0, 0, 10);
  camera.Target = new BABYLON.Vector3(0, 0, 0);
  // console.log(camera)
  device.LoadJSONFileAsync("monkey.babylon", loadJSONCompleted);
  requestAnimationFrame(drawingLoop);
}

function loadJSONCompleted(meshesLoaded: SoftEngine.Mesh[]) {
  meshes = meshesLoaded;
  requestAnimationFrame(drawingLoop);
}

function drawingLoop() {
  device.clear();

  // mesh.Rotation.y = 0.05;

  for (let i = 0; i < meshes.length; i++) {
    meshes[i].Rotation.y += 0.002;
  }

  device.render(camera, meshes);
  device.present();

  requestAnimationFrame(drawingLoop);
}
