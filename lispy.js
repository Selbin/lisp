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
  pi: Math.PI
  
}
let copyEnv = {}

const findFunc = (op ,env = globalEnv) => {
 try{
   do{
   try {
    if( env[op] !== undefined) return env
    env = env.parent
   } catch (error) {
    env= env.parent
   }
  
  
  } while (env.parent !== null || env.parent !== undefined )
 return null 
 }
 catch(e){
   return null
 }
}
const findVal = (op ,env = globalEnv) => {
  op = symbolParser(op)
  try{
    do{
    try {
     if( env[op[0]] !== undefined )return [env[op[0]] ,op[1]]
             env = env.parent
    } catch (error) {
     env= env.parent
    }
   
   
   } while (env.parent !== null || env.parent !== undefined )
  return null 
  }
  catch(e){
    return null
  }
 }

const contentParse = input => {
  let result
  input = spaceParser(input)
  if (result = numberParser(input) ||  symbolParser(input) ) return [result[0], result[1]]
  if (input[0] === '(') {
    result = '('
    let count = 1
    input = input.slice(1)
    while (count >= 0 && input.length > 1){
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
    return (ifParser(expr, env) || defineParser(expr, env) || beginParser(expr, env) || quoteParser(expr) || lambdaParser(expr, env)) || lambdaEval(expr, env)
  }
  return null
}

const expressionParser = (expr, env = globalEnv) => {
  if (expr.startsWith('(')) {
    expr = spaceParser(expr.slice(1))
    return procedurecall(expr, env)
  }
  if(!expr.length >= 1 ) return null
  let atom = atomParse(expr, env) || symbolParser(expr,env)
  if (!atom) return null
  return [atom[0], atom[1]]
}

const atomParse = (expr, env = globalEnv) => {
  let atom
  try{
  expr = expr.trim()
  atom = numberParser(expr) || findVal(expr,env) 
  return atom 
  }catch(e){ 
    return null
  }
}

const procedurecall = (expr, env = globalEnv) => {
  let operands = []
  let op = symbolParser(spaceParser(expr))
  if (op === null) return null
  expr = op[1]
  op = op[0]
  if (op in globalEnv && typeof globalEnv[op] !== 'object') {
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
  let func = findFunc(op, env)
  if (func) {
    let i = 0
    copyEnv = JSON.parse(JSON.stringify(func[op]))
    while (expr[0] !== ')' && expr.length > 1) {
      expr = spaceParser(expr)
      let arg = sExpressionParser(expr, env)
      if (!arg) return null
      let param = func[op]['args'][i]
      copyEnv[param] = arg[0]
      copyEnv['parent'] = JSON.parse(JSON.stringify(env))
      expr = arg[1]
      expr = spaceParser(expr)
      i++
    }
    if (expr[0] !== ')') return null
    let result = sExpressionParser(func[op]['body'], copyEnv)
    if (!result) return null
    return [result[0], spaceParser(expr.slice(1)),copyEnv]
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

const defineParser = (expr, env) => {
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
    env[symbol] = value[0]
    return [symbol, expr.slice(1)]
  }
  env[symbol] = value[0]
  return [symbol, expr.slice(1)]
}

const beginParser = (expr, env = globalEnv) => {
  let result
  if (!expr.startsWith('begin')) return null
  expr = spaceParser(expr.slice(5))
  while (!expr.startsWith(')') && expr.length>1) {
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

const lambdaParser = (expr, env = null)  => {
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
  env =JSON.parse(JSON.stringify(env))
  return [ { 'args' : args, 'body':body[0], 'parent' : env }, spaceParser(body[1]).slice(1)]
}

const lambdaEval = (expr , env = globalEnv) => {
  if (!expr.startsWith('(')) return null
  let funcObj = sExpressionParser(expr,env)
  expr = funcObj[1]
  funcObj =funcObj[0]
  let i= 0
  while (expr[0] !== ')' && expr.length > 1) {
    expr = spaceParser(expr)
    let arg = sExpressionParser(expr, env)
    if (!arg) return null
    let param = funcObj['args'][i]
    funcObj[param] = arg[0]
    expr = arg[1]
    expr = spaceParser(expr)
    i++
  }
  if(expr[0] !== ')') return null
  let rslt = sExpressionParser(funcObj['body'], funcObj)
  rslt[0].m = 20
  console.log(rslt[0].body)
  console.log(sExpressionParser(rslt[0].body,rslt[0]))

}


//  console.log(eval('(define circlearea (lambda (r) (* pi (* r r))))'))
// console.log(eval('(define fact (lambda(x)(if(<= x 1) 1 (* x ( fact(- x 1 ) ) ))))'))
// console.log(eval('(define sum (lambda(x y) (+ x y) ) )'))
//  console.log(eval('(define fib (lambda (n) (if (< n 2) 1 (+ (fib (- n 1)) (fib (- n 2))))))'))
//  console.log(eval('( fib 5 )'))
// console.log(eval('(sum (+(fact (- 6 1) ) (fact 5)) 5 )'))
// console.log(eval('(+ 2 3 (* 5 2 (* 1 2 ) ) 4 5 )'))
// console.log(eval('( if ( < 3 2 ) 3 (if (> 4 3 ) 33 44 ))'))
// console.log(eval('(circlearea (fact (fact 3)) )'))
// console.log (eval('( begin ( + 2 3 ) (+ 4 5 )  (define e 4444 ) (+ 100 100))'))
// console.log(eval('(quote ( begin ( + 2 3 ) (+ 4 5 )  (define e 4444 ) (+ 100 100)) )'))
// console.log(eval('(- 2 )'))
// console.log(eval('(circlearea (fact (fact 3)) )'))
// console.log(eval('(define repeat (lambda (f) (lambda (x) (f (f x)))))'))
// console.log(eval('(define twice (lambda (x) (* 2 x)))'))
// console.log(eval('((repeat twice)10)'))
 console.log(eval('( define k (lambda(e) ( lambda(y) (lambda(m)(+ m y e) ) ) ))'))
console.log(eval('((k 2) 10)'))
