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
}
const funcEnv = {}

const contentParse = input => {
  let result
  input = spaceParser(input)
  if ((result = numberParser(input))) return [result[0], result[1]]
  else if ((result = symbolParser(input))) return [result[0], result[1]]
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
  return result === null || result[0] === '' ? null : [result[0] * 1, input.slice(result[0].length)]
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

const eval = (expr,env=globalEnv) => {
  let result = sExpressionParser(expr, env)
  return !result || result[1] !== '' ? 'Invalid' : result[0]
}

const sExpressionParser = (expr, env = globalEnv) => {
  expr = expr.trim()
  let result = specialFormParser(expr,env) || expressionParser(expr,env) 
  if (result) return result
  return null
}

const specialFormParser = (expr, env = globalEnv) => {
  if (expr.startsWith('(')) {
    expr = spaceParser(expr.slice(1))
    return ifParser(expr, env) || defineParser(expr) || beginParser(expr,env) || quoteParser(expr) || lambdaParser(expr)
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
  let atom = numberParser(expr) || [env[symbolParser(expr)[0]],spaceParser(symbolParser(expr)[1])]
  if (atom[0] === null || atom[0] === undefined){
    let atom = [globalEnv[symbolParser(expr)[0]] ,spaceParser(symbolParser(expr)[1])]
    return atom
  }
  return atom
}

const procedurecall = (expr, env = globalEnv) => {
  let operands = []
  let op = symbolParser(expr)
  if (op === null) return null
  expr = op[1]
  op = op[0]
  if (op in globalEnv) {
    while (expr[0] !== ')') {
      expr = spaceParser(expr)
      if (expr[0] == '(') {
        const inside = sExpressionParser(expr, env)
        if (inside === null) return null
        operands.push(inside[0])
        expr = inside[1]
        expr = spaceParser(expr)
        continue
      }
      const value = numberParser(expr) || atomParse(expr,env)
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
  if (op in funcEnv){
    let i = 0
    while (expr[0] !== ')') {
      expr = spaceParser(expr)
      let arg = sExpressionParser(expr,env)
      if(!arg) return null
      console.log(arg)
      let param = funcEnv[op]['args'][i]
      funcEnv[op][param] = arg[0]
      expr =arg[1]
      expr = spaceParser(expr)
      i++
  }

  if(expr[0] !== ')') return null
  let result = sExpressionParser(funcEnv[op]['body'],funcEnv[op])
  if(!result) return null
  //console.log(result)
  return [result[0],spaceParser(result[1].slice(1))]
}
return null
}

const ifParser = (expr, env = globalEnv) => {
  if (!expr.startsWith('if')) return null
  let condition
  let result
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
  if (typeof value[0] === 'object'){
    funcEnv[symbol] ={ args: value[0][0], body: value[0][1], parent : globalEnv}
    return ['done', expr.slice(1)]

  }
  globalEnv[symbol] = value[0]
  return [symbol, expr.slice(1)]
}

const beginParser = (expr, env = globalEnv) => {
  let result 
  if (!expr.startsWith('begin')) return null
  expr = spaceParser(expr.slice(5))
  while ( !expr.startsWith(')')){
    result = sExpressionParser(expr , env)
    expr = spaceParser(result[1])
  }
  return (expr !== ')') ? null : [ result[0], expr.slice(1) ]
}

const quoteParser = (expr) => {
  if (!expr.startsWith('quote')) return null
  expr = spaceParser(expr.slice(5))
  let result = contentParse(expr)
  if (!result) return null
  if (spaceParser(result[1]) !== ')') return null
  return [result[0] , spaceParser(result[1]).slice(1)]
}

const lambdaParser = (expr) => {
  let args = []
  if (!expr.startsWith('lambda')) return null
  expr = spaceParser(spaceParser(expr.slice(6)).slice(1))
  while ( !expr.startsWith(')') ){
    let arg = symbolParser(expr)
    if( !arg) return null
    args.push(arg[0])
    expr =spaceParser(arg[1])
  }
  if(expr[0] !== ")") return null
  expr= spaceParser(expr.slice(1))
  let body = contentParse(expr)
  if( !body) return null
  return [[args,body[0]],spaceParser(body[1]).slice(1)]
  
}
//console.log(eval('(define circlearea (lambda (r) (* pi (* r r))))')[0])
console.log(eval('(define fact (lambda(x)(if(<= x 1) 1 (* x ( fact(- x 1 ) ) ))))'))
// console.log(eval('(define sum (lambda(x y) (+ x y) ) )'))
// console.log(eval('(sum 2 3 )'))
// console.log (eval('( begin ( + 2 3 ) (+ 4 5 )  (define e 4444 ) (+ 100 100))'))
// console.log(eval('77'))
// console.log(eval('(quote ( begin ( + 2 3 ) (+ 4 5 )  (define e 4444 ) (+ 100 100)) )'))
// console.log(eval('(quote 2 )'))
 //console.log(eval('(circlearea (+ 6 2 ) )'))
console.log(eval('(fact  6 )'))