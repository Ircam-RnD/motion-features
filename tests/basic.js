import test from 'tape';
import { MotionFeatures, ZeroCrossingRate } from '../src/index';

test('motion features', (t) => {
  const kickCb = (res) => {
    console.log(`kick : ${res.state} - intensity : ${res.intensity}`);
  };

  const mf = new MotionFeatures({
    descriptors: [
      'accIntensity', 'kick', 'shake',
      'gyrIntensity', 'spin', 'still',
      'freefall'
    ],
    kickCallback: kickCb
  });

  //TODO: write actual tests from recorded file
  t.end();
});

test('zero crossing rate', (t) => {
  const zcr = new ZeroCrossingRate({ noiseThreshold: 0.05 });

  let crossings;

  crossings = zcr.process([ -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1 ]);
  //console.log(JSON.stringify(crossings));
  t.equal(crossings['frequency'], 1);
  t.equal(crossings['periodicity'], 1);

  crossings = zcr.process([ 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, -1 ]);
  //console.log(JSON.stringify(crossings));

  crossings = zcr.process([ 1, 0, 0, 0, 0, 0 ]);
  console.log(JSON.stringify(crossings));

  t.end();
});
