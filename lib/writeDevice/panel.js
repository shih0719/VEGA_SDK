module.exports ={
    execute(FunctionKey,value){
        if (value === 0){
            value = false;
        } else{
            value = true;
        }
        return{
            "function":{
                [`${FunctionKey}`]:value
            },
            "cmd":"write",
            "source":"vega-SDK"
        }
    }
}