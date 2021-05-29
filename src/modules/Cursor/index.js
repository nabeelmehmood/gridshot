import { useEffect, useRef } from "react";

const Cursor = () => {
  const cursorRef = useRef();

  const updatePosition = (e) => {
    if (cursorRef.current) {
      cursorRef.current.style.left = `${e.clientX}px`;
      cursorRef.current.style.top = `${e.clientY}px`;
    }
  };

  useEffect(() => {
    document.body.addEventListener("mousemove", updatePosition);
    return () => document.body.removeEventListener("mousemove", updatePosition);
  }, []);

  return <span ref={cursorRef} id="cursor" className="cursor"></span>;
};

export default Cursor;
