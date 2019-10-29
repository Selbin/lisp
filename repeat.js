function repeat (f){
    return function (x){
      return f(f(x)) 
    }
  }
  const x =10
  const result =repeat((x)=> 2 * x)
  console.log(result(10))