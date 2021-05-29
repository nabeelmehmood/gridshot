import { useFrame, useThree } from "@react-three/fiber";
import { Clock } from "three";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls";

const clock = new Clock();
let controls = null;
const Controls = () => {
  const { camera, gl } = useThree();
  if (!controls) {
    controls = new FirstPersonControls(camera, gl.domElement);
    controls.lookSpeed = 1;
    controls.movementSpeed = 0;
    controls.noFly = true;
    controls.lookVertical = true;
    controls.constrainVertical = true;
    controls.verticalMin = 1.0;
    controls.verticalMax = 2.0;
    controls.lon = -150;
    controls.lat = 120;
    controls.handleResize();
  }
  useFrame(() => {
    if (controls) {
      controls.update(clock.getDelta() * 1);
    }
  });
  return null;
};

export default Controls;
