const globalEnv = {
    '+': (op1, op2) => Number(op1) + Number(op2),
    '=': (op1, op2) => Number(op1) === Number(op2),
    '-': (op1, op2) => Number(op1) - Number(op2),
    '*': (op1, op2) => Number(op1) * Number(op2),
    '/': (op1, op2) => Number(op1) / Number(op2),
    '<': (op1, op2) => Number(op1) < Number(op2),
    '>': (op1, op2) => Number(op1) > Number(op2),
    pi: Math.PI
  }

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

  const symbolParser = (input) => {
    result = input.match(/^(([a-zA-Z_]+)|(\+|-|>=|<=|>|<|=|\*|\\))/)
    if (!result) return null
    return [result[0], input.slice(result[0].length)]
  }

  const eval = (expr) => {
    let result = sExpressionParser(expr, globalEnv)
    //console.log(result)
    //console.log(result)
    return (!result || result[1] !== '' ? 'Invalid' : result[0])
  }

  const sExpressionParser = (expr, env = globalEnv) => {
      expr = expr.trim()
      let result = expressionParser(expr, env= globalEnv)
      if (result) return result
      return null
  }

  const expressionParser = (expr ,env = globalEnv) => {
    if (expr.startsWith('(')){
        expr = spaceParser( expr.slice(1))
        return procedurecall(expr,env) || ifParser(expr , env) 
    }
  }
   const atomParse = ( expr ,env = globalEnv)=> {
    expr = expr.trim()
    //console.log(expr)
    let atom = numberParser(expr)
    return atom
 }
  const procedurecall = (expr, env= globalEnv) => {
    let operands = []
    let op = symbolParser(expr)
    if (op === null ) return null
    expr = op[1]
    op = op[0]
    if ( op in env){
        while (expr[0] !== ')'){
            //console.log(expr)
            expr = spaceParser(expr)
            const value = numberParser(expr)
            if (value !== null) {
                expr = value[1]
                expr = spaceParser(expr)
                operands.push(value[0])
                continue
              }
            if (expr[0] =='('){
                const inside = sExpressionParser(expr, env)
                if (inside === null) return null
               // console.log(inside[0])
                operands.push(inside[0])
                expr = inside[1]
                expr = spaceParser(expr)
               // console.log("here" + expr)
                continue
            }  
            return null
        }
        // console.log(operands)
        if (operands.length === 1 && op === '/') operands.unshift(1)
        if (operands.length === 1 && op === '-') operands.unshift(0)
        // console.log(op)
        result = operands.reduce(env[op])
        return [result, expr.slice(1)]
    }
  }

  const ifParser = (expr, env = globalEnv) => {
    if (!expr.startsWith('if')) return null
    let condition; let result
    expr = spaceParser(expr.slice(2))
    result = sExpressionParser(expr, env)
    if (!result) return null
    condition = result[0]
    expr = spaceParser(result[1])
    if (condition) {
      result = sExpressionParser(expr, env) || atomParse(expr , env)
      if (!result) return null
      expr = contentParse(result[1])[1]
      if (!expr) return null
      expr = spaceParser(expr)
      if (expr[0] !== ')') return null
      return [result[0], expr.slice(1)]
    }
    expr = contentParse(result[1])[1]
    result = sExpressionParser(expr, env) || atomParse(expr , env)
    if (!result) return null
    expr = spaceParser(result[1])
    if (expr[0] !== ')') return null
    return [result[0], expr.slice(1)]
  }
  
  console.log(eval('( if ( < 3 2 ) 3 (if ( < 4 3 ) 33 44 ) )'))