const mongoose=require("mongoose");
const initData=require("./data1.js");
const Listing=require("../models/listing.js");

const MONGO_URL="mongodb://127.0.0.1:27017/wanderlust";

main().then(()=>{
    console.log("connected to DB");
}).catch((err)=>{
    console.log(err);
});

async function main(){
    await mongoose.connect(MONGO_URL);
}

const initDB=async ()=>{
    await Listing.deleteMany({});
    initData.data1=initData.data1.map((obj)=>({...obj, owner:"68d3ae1aaf78591896529eae"}));
    await Listing.insertMany(initData.data1);
    console.log("data was initialized");
};

initDB();