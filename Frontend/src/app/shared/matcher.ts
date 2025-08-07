const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

class RegExpEx extends RegExp {
  negated: boolean = false;
}

function escapeStringRegexp(str: string) {
  if (typeof str !== 'string') {
    throw new TypeError('Expected a string');
  }

  return str.replace(matchOperatorsRe, '\\$&');
}

const reCache = new Map();

function makeRe(pattern: RegExpEx, shouldNegate: boolean, options: { caseSensitive: boolean } = { caseSensitive: false }) {
  const opts = Object.assign({
    caseSensitive: false
  }, options);

  const cacheKey = pattern.source + shouldNegate + JSON.stringify(opts);

  if (reCache.has(cacheKey)) {
    return reCache.get(cacheKey);
  }

  const negated = ((pattern as unknown) as string)[0] === '!';

  if (negated) {
    pattern = new RegExpEx(((pattern as unknown) as string).slice(1));
  }

  pattern =new RegExpEx( escapeStringRegexp(pattern+'').replace(/\\\*/g, '.*'));

  if (negated && shouldNegate) {
    pattern = new RegExpEx(`(?!${pattern})`);
  }

  const re = new RegExpEx(`^${pattern}$`, opts.caseSensitive ? '' : 'i');
  re.negated = negated;
  reCache.set(cacheKey, re);

  return re;
}

export function matcher(inputs: string[], patterns: RegExpEx[], options?: { caseSensitive: boolean }) {
  if (!(Array.isArray(inputs) && Array.isArray(patterns))) {
    throw new TypeError(`Expected two arrays, got ${typeof inputs} ${typeof patterns}`);
  }

  if (patterns.length === 0) {
    return inputs;
  }

//   const firstNegated = (patterns[0][0]) === '!';
  const firstNegated = true;

  patterns = patterns.map(x => makeRe(x, false, options));

  const ret = [];

  for (const input of inputs) {
    // If first pattern is negated we include everything to match user expectation
    let matches = firstNegated;

    for (const pattern of patterns) {
        let patternRegex = new RegExp(pattern, "i");

      if (pattern.test(input)) {
        matches = !pattern.negated;
      }
    }

    if (matches) {
      ret.push(input);
    }
  }

  return ret;
}
export function isMatch(input: string, pattern: string, options?: { caseSensitive: boolean }): boolean {
  return makeRe(new RegExpEx(pattern), true, options).test(input);
}
