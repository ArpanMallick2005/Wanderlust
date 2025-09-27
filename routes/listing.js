const express=require("express");
const router=express.Router();
const Listing=require("../models/listing.js");
const wrapAsync=require("../utils/wrapAsync.js");
const ExpressError=require("../utils/ExpressError.js");
const {listingSchema}=require("../schema.js");
const {isLoggedIn, isOwner}=require("../middleware.js");
const multer=require("multer");
const {storage}=require("../cloudConfig.js");
const upload=multer({storage});
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken=process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

const validateListing=(req,res,next)=>{
    let {error}=listingSchema.validate(req.body);
    if(error){
        let errMsg=error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400,errMsg);
    }else{
        next();
    }
};

router.route("/")
.get(async(req,res)=>{
    const allListings=await Listing.find({});
    res.render("./listings/index.ejs",{allListings});
    })
.post(isLoggedIn,upload.single('listing[image]'),validateListing,wrapAsync(async(req,res,next)=>{
    try {
        let{title,description,image,price,country,loaction}=req.body;
        let result=listingSchema.validate(req.body);
        console.log(result);
        
        // Check if file was uploaded successfully
        if (!req.file) {
            throw new Error("Image upload failed. Network connection to Cloudinary may be unavailable.");
        }

        let response=await geocodingClient.forwardGeocode({
            query:req.body.listing.location,
            limit:1,
        })
        .send();
        
        let url=req.file.path;
        let filename=req.file.filename;
        const newListing=new Listing(req.body.listing);
        newListing.owner=req.user._id;
        newListing.image={url,filename};

        newListing.geometry=response.body.features[0].geometry;

        let savedListing=await newListing.save();
        console.log(savedListing);
        req.flash("success","New Listing Created!");
        res.redirect("/listings");
    } catch (err) {
        console.error("Error during listing creation:", err);
        req.flash("error", "Failed to create listing: " + (err.message || "Network error with Cloudinary. Please try again later."));
        res.redirect("/listings/new");
    }
}));

//New Route
router.get("/new",isLoggedIn, async(req,res)=>{
    res.render("./listings/new.ejs");
});


router.route("/:id")
.get(wrapAsync(async(req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id)
    .populate({
        path:"reviews",
        populate:{
            path:"author"
        },
}).populate("owner");
    if(!listing){
        req.flash("error","Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    console.log(listing);
    res.render("./listings/show.ejs",{listing});
}))
.put(isLoggedIn,isOwner,upload.single('listing[image]'),validateListing,wrapAsync(async(req,res)=>{
    let {id}=req.params;
    let listing=await Listing.findByIdAndUpdate(id,{...req.body.listing});

    if(typeof req.file !=="undefined"){
    let url=req.file.path;
    let filename=req.file.filename;
    listing.image={url,filename};
    await listing.save();
    }
    req.flash("success","Listing Updated!");
    res.redirect(`/listings/${id}`);
}))

.delete(isLoggedIn,isOwner,async(req,res)=>{
    let {id}=req.params;
    let deletedListing=await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success","Listing Deleted!");
    res.redirect("/listings");
});


//Index Route
// router.get("/",async(req,res)=>{
//     const allListings=await Listing.find({});
//     res.render("./listings/index.ejs",{allListings});
//     });

//Show Route
// router.get("/:id",wrapAsync(async(req,res)=>{
//     let {id}=req.params;
//     const listing=await Listing.findById(id)
//     .populate({
//         path:"reviews",
//         populate:{
//             path:"author"
//         },
// }).populate("owner");
//     if(!listing){
//         req.flash("error","Listing you requested for does not exist!");
//         res.redirect("/listings");
//     }
//     console.log(listing);
//     res.render("./listings/show.ejs",{listing});
// }));

//Create Route
// router.post("/",isLoggedIn,validateListing,wrapAsync(async(req,res,next)=>{
//     let{title,description,image,price,country,loaction}=req.body;
//     let result=listingSchema.validate(req.body);
//     console.log(result);
//     const newListing=new Listing(req.body.listing);
//     newListing.owner=req.user._id;
//     await newListing.save();
//     req.flash("success","New Listing Created!");
//     res.redirect("/listings");
// }));

//Edit Route
router.get("/:id/edit",isLoggedIn,isOwner,async(req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id);
    if(!listing){
        req.flash("error","Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    let originalImageUrl=listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload","/upload/h_300,w_250");
    res.render("./listings/edit.ejs",{listing, originalImageUrl});
});

//Update Route
// router.put("/:id",isLoggedIn,isOwner,validateListing,wrapAsync(async(req,res)=>{
//     let {id}=req.params;
//     await Listing.findByIdAndUpdate(id,{...req.body.listing});
//     req.flash("success","Listing Updated!");
//     res.redirect(`/listings/${id}`);
// }));

//Delete Route
// router.delete("/:id",isLoggedIn,isOwner,async(req,res)=>{
//     let {id}=req.params;
//     let deletedListing=await Listing.findByIdAndDelete(id);
//     console.log(deletedListing);
//     req.flash("success","Listing Deleted!");
//     res.redirect("/listings");
// });

module.exports=router;