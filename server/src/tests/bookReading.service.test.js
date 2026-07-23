import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  READING_STATUS,
  computePagesRead,
  computeReadingPercentage,
  computeReadingStatus,
  pageRangesOverlap,
} from '../constants/readingEnums.js';

describe('readingEnums', () => {
  it('computePagesRead returns inclusive page count', () => {
    assert.equal(computePagesRead(1, 5), 5);
    assert.equal(computePagesRead(10, 10), 1);
  });

  it('pageRangesOverlap detects overlapping ranges', () => {
    assert.equal(pageRangesOverlap(1, 10, 5, 15), true);
    assert.equal(pageRangesOverlap(1, 5, 6, 10), false);
    assert.equal(pageRangesOverlap(6, 10, 1, 5), false);
    assert.equal(pageRangesOverlap(5, 10, 1, 5), true);
  });

  it('computeReadingStatus follows business rules', () => {
    assert.equal(computeReadingStatus(0, 100), READING_STATUS.NOT_STARTED);
    assert.equal(computeReadingStatus(25, 100), READING_STATUS.IN_PROGRESS);
    assert.equal(computeReadingStatus(100, 100), READING_STATUS.COMPLETED);
    assert.equal(computeReadingStatus(120, 100), READING_STATUS.COMPLETED);
  });

  it('computeReadingPercentage caps at 100', () => {
    assert.equal(computeReadingPercentage(50, 200), 25);
    assert.equal(computeReadingPercentage(200, 100), 100);
  });
});

describe('normalizePageRange logic', () => {
  it('endPage defaults to startPage for single page', () => {
    const end = 5;
    const start = 5;
    assert.equal(computePagesRead(start, end), 1);
  });
});
