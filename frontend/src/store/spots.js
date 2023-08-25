// Action type
const SET_SPOTS = "spots/SET_SPOTS";
// Create spot form action type
const CREATE_SPOT = "spots/CREATE_SPOT";

// Action create to set the spot for home page
export const setSpots = (spots) => ({
  type: SET_SPOTS,
  spots,
});

// Action creator for creating spot
export const createSpotAction = (spot) => ({
  type: CREATE_SPOT,
  spot,
});

// Thunks
// Fetch spots for HOME PAGE
export const fetchSpots = () => async (dispatch) => {
  // get the response from the get all spots endpoint, which is at /api/spots
  const response = await fetch("/api/spots");
  const { Spots } = await response.json(); // destructure Spots from response
  dispatch(setSpots(Spots)); // pass Spots array to the action creator
};

// Create SPOT FORM THUNK (NEED TWO DIFFERENT FETCH REQUESTS b/c backend endpoint is at /spots and at /spots/:id/images)
export const createSpot = (spotDetails) => async (dispatch) => {
  // console.log("Sending spot details to server:", spotDetails);

  // Read CSRF token from cookie
  const csrfToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN"))
    .split("=")[1];

  // Create the spot
  const response = await fetch("/api/spots", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken, // Include CSRF token here
    },
    credentials: "include", // Include credentials to send cookies
    body: JSON.stringify({
      address: spotDetails.address,
      city: spotDetails.city,
      state: spotDetails.state,
      country: spotDetails.country,
      lat: spotDetails.lat,
      lng: spotDetails.lng,
      name: spotDetails.name,
      description: spotDetails.description,
      price: spotDetails.price,
    }),
  });
  const newSpot = await response.json();

  // console.log("Received new spot from server:", newSpot);

  // If the spot was created successfully, add the image
  // Basically if newSpot.id exists and there's a previewImage on the spot, then we
  // Make another post request to /spots/:id/images to add the image(s) to that spot

  if (newSpot.id && spotDetails.previewImage) {
    const imageResponse = await fetch(`/api/spots/${newSpot.id}/images`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken, // Include CSRF token here!
      },
      body: JSON.stringify({
        url: spotDetails.previewImage,
        preview: true,
      }),
    });
    const image = await imageResponse.json();
    newSpot.images = [image]; // Add the image to the newSpot object
  }
  dispatch(createSpotAction(newSpot));
  // Return a promise here
  // By structuring the code this way, you ensure that the Promise returned by the thunk resolves with the newSpot object, including the image if one was added. This allows the calling code to handle the result of both operations in a single .then() block, as shown in the previous snippet.
  // This pattern provides a clean way to handle complex asynchronous operations that involve multiple steps, ensuring that the calling code can respond to the complete result of the operation.
  return Promise.resolve(newSpot);
};

// Reducer
const initialState = { spots: [] };

export default function spotsReducer(state = initialState, action) {
  switch (action.type) {
    case SET_SPOTS:
      return { ...state, spots: action.spots };
    case CREATE_SPOT:
      return { ...state, spots: [...state.spots, action.spot] };
    default:
      return state;
  }
}
