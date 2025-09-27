class ExpressError extends Error{
    constructor(status,message){
        super();
        this.statusCode = status; // Corrected line
        this.message = message;
    }
}

module.exports=ExpressError;