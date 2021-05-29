import "./index.scss";

const StartOverlay = () => {
  return (
    <div id="startOverlay">
      <h3 className="text">
        Click the yellow circle in the center to start. Press ESC to exit.
      </h3>
      <div id="startButton" />
    </div>
  );
};

export default StartOverlay;
