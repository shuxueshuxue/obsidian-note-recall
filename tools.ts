export function getRandomIndexes(arr: number[], n: number): number[] {
    const result = new Array(n);
    let len = arr.length;
    const taken = new Array(len);
    if (n > len) throw new RangeError("getRandomIndexes: more elements taken than available");
    while (n--) {
      const x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

function levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const d: number[][] = [];
  
    for (let i = 0; i <= m; i++) {
      d[i] = [i];
    }
  
    for (let j = 0; j <= n; j++) {
      d[0][j] = j;
    }
  
    for (let j = 1; j <= n; j++) {
      for (let i = 1; i <= m; i++) {
        if (a[i - 1] === b[j - 1]) {
          d[i][j] = d[i - 1][j - 1];
        } else {
          d[i][j] = Math.min(
            d[i - 1][j] + 1, // deletion
            d[i][j - 1] + 1, // insertion
            d[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }
  
    return d[m][n];
  }
  
export function similarity(a: string, b: string): number {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
  }
  
  
  
  
  
  