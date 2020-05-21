# AgoraBabylonJS
A POC to show Agora working with Babylon.js

## How it works ##
The important things to know
* WebRTC Streams can function as the `srcObj` of a `<video />` 
* Agora's Web SDK uses WebRTC streams

To connect Agora to Babylon.js you need to create an empty `video` element and use it when creating a [BABYLON.VideoTexture](https://doc.babylonjs.com/api/classes/babylon.videotexture). Then create a material and assign the video texture as the material's `diffuseTexture` property. Next create a model and assign the video material as its `material` property.

> Note: in this example I use the streamId to create unique identifiers for each element in the DOM and Scene. The naming is important to help avoid collisions and ensure you are always getting the intended reference. 

```javascript
function createAgoraVideoPlane(scene, streamId, isLocal)
  var video = document.createElement('video');
  video.id = 'agoraVideo_' + streamId;
  video.setAttribute('webkit-playsinline', 'webkit-playsinline');
  video.setAttribute('playsinline', 'playsinline');
  // add video object to the DOM 
  document.querySelector('canvas').appendChild(video);

  // create the video texture
  var texturelName =  'agoraVideoTexture_' + streamId;
  var videoTexture = new BABYLON.VideoTexture(texturelName,video, scene, false, false);

  // create the material  
  var materialName =  'agoraVideoMaterial_' + streamId;
  var videoMaterial = new BABYLON.StandardMaterial(materialName, scene);  // set video texture as the src of the video material diffuse
  videoMaterial.diffuseTexture = videoTexture;
  videoMaterial.roughness = 1;
  videoMaterial.emissiveColor = new BABYLON.Color3.White();

  // Configure the 2D video plane
  var planeName = 'agoraVideoPlane_' + streamId;
  var planeYRotation = Math.PI; // rotate plane to display video correctly
  var planeOpts = {
    height: 5.4762, 
    width: 7.3967, 
    sideOrientation: BABYLON.Mesh.FRONTSIDE
  };  

  // use a flag to check if local stream
  if (isLocal) {
    planeOpts.sideOrientation = BABYLON.Mesh.BACKSIDE // display local video mirrored 
    planeYRotation = 0; // no need to flip mirrored video 
  }
    // Create the 2D plane that will be use to display the video texture
  var videoPlane = BABYLON.MeshBuilder.CreatePlane(planeName, planeOpts, scene);
  videoPlane.rotation.y = planeYRotation;
  var vidPos = new BABYLON.Vector3(0,0,0);
  videoPlane.position = vidPos;
  // assign video material as source for video plane material
  videoPlane.material = videoMaterial;
)
```
Once the stream `created`, `published` or `subscribed`,  get the corresponding `<video />` element, and set the stream as the `video`'s `srcObj`. 

```javascript
function connectStreamToVideo(agoraStream) {
  var streamId = agoraStream.getId() // get the stream ID
  var video = document.getElementById('agoraVideo_' + streamId); // get the video element
  video.srcObject = agoraStream.stream;// add video stream to video element as source
  // add a call back to play the video once the stream loads
  video.onloadedmetadata = () => {
    // ready to play video
    video.play();
  }
}
```
