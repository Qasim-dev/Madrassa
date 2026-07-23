import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDivision } from '../constants/examEnums.js';

describe('examEnums', () => {
  it('computeDivision returns mumtaz for high scores', () => {
    assert.equal(computeDivision(85, 50), 'mumtaz');
  });

  it('computeDivision returns fail below passing threshold', () => {
    assert.equal(computeDivision(40, 50), 'fail');
  });

  it('computeDivision returns maqbool in mid range', () => {
    assert.equal(computeDivision(55, 50), 'maqbool');
  });
});
