export const BOARD_SIZE = 50;

// Where `score` would land on a board (users best first). The server keeps one entry per name, so
// when `name` already has an equal or higher entry the board wouldn't change: null. Also null when
// the score wouldn't make the top BOARD_SIZE.
export function placementOn(users, score, name = '') {
  const own = name.toLowerCase();
  const mine = own ? users.find(user => user.username.toLowerCase() === own) : null;
  if (mine && mine.score >= score) return null;
  const position = users.filter(user => user.username.toLowerCase() !== own && user.score > score).length + 1;
  return position <= BOARD_SIZE ? position : null;
}
