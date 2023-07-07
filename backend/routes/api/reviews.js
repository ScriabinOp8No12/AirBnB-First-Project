const express = require("express");
const { requireAuth } = require("../../utils/auth");
const {
  Spot,
  SpotImage,
  Review,
  ReviewImage,
  User,
  Booking,
} = require("../../db/models");
const { Sequelize } = require("sequelize");

const router = express.Router();

// Create and return a new image for a review specified by id
router.post("/:reviewId/images", requireAuth, async (req, res) => {
  const { reviewId } = req.params;
  const { url } = req.body;
  const review = await Review.findByPk(reviewId);
  if (!review) {
    return res.status(404).json({ message: "Review couldn't be found" });
  }
  // this else if might not be right either, changed from reviewId to review.userId
  else if (req.user.id !== review.userId) {
    return res.status(403).json({ message: "Not Authorized!" });
  }
  // this is the block that's tricky -> I need to count the number of "urls" that
  // are tied to the current review, somehow got it first try by following this aa open page:
  // https://open.appacademy.io/learn/js-py---pt-jan-2023-online/week-22---express-and-sequelize-pt--ii/aggregate-data
  const countReviews = await ReviewImage.count({
    where: { reviewId },
  });
  if (countReviews >= 10) {
    return res.status(403).json({
      message: "Maximum number of images for this resource was reached",
    });
  }
  const reviewImage = await ReviewImage.create({
    // reviewId can't be null
    reviewId,
    url,
  });
  // we only want to return the id and url, not the created/updated at and the reviewId
  res.json({ id: reviewImage.id, url: reviewImage.url });
});

// Get all Reviews of the Current User
router.get("/current", requireAuth, async (req, res) => {
  // eventually I'll remember to include the await keyword, just a few more times and I'll get it!
  const reviews = await Review.findAll({
    // match logged in user with reviewId?  I think it needs to be userId instead...
    where: { userId: req.user.id },
    include: [
      { model: User, attributes: ["id", "firstName", "lastName"] },
      {
        model: Spot,
        attributes: [
          "id",
          "ownerId",
          "address",
          "city",
          "state",
          "country",
          "lat",
          "lng",
          "name",
          "price",
        ],
        include: [{ model: SpotImage, attributes: ["url"], limit: 1 }],
      },
      { model: ReviewImage, attributes: ["id", "url"] },
    ],
  });

  //use .map to create an array of formatted reviews
  const formattedReviews = reviews.map((review) => {
    // convert the review object into POJO so it can be modified
    const formattedReview = review.toJSON();
    // if there are elements within the SpotImages has anything in it
    if (formattedReview.Spot.SpotImages.length > 0) {
      // if it has something in it, then set the previewImage property to be equal to the first item (url) in the SpotImages array!
      formattedReview.Spot.previewImage =
        formattedReview.Spot.SpotImages[0].url;
    }
    // we don't want the SpotImages field in the Spot object
    delete formattedReview.Spot.SpotImages;
    return formattedReview;
  });
  res.json({ Reviews: formattedReviews });
});

module.exports = router;
