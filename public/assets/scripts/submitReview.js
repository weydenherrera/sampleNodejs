var submitReview = (function() {

    //create a function where params is a json format obj
    //this would allow us to expand the parametes without passing A LOT of parameters
    /*
    e.g params
    {
        "userId" : 2344,
        "insuranceId" : 1,
        "productId" : 1,
        "extraData" : {
            "purchaseMethod" : "online",
            "purchaseDataRange" : 3,
            "fileClaimed" : 0 //0 if false. 1 if true
        },
        "title" : "This is my 1st ever review",
        "decription" : "This is awsome"
    }
    */
    function saveReview (params, callback/*(myReviewAnchor, err)*/){ 
        console.log("submit values of :" + params);

        //gather data needed for saving parent review element for CH
        var title = params.title;
        var userId = params.userId;
        var type = "review";
        var insuranceAnchor = "$insurance-" + params.insuranceId;
        var productAnchor = insuranceAnchor + "-product-" + params.productId;
        var myReviewAnchor = productAnchor + "-reviewer-" + params.userId + "-" + new Date().getTime(); // I have included get time because a user can have multiple review on the save insurance and product
        var shortDescription = params.extraData;
        var description  = params.description;

        var data = {
            id : myReviewAnchor,
            type: type,
            userId: userId,
            rootId: insuranceAnchor,
            parentId: productAnchor,
            title: title,
            description: description,
            deleted : 0,
            shortDescription : JSON.stringify(shortDescription)
        }

        //CH call to insert data by calling update method.
        //update method is a insert if not existing and update if existing
        CrowdHound.update(data, function(err) {
            alert('Finished update.')
            return callback(myReviewAnchor, err);
        });

    }

    //this method will save and link the rating to the created element and link the aggregation element to a insurance product
    function saveRating(myReviewAnchor, insuranceId, productId, ratingValue, callback/*(err)*/){
        //preperation of anchors and data
        var aggregationElementId = "$insurance-"+insuranceId+"-product-"+productId;
        var voteElementId = myReviewAnchor;
        var aspect = 'percentage';

        //pass values to CH for persistence
        CrowdHound.saveVote(aggregationElementId, voteElementId, aspect, ratingValue, function(err) {
        //console.log('saveVote returned', err);
        return callback(err);
    });

    }


    return {
        saveReview : saveReview,
        saveRating : saveRating
    };

})();