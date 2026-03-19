/**
 * Rule Engine – Safe Condition Evaluator
 * Evaluates conditions like: "amount > 100 && priority == 'High'"
 * Uses a custom recursive descent parser – NO eval() or Function()
 */

class RuleEngine {
  /**
   * Evaluate a condition string against provided data context
   * @param {string} condition - e.g. "amount > 100 && priority == 'High'"
   * @param {Object} data - input data object
   * @returns {boolean}
   */
  evaluate(condition, data) {
    try {
      const tokens = this.tokenize(condition);
      const parser = new Parser(tokens, data);
      return parser.parse();
    } catch (err) {
      console.error(`[RuleEngine] Error evaluating condition "${condition}":`, err.message);
      return false;
    }
  }

  /**
   * Tokenize a condition string into tokens
   */
  tokenize(expr) {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
      // Skip whitespace
      if (/\s/.test(expr[i])) { i++; continue; }

      // String literal
      if (expr[i] === '"' || expr[i] === "'") {
        const quote = expr[i++];
        let str = '';
        while (i < expr.length && expr[i] !== quote) str += expr[i++];
        i++; // closing quote
        tokens.push({ type: 'STRING', value: str });
        continue;
      }

      // Number
      if (/[0-9]/.test(expr[i]) || (expr[i] === '-' && /[0-9]/.test(expr[i+1]))) {
        let num = '';
        if (expr[i] === '-') num += expr[i++];
        while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
        tokens.push({ type: 'NUMBER', value: parseFloat(num) });
        continue;
      }

      // Boolean / null
      if (expr.substring(i, i+4) === 'true')  { tokens.push({ type: 'BOOL', value: true  }); i+=4; continue; }
      if (expr.substring(i, i+5) === 'false') { tokens.push({ type: 'BOOL', value: false }); i+=5; continue; }
      if (expr.substring(i, i+4) === 'null')  { tokens.push({ type: 'NULL', value: null  }); i+=4; continue; }

      // Operators (order: longest first to handle >=, <=, ==, !=)
      if (expr.substring(i, i+2) === '&&') { tokens.push({ type: 'AND' }); i+=2; continue; }
      if (expr.substring(i, i+2) === '||') { tokens.push({ type: 'OR'  }); i+=2; continue; }
      if (expr.substring(i, i+2) === '==') { tokens.push({ type: 'EQ'  }); i+=2; continue; }
      if (expr.substring(i, i+2) === '!=') { tokens.push({ type: 'NEQ' }); i+=2; continue; }
      if (expr.substring(i, i+2) === '>=') { tokens.push({ type: 'GTE' }); i+=2; continue; }
      if (expr.substring(i, i+2) === '<=') { tokens.push({ type: 'LTE' }); i+=2; continue; }
      if (expr[i] === '>') { tokens.push({ type: 'GT' }); i++; continue; }
      if (expr[i] === '<') { tokens.push({ type: 'LT' }); i++; continue; }
      if (expr[i] === '!') { tokens.push({ type: 'NOT' }); i++; continue; }
      if (expr[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
      if (expr[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }

      // Identifier (variable name, supports dot-notation: user.role)
      if (/[a-zA-Z_$]/.test(expr[i])) {
        let id = '';
        while (i < expr.length && /[a-zA-Z0-9_.$]/.test(expr[i])) id += expr[i++];
        tokens.push({ type: 'IDENTIFIER', value: id });
        continue;
      }

      // Unknown character – skip
      i++;
    }
    return tokens;
  }

  /**
   * Validate a condition string (returns { valid, message })
   */
  validate(condition) {
    try {
      const tokens = this.tokenize(condition);
      if (tokens.length === 0) return { valid: false, message: 'Empty condition' };
      new Parser(tokens, {}).parse();
      return { valid: true, message: 'Valid condition' };
    } catch (err) {
      return { valid: false, message: err.message };
    }
  }

  /**
   * AI-style: convert plain English to a condition string
   * Very basic – maps common patterns to expressions
   */
  suggestCondition(text) {
    const t = text.toLowerCase().trim();
    const suggestions = [];

    // Map patterns
    const patterns = [
      [/(\w+)\s+is\s+greater\s+than\s+(\d+)/i,     '$1 > $2'],
      [/(\w+)\s+is\s+less\s+than\s+(\d+)/i,        '$1 < $2'],
      [/(\w+)\s+equals?\s+"?'?([^"']+)"?'?/i,      "$1 == '$2'"],
      [/(\w+)\s+is\s+not\s+"?'?([^"']+)"?'?/i,     "$1 != '$2'"],
      [/(\w+)\s+>=?\s*(\d+)/i,                      '$1 >= $2'],
      [/(\w+)\s+<=?\s*(\d+)/i,                      '$1 <= $2'],
      [/(\w+)\s+is\s+true/i,                        '$1 == true'],
      [/(\w+)\s+is\s+false/i,                       '$1 == false'],
      [/(\w+)\s+is\s+(high|medium|low|urgent)/i,    "$1 == '$2'"],
      [/amount\s+over\s+(\d+)/i,                    'amount > $1'],
      [/priority\s+is\s+(high|medium|low)/i,        "priority == '$1'"],
      [/status\s+is\s+(approved|rejected|pending)/i,"status == '$1'"],
    ];

    for (const [regex, template] of patterns) {
      const m = t.match(regex);
      if (m) {
        let cond = template;
        for (let k = 1; k < m.length; k++) {
          cond = cond.replace(`$${k}`, m[k].trim());
        }
        suggestions.push(cond);
      }
    }

    if (suggestions.length === 0 && t) {
      suggestions.push(`// Could not parse: "${text}"`);
    }

    return suggestions;
  }
}

/**
 * Recursive descent parser for boolean expressions
 */
class Parser {
  constructor(tokens, data) {
    this.tokens = tokens;
    this.pos    = 0;
    this.data   = data;
  }

  peek()    { return this.tokens[this.pos]; }
  consume() { return this.tokens[this.pos++]; }

  parse() { return this.parseOr(); }

  parseOr() {
    let left = this.parseAnd();
    while (this.peek() && this.peek().type === 'OR') {
      this.consume();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.peek() && this.peek().type === 'AND') {
      this.consume();
      const right = this.parseNot();
      left = left && right;
    }
    return left;
  }

  parseNot() {
    if (this.peek() && this.peek().type === 'NOT') {
      this.consume();
      return !this.parseComparison();
    }
    return this.parseComparison();
  }

  parseComparison() {
    const left = this.parseValue();
    const op   = this.peek();
    if (!op || !['EQ','NEQ','GT','LT','GTE','LTE'].includes(op.type)) return !!left;
    this.consume();
    const right = this.parseValue();

    switch (op.type) {
      case 'EQ':  return left == right;  // loose equality for type coercion
      case 'NEQ': return left != right;
      case 'GT':  return left >  right;
      case 'LT':  return left <  right;
      case 'GTE': return left >= right;
      case 'LTE': return left <= right;
    }
    return false;
  }

  parseValue() {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'LPAREN') {
      this.consume();
      const val = this.parseOr();
      const close = this.peek();
      if (!close || close.type !== 'RPAREN') throw new Error('Missing closing parenthesis');
      this.consume();
      return val;
    }

    this.consume();

    if (t.type === 'STRING')  return t.value;
    if (t.type === 'NUMBER')  return t.value;
    if (t.type === 'BOOL')    return t.value;
    if (t.type === 'NULL')    return null;

    if (t.type === 'IDENTIFIER') {
      // Support dot-notation: user.role
      const parts = t.value.split('.');
      let val = this.data;
      for (const part of parts) {
        if (val === undefined || val === null) return undefined;
        val = val[part];
      }
      return val;
    }

    throw new Error(`Unexpected token: ${t.type}`);
  }
}

module.exports = new RuleEngine();
