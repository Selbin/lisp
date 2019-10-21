const globalEnv = {
  '+': (op1, op2) => Number(op1) + Number(op2),
  '=': (op1, op2) => Number(op1) === Number(op2),
  '-': (op1, op2) => Number(op1) - Number(op2),
  '*': (op1, op2) => Number(op1) * Number(op2),
  '/': (op1, op2) => Number(op1) / Number(op2),
  '<': (op1, op2) => Number(op1) < Number(op2),
  '>': (op1, op2) => Number(op1) > Number(op2),
  '<=': (op1, op2) => Number(op1) <= Number(op2),
  '>=': (op1, op2) => Number(op1) >= Number(op2),
  pi: Math.PI,
  func: {},
}
let count = 0
let copyEnv = {}
const contentParse = input => {
  let result
  input = spaceParser(input)
  if ((result = numberParser(input))) return [result[0], result[1]]
  if ((result = symbolParser(input))) return [result[0], result[1]]
  if (input[0] === '(') {
    result = '('
    let count = 1
    input = input.slice(1)
    while (count >= 0) {
      if (input[0] === '(') count++
      if (input[0] === ')') count--
      if (count === 0) {
        result = result + ')'
        input = input.slice(1)
        input = spaceParser(input)
        return [result, input]
      }
      result = result + input[0]
      input = input.slice(1)
    }
  }

  return null
}

const numberParser = input => {
  const result = input.match(/^-?([1-9][0-9]*(\.[0-9]+)?((e|E)[-+]?[0-9]+)?|0(\.[0-9]+)?((e|E)[-+]?[0-9]+)?)/)
  return result === null || result[0] === ''? null : [result[0] * 1, input.slice(result[0].length)]
}

const spaceParser = input => {
  const result = input.match(/^(\t|\n|\r| )+/)
  return result === null ? input : input.slice(result[0].length)
}

const symbolParser = input => {
  result = input.match(/^(([a-zA-Z_]+)|(\+|-|>=|<=|>|<|=|\*|\/))/)
  if (!result) return null
  return [result[0], input.slice(result[0].length)]
}

const eval = (expr, env = globalEnv) => {
  let result = sExpressionParser(expr, env)
  return !result || result[1] !== '' ? 'Invalid' : result[0]
}

const sExpressionParser = (expr, env = globalEnv) => {
  expr = expr.trim()
  let result = specialFormParser(expr, env) || expressionParser(expr, env)
  if (result) return result
  return null
}

const specialFormParser = (expr, env = globalEnv) => {
  if (expr.startsWith('(')) {
    expr = spaceParser(expr.slice(1))
    return (ifParser(expr, env) || defineParser(expr) || beginParser(expr, env) || quoteParser(expr) || lambdaParser(expr))
  }
}

const expressionParser = (expr, env = globalEnv) => {
  if (expr.startsWith('(')) {
    expr = spaceParser(expr.slice(1))
    return procedurecall(expr, env)
  }
  let atom = atomParse(expr, env)
  if (!atom) return null
  return [atom[0], atom[1]]
}

const atomParse = (expr, env = globalEnv) => {
  expr = expr.trim()
  let atom = numberParser(expr) || [ env[symbolParser(expr)[0]], spaceParser(symbolParser(expr)[1])]
  if (atom[0] === null || atom[0] === undefined)
    return [ globalEnv[symbolParser(expr)[0]], spaceParser(symbolParser(expr)[1])]
  return atom
}

const procedurecall = (expr, env = globalEnv) => {
  let operands = []
  let op = symbolParser(spaceParser(expr))
  if (op === null) return null
  expr = op[1]
  op = op[0]
  if (op in globalEnv) {
    while (expr[0] !== ')') {
      expr = spaceParser(expr)
      const value = sExpressionParser(expr, env) || numberParser(expr) || atomParse(expr, env)
      if (value !== null) {
        expr = value[1]
        expr = spaceParser(expr)
        operands.push(value[0])
        continue
      }
      return null
    }
    if (operands.length === 1 && op === '/') operands.unshift(1)
    if (operands.length === 1 && op === '-') operands.unshift(0)
    result = operands.reduce(globalEnv[op])
    return [result, spaceParser(expr).slice(1)]
  }
  if (op in globalEnv.func) {
    let i = 0
    let copyEnv = JSON.parse(JSON.stringify(globalEnv.func[op]))
    while (expr[0] !== ')' && expr.length > 1) {
      expr = spaceParser(expr)
      let arg = sExpressionParser(expr, env)
      if (!arg) return null
      let param = globalEnv.func[op]['args'][i]
      copyEnv[param] = arg[0]
      expr = arg[1]
      expr = spaceParser(expr)
      i++
    }
    if (expr[0] !== ')') return null
    let result = sExpressionParser(globalEnv.func[op]['body'], copyEnv)
    if (!result) return null
    return [result[0], spaceParser(expr.slice(1))]
  }
  return null
}

const ifParser = (expr, env = globalEnv) => {
  if (!expr.startsWith('if')) return null
  let condition, result
  expr = spaceParser(expr.slice(2))
  result = procedurecall(spaceParser(expr).slice(1), env)
  if (!result) return null
  condition = result[0]
  expr = spaceParser(result[1])
  if (condition) {
    result = sExpressionParser(expr, env)
    if (!result) return null
    expr = contentParse(result[1])[1]
    if (!expr) return null
    expr = spaceParser(expr)
    if (expr[0] !== ')') return null
    return [result[0], expr.slice(1)]
  }
  expr = contentParse(result[1])[1]
  result = sExpressionParser(expr, env)
  if (!result) return null
  expr = spaceParser(result[1])
  if (expr[0] !== ')') return null
  return [result[0], expr.slice(1)]
}

const defineParser = expr => {
  if (!expr.startsWith('define')) return null
  expr = spaceParser(expr.slice(6))
  let symbol = symbolParser(expr)
  if (!symbol) return null
  expr = symbol[1]
  symbol = symbol[0]
  let value = sExpressionParser(expr)
  if (!value) return null
  expr = spaceParser(value[1])
  if (expr[0] !== ')') return null
  if (typeof value[0] === 'object') {
    globalEnv.func[symbol] = { args: value[0][0], body: value[0][1], parent: null}
    return ['done', expr.slice(1)]
  }
  globalEnv[symbol] = value[0]
  return [symbol, expr.slice(1)]
}

const beginParser = (expr, env = globalEnv) => {
  let result
  if (!expr.startsWith('begin')) return null
  expr = spaceParser(expr.slice(5))
  while (!expr.startsWith(')')) {
    result = sExpressionParser(expr, env)
    expr = spaceParser(result[1])
  }
  return expr !== ')' ? null : [result[0], expr.slice(1)]
}

const quoteParser = expr => {
  if (!expr.startsWith('quote')) return null
  expr = spaceParser(expr.slice(5))
  let result = contentParse(expr)
  if (!result) return null
  if (spaceParser(result[1]) !== ')') return null
  return [result[0], spaceParser(result[1]).slice(1)]
}

const lambdaParser = expr => {
  let args = []
  if (!expr.startsWith('lambda')) return null
  expr = spaceParser(spaceParser(expr.slice(6)))
  if (!expr[0] === '(') return null
  expr = spaceParser(expr.slice(1))
  while (!expr.startsWith(')')) {
    let arg = symbolParser(expr)
    if (!arg) return null
    args.push(arg[0])
    expr = spaceParser(arg[1])
  }
  if (expr[0] !== ')') return null
  expr = spaceParser(expr.slice(1))
  let body = contentParse(expr)
  if (!body) return null
  return [[args, body[0]], spaceParser(body[1]).slice(1)]
}

console.log(eval('(define circlearea (lambda (r) (* pi (* r r))))'))
console.log(eval('(define fact (lambda(x)(if(<= x 1) 1 (* x ( fact(- x 1 ) ) ))))'))
console.log(eval('(define sum (lambda(x y) (+ x y) ) )'))
console.log(eval('(define fib (lambda (n) (if (< n 2) 1 (+ (fib (- n 1)) (fib (- n 2))))))'))
console.log(eval('(define repeat (lambda (f) (lambda (x) (f (f x)))))'))
console.log(eval('(define twice (lambda (x) (* 2 x)))'))
console.log(eval('( fact 5 )'))
console.log(eval('( fib 5 )'))
console.log(eval('(sum (+(fact (- 6 1) ) (fact 5)) 5 )'))
console.log(eval('(+ 2 3 (* 5 2 (* 1 2 ) ) 4 5 )'))
console.log(eval('( if ( < 3 2 ) 3 (if (> 4 3 ) 33 44 ))'))
console.log(eval('(circlearea (fact (fact 3)) )'))
//console.log(globalEnv.func['sum']['args'])
// console.log(eval('(sum (+(fact (- 6 1) ) (fact 5)) 5 )'))
// console.log (eval('( begin ( + 2 3 ) (+ 4 5 )  (define e 4444 ) (+ 100 100))'))
// console.log(eval('(quote ( begin ( + 2 3 ) (+ 4 5 )  (define e 4444 ) (+ 100 100)) )'))
console.log(eval('(- 2 )'))
// console.log(eval('(circlearea (fact (fact 3)) )'))
//  console.log(globalEnv)
