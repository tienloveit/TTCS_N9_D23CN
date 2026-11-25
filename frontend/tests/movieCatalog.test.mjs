import assert from 'node:assert/strict';
import test from 'node:test';
import { appendReviews, buildCatalogQuery } from '../src/utils/movieCatalog.js';

test('catalog query leaves out filters set to ALL or left blank', () => {
  assert.deepEqual(
    buildCatalogQuery({ search: '  ', status: 'ALL', genre: 'ALL', age: 'ALL', sort: 'DEFAULT', page: 1, size: 8 }),
    { sort: 'DEFAULT', page: 1, size: 8 }
  );
});

test('catalog query sends every chosen filter under the backend parameter names', () => {
  assert.deepEqual(
    buildCatalogQuery({ search: ' dune ', status: 'NOW_SHOWING', genre: '3', age: 'T13', sort: 'RATING', page: 2, size: 8 }),
    { sort: 'RATING', page: 2, size: 8, movieName: 'dune', status: 'NOW_SHOWING', genreId: '3', ageRating: 'T13' }
  );
});

test('a later review page skips reviews already on screen', () => {
  // Có người đánh giá mới giữa hai lần tải nên một đánh giá bị đẩy sang trang sau.
  const shown = [{ userId: 1 }, { userId: 2 }];
  const nextPage = [{ userId: 2 }, { userId: 3 }];
  assert.deepEqual(appendReviews(shown, nextPage), [{ userId: 1 }, { userId: 2 }, { userId: 3 }]);
});
