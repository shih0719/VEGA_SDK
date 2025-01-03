module.exports ={
    execute(channel,data){
        return{
            "function":{
                [`switch_ch${channel}`]:data
            },
            "cmd":"write",
            "source":"vega-SDK"
        }
    }
}