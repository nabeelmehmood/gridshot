import { useCallback, useContext, useEffect, useState } from 'react';
import { GameContext, SCORE_CONSTATS } from '../Context';

const getRandom = list => {
  let randomNumber = Math.floor(Math.random() * 21);
  while (list.includes(randomNumber)) {
    randomNumber = Math.floor(Math.random() * 21);
  }
  return randomNumber;
};

const SphereGrid = ({ setScore = () => {} }) => {
  const [sphereList, setSphereList] = useState([]);

  useEffect(() => {
    const tempList = [];
    tempList.push(getRandom(tempList));
    tempList.push(getRandom(tempList));
    tempList.push(getRandom(tempList));
    setSphereList(tempList);
  }, []);
  console.log(sphereList);

  const Sphere = useCallback(
    ({ position, id }) => {
      return (
        <mesh
          onClick={e => {
            const id = e.object.sphereId;
            const newId = getRandom(sphereList);
            const newList = [...sphereList].filter(item => item !== id);
            newList.push(newId);
            setSphereList(newList);
            setScore(score => score + 1);
          }}
          sphereId={id}
          position={position}
        >
          <sphereGeometry args={[1, 32, 32]}/>
          <meshPhysicalMaterial color={'red'} />
        </mesh>
      );
    },
    [sphereList]
  );

  return (
    <group position={[0, 0, -9]}>
      {sphereList.includes(0) && <Sphere id={0} position={[9, 1, 0]} />}
      {sphereList.includes(1) && <Sphere id={1} position={[6, 1, 0]} />}
      {sphereList.includes(2) && <Sphere id={2} position={[3, 1, 0]} />}
      {sphereList.includes(3) && <Sphere id={3} position={[0, 1, 0]} />}
      {sphereList.includes(4) && <Sphere id={4} position={[-3, 1, 0]} />}
      {sphereList.includes(5) && <Sphere id={5} position={[-6, 1, 0]} />}
      {sphereList.includes(6) && <Sphere id={6} position={[-9, 1, 0]} />}

      {sphereList.includes(7) && <Sphere id={7} position={[9, 4, 0]} />}
      {sphereList.includes(8) && <Sphere id={8} position={[6, 4, 0]} />}
      {sphereList.includes(9) && <Sphere id={9} position={[3, 4, 0]} />}
      {sphereList.includes(10) && <Sphere id={10} position={[0, 4, 0]} />}
      {sphereList.includes(11) && <Sphere id={11} position={[-3, 4, 0]} />}
      {sphereList.includes(12) && <Sphere id={12} position={[-6, 4, 0]} />}
      {sphereList.includes(13) && <Sphere id={13} position={[-9, 4, 0]} />}

      {sphereList.includes(14) && <Sphere id={14} position={[9, 7, 0]} />}
      {sphereList.includes(15) && <Sphere id={15} position={[6, 7, 0]} />}
      {sphereList.includes(16) && <Sphere id={16} position={[3, 7, 0]} />}
      {sphereList.includes(17) && <Sphere id={17} position={[0, 7, 0]} />}
      {sphereList.includes(18) && <Sphere id={18} position={[-3, 7, 0]} />}
      {sphereList.includes(19) && <Sphere id={19} position={[-6, 7, 0]} />}
      {sphereList.includes(20) && <Sphere id={20} position={[-9, 7, 0]} />}
    </group>
  );
};

export default SphereGrid;
